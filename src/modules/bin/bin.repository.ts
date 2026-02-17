import { Injectable } from '@nestjs/common';
import { dynamoDb } from '../../config/aws-dynamoDb.config';
import { Bin, BinStatus } from '../bin/bin.entity';
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BinRepository {
  private readonly tableName = 'Bins';

  async create(bin: Partial<Bin>): Promise<Bin> {
    const newBin: Bin = {
      bin_id: uuidv4(),
      location: bin.location,
      geo_fence: bin.geo_fence,
      capacity: bin.capacity,
      current_fill_level: 0,
      status: BinStatus.EMPTY,
      sensor_id: bin.sensor_id,
      last_collected_at: Date.now(),
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    console.log(newBin);
    
    await dynamoDb.send(new PutCommand({
      TableName: this.tableName,
      Item: newBin,
    }));

    return newBin;
  }

  async findAll(): Promise<Bin[]> {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: this.tableName,
    }));
    return result.Items as Bin[];
  }

  async findById(binId: string): Promise<Bin | null> {
    const result = await dynamoDb.send(new GetCommand({
      TableName: this.tableName,
      Key: { bin_id: binId },
    }));
    return result.Item as Bin;
  }

  async update(binId: string, binData: Partial<Bin>): Promise<Bin> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    Object.entries(binData).forEach(([key, value]) => {
      if (value !== undefined) {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        updateExpressions.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      }
    });

    updateExpressions.push('#updated_at = :updated_at');
    expressionAttributeNames['#updated_at'] = 'updated_at';
    expressionAttributeValues[':updated_at'] = new Date().toISOString();

    const updateExpression = 'SET ' + updateExpressions.join(', ');

    const result = await dynamoDb.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { bin_id: binId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as Bin;
  }

  async delete(binId: string): Promise<void> {
    await dynamoDb.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { bin_id: binId },
    }));
  }

  async addImagesToReport(binId: string, imageUrls: string[]): Promise<Bin> {
    const result = await dynamoDb.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { bin_id: binId },
      UpdateExpression: 'SET #images = list_append(if_not_exists(#images, :empty_list), :new_images)',
      ExpressionAttributeNames: {
        '#images': 'images'
            },
      ExpressionAttributeValues: {
        ':new_images': imageUrls,
        ':empty_list': [],
      },
      ReturnValues: 'ALL_NEW'
    }));

    return result.Attributes as Bin;
  }
}