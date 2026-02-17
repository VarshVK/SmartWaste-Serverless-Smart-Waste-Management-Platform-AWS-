import { Injectable } from '@nestjs/common';
import { dynamoDb} from '../../config/aws-dynamoDb.config';
import { IoTDevice, IoTDeviceStatus } from './iot-devive.entity';
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { SensorData } from './sensor-data.entity';
import { Bin } from '../bin/bin.entity';

@Injectable()
export class IoTDeviceRepository {
  private readonly tableName = 'IoTDevices';
  private readonly dataTableName = 'SensorData';


  async create(device: Partial<IoTDevice>): Promise<IoTDevice> {
    const newDevice: IoTDevice = {
      sensor_id: uuidv4(),
      bin_id: device.bin_id,
      device_type: device.device_type,
      battery_level: 100, 
      status: device.status || IoTDeviceStatus.ACTIVE,
      last_data_sent: new Date().toISOString(),
      last_maintenance: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),     
    };

    await dynamoDb.send(new PutCommand({
      TableName: this.tableName,
      Item: newDevice,
    }));

    return newDevice;
  }

  async addSensorData(sensorData: Partial<SensorData>): Promise<SensorData> {
    const newData: SensorData = {
      data_id: uuidv4(),
      sensor_id: sensorData.sensor_id,
      location: sensorData.location,
      fill_level: sensorData.fill_level,
      battery_level: sensorData.battery_level,
      timestamp: sensorData.timestamp || new Date().toISOString(),
    };

    await dynamoDb.send(new PutCommand({
      TableName: this.dataTableName,
      Item: newData,
    }));

    return newData;
  }

  async getDevicesByBinIds(bin_id: string): Promise<IoTDevice | null> {
    const params = {
      TableName: this.tableName,
      IndexName: 'bin_id-index', 
      KeyConditionExpression: 'bin_id = :bin_id',
      ExpressionAttributeValues: {
        ':bin_id': bin_id,
      },
    };

    try {
      const result = await dynamoDb.send(new QueryCommand(params));
      if (result.Items && result.Items.length > 0) {
        return result.Items[0] as IoTDevice;
      }
      return null;
    } catch (error) {
      console.error('Error querying email index:', error);
      throw new Error('Could not retrieve bin by id');
    }
}

  async getSensorData(sensorId: string): Promise<SensorData[]> {
    const result = await dynamoDb.send(new QueryCommand({
      TableName: this.dataTableName,
      IndexName: 'sensor_id-index', // Use the GSI
      KeyConditionExpression: 'sensor_id = :sensorId',
      ExpressionAttributeValues: {
        ':sensorId': sensorId,
      },
      ScanIndexForward: false, 
      Limit: 100, 
    }));
  
    return result.Items as SensorData[];
  }

  async findAll(): Promise<IoTDevice[]> {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: this.tableName,
    }));
    return result.Items as IoTDevice[];
  }

  async findById(sensorId: string): Promise<IoTDevice | null> {
    const result = await dynamoDb.send(new GetCommand({
      TableName: this.tableName,
      Key: { sensor_id: sensorId },
    }));
    return result.Item as IoTDevice;
  }



  async update(sensorId: string, deviceData: Partial<IoTDevice>): Promise<IoTDevice> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: { [key: string]: string } = {};
    const expressionAttributeValues: { [key: string]: any } = {};

    Object.entries(deviceData).forEach(([key, value]) => {
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
      Key: { sensor_id: sensorId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as IoTDevice;
  }

  async delete(sensorId: string): Promise<void> {
    await dynamoDb.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { sensor_id: sensorId },
    }));
  }
}