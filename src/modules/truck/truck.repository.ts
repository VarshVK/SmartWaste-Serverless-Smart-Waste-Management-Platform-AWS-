import { Injectable } from '@nestjs/common';
import { dynamoDb } from '../../config/aws-dynamoDb.config';
import { Truck, TruckStatus } from '../truck/truck.entity';
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TruckRepository {
  private readonly tableName = 'Trucks';

  async create(truck: Partial<Truck>): Promise<Truck> {
    const newTruck: Truck = {
      truck_id: uuidv4(),
      license_plate: truck.license_plate,
      make_model: truck.make_model,
      capacity: truck.capacity,
      status: truck.status || TruckStatus.AVAILABLE,
      current_location: truck.current_location,
      last_maintenance_date: truck.last_maintenance_date,
      next_maintenance_due: truck.next_maintenance_due,
      assigned_driver_id: truck.assigned_driver_id,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await dynamoDb.send(new PutCommand({
      TableName: this.tableName,
      Item: newTruck,
    }));

    return newTruck;
  }

  async findAll(): Promise<Truck[]> {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: this.tableName,
    }));
    return result.Items as Truck[];
  }

  async findById(truckId: string): Promise<Truck | null> {
    const result = await dynamoDb.send(new GetCommand({
      TableName: this.tableName,
      Key: { truck_id: truckId },
    }));
    return result.Item as Truck;
  }

  async getTruckByDriverId(driverId: string): Promise<Truck | null> {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'assigned_driver_id = :driverId',
      ExpressionAttributeValues: {
        ':driverId': driverId
      }
    }));
  
    if (result.Items && result.Items.length > 0) {
      return result.Items[0] as Truck;
    }
  
    return null;
  }

  async getAvailableTrucks(): Promise<Truck[]> {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': TruckStatus.AVAILABLE
      }
    }));
  
    return result.Items as Truck[];
  }

  async update(truckId: string, truckData: Partial<Truck>): Promise<Truck> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};
  
    Object.entries(truckData).forEach(([key, value]) => {
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
      Key: { truck_id: truckId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));
  
    return result.Attributes as Truck;
  }

  async delete(truckId: string): Promise<void> {
    await dynamoDb.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { truck_id: truckId },
    }));
  }
}