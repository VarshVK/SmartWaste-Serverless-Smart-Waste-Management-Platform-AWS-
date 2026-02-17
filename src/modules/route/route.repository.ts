import { Injectable } from '@nestjs/common';
import { dynamoDb } from '../../config/aws-dynamoDb.config';
import { Route, RouteStatus } from './route.entity';
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RouteRepository {
  private readonly tableName = 'Routes';

  async create(route: Partial<Route>): Promise<Route> {
    const newRoute: Route = {
      route_id: uuidv4(),
      truck_id: route.truck_id,
      driver_id: route.driver_id,
      cluster_id: route.cluster_id,
      route_start_time: route.route_start_time,
      stops: route.stops || [],
      status: RouteStatus.PENDING,
      total_distance: route.total_distance,
      fuel_consumption: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await dynamoDb.send(new PutCommand({
      TableName: this.tableName,
      Item: newRoute,
    }));

    return newRoute;
  }
  async findAll(): Promise<Route[]> {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: this.tableName,
    }));
    return result.Items as Route[];
  }

  async findByDriverId(driverId: string): Promise<Route[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'driver_id-index',
      KeyConditionExpression: 'driver_id = :driverId',
      ExpressionAttributeValues: {
        ':driverId': driverId,
      },
    });

    const result = await dynamoDb.send(command);
    return result.Items as Route[];
  }

  async findById(routeId: string): Promise<Route | null> {
    const result = await dynamoDb.send(new GetCommand({
      TableName: this.tableName,
      Key: { route_id: routeId },
    }));
    return result.Item as Route;
  }

  async update(routeId: string, routeData: Partial<Route>): Promise<Route> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    Object.entries(routeData).forEach(([key, value]) => {
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
      Key: { route_id: routeId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as Route;
  }

  async delete(routeId: string): Promise<void> {
    await dynamoDb.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { route_id: routeId },
    }));
  }
}