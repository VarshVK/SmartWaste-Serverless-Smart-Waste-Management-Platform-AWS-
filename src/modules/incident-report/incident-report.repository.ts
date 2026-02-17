import { Injectable } from '@nestjs/common';
import { dynamoDb } from '../../config/aws-dynamoDb.config';
import { IncidentReport, IncidentStatus } from './incident-report.entity';
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class IncidentReportRepository {
  private readonly tableName = 'IncidentReports';

  async create(incident: Partial<IncidentReport>): Promise<IncidentReport> {
    const newIncident: IncidentReport = {
      incident_id: uuidv4(),
      reported_by: incident.reported_by,
      bin_id: incident.bin_id,
      description: incident.description,
      status: incident.status || IncidentStatus.OPEN,
      reported_at: new Date().toISOString(),
      images: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await dynamoDb.send(new PutCommand({
      TableName: this.tableName,
      Item: newIncident,
    }));

    return newIncident;
  }

  async findAll(): Promise<IncidentReport[]> {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: this.tableName,
    }));
    return result.Items as IncidentReport[];
  }

  async findById(incidentId: string): Promise<IncidentReport | null> {
    const result = await dynamoDb.send(new GetCommand({
      TableName: this.tableName,
      Key: { incident_id: incidentId },
    }));
    return result.Item as IncidentReport;
  }

  async update(incidentId: string, incidentData: Partial<IncidentReport>): Promise<IncidentReport> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    Object.entries(incidentData).forEach(([key, value]) => {
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
      Key: { incident_id: incidentId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as IncidentReport;
  }

  async delete(incidentId: string): Promise<void> {
    await dynamoDb.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { incident_id: incidentId },
    }));
  }

  async addImagesToReport(incidentId: string, imageUrls: string[]): Promise<IncidentReport> {
    const result = await dynamoDb.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { incident_id: incidentId },
      UpdateExpression: 'SET #images = list_append(if_not_exists(#images, :empty_list), :new_images), #updated_at = :updated_at',
      ExpressionAttributeNames: {
        '#images': 'images',
        '#updated_at': 'updated_at'
      },
      ExpressionAttributeValues: {
        ':new_images': imageUrls,
        ':empty_list': [],
        ':updated_at': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));

    return result.Attributes as IncidentReport;
  }
}