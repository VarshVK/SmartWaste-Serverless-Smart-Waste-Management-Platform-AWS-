import { Injectable } from '@nestjs/common';
import { dynamoDb } from '../../config/aws-dynamoDb.config';
import { Cluster, ClusterStatus } from '../cluster/cluster.entity';
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ClusterRepository {
  private readonly tableName = 'Clusters';

  async create(cluster: Partial<Cluster>): Promise<Cluster> {
    const newCluster: Cluster = {
      cluster_id: uuidv4(),
      assigned_truck_id: cluster.assigned_truck_id,
      assigned_driver_id: cluster.assigned_driver_id,
      bins: cluster.bins || [],
      status: ClusterStatus.NOT_COLLECTED,
      collection_time: cluster.collection_time,
      created_at: Date.now(),
      updated_at: new Date().toISOString(),
    };

    await dynamoDb.send(new PutCommand({
      TableName: this.tableName,
      Item: newCluster,
    }));

    return newCluster;
  }

  async findAll(): Promise<Cluster[]> {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: this.tableName,
    }));
    return result.Items as Cluster[];
  }

  async findById(clusterId: string): Promise<Cluster | null> {
    const result = await dynamoDb.send(new GetCommand({
      TableName: this.tableName,
      Key: { cluster_id: clusterId },
    }));
    return result.Item as Cluster;
  }

  async update(clusterId: string, clusterData: Partial<Cluster>): Promise<Cluster> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    Object.entries(clusterData).forEach(([key, value]) => {
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
      Key: { cluster_id: clusterId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as Cluster;
  }

  async delete(clusterId: string): Promise<void> {
    await dynamoDb.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { cluster_id: clusterId },
    }));
  }

  async deleteAllClusters(): Promise<void> {
    const scanResult = await dynamoDb.send(new ScanCommand({
      TableName: this.tableName,
    }));

    const deletePromises = scanResult.Items?.map(item => {
      return dynamoDb.send(new DeleteCommand({
        TableName: this.tableName,
        Key: {
          cluster_id: item.cluster_id, 
        },
      }));
    });
    if (deletePromises) {
      await Promise.all(deletePromises);
    }
  }

  async findOpenClusters(): Promise<Cluster[]> {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': ClusterStatus.NOT_COLLECTED,
      },
    }));
    return result.Items as Cluster[];
  }

  async findByStatus(status: ClusterStatus): Promise<Cluster[]> {
    const params = {
      TableName: this.tableName,
      IndexName: 'status-index', 
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
      },
    };

    try {
      const result = await dynamoDb.send(new QueryCommand(params));
      return result.Items as Cluster[];
    } catch (error) {
      console.error('Error querying clusters by status:', error);
      throw error;
    }
  }

  
}