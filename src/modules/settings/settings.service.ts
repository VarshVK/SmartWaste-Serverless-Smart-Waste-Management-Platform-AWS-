import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Settings } from './setting.entity';
import { dynamoDb } from '../../config/aws-dynamoDb.config';


@Injectable()
export class SettingsService {
    private readonly tableName = 'Settings';
    private readonly defaultResetTime = '00:00';

    async getResetTime(): Promise<string> {
        try {
            const command = new GetCommand({
                TableName: this.tableName,
                Key: { id: 'resetTime' },
            });

            const result = await dynamoDb.send(command);
            if (!result.Item || !result.Item.resetTime) {
                await this.setResetTime(this.defaultResetTime);
                return this.defaultResetTime;
            }
            if (typeof result.Item.resetTime !== 'string' || !this.isValidTimeFormat(result.Item.resetTime)) {
                await this.setResetTime(this.defaultResetTime);
                return this.defaultResetTime;
            }
            return result.Item.resetTime;
        } catch (error) {
            return this.defaultResetTime;
        }
    }

    async setResetTime(time: string): Promise<void> {
        if (!time || typeof time !== 'string') {
            throw new BadRequestException('Invalid input. Time must be a string.');
        }

        if (!this.isValidTimeFormat(time)) {
            throw new BadRequestException('Invalid time format. Please use HH:mm format (e.g., "14:30").');
        }

        try {
            const command = new PutCommand({
                TableName: this.tableName,
                Item: { id: 'resetTime', resetTime: time },
            });

            await dynamoDb.send(command);
        } catch (error) {
            throw new BadRequestException('Failed to set reset time. Please try again.');
        }
    }

    private isValidTimeFormat(time: string): boolean {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        return timeRegex.test(time);
    }
}
