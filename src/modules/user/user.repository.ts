import { Injectable } from "@nestjs/common";
import { User } from "./user.entity";
import { dynamoDb } from "../../config/aws-dynamoDb.config";
import { DeleteCommand, GetCommand, PutCommand,
         QueryCommand, ScanCommand, UpdateCommand 
        } from "@aws-sdk/lib-dynamodb";

@Injectable()
export class UserRepository{
    private readonly tableName='Users'

    async create(user:User):Promise<User>{
        await dynamoDb.send(new PutCommand({
            TableName: this.tableName,
            Item: user,
        }))
        return user
    }

    async findByEmail(email: string): Promise<User | null> {
        const params = {
          TableName: this.tableName,
          IndexName: 'email-index', 
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: {
            ':email': email,
          },
        };
    
        try {
          const result = await dynamoDb.send(new QueryCommand(params));
          if (result.Items && result.Items.length > 0) {
            return result.Items[0] as User;
          }
          return null;
        } catch (error) {
          console.error('Error querying email index:', error);
          throw new Error('Could not retrieve user by email');
        }
    }

    async update(user: User): Promise<User> {
      await dynamoDb.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { user_id: user.user_id },
        UpdateExpression: 'set last_login = :ll, username = :u, email = :e, phone_number = :p, #r = :r, #s = :s, updated_at = :ua',
        ExpressionAttributeValues: {
          ':u': user.username,
          ':e': user.email,
          ':p': user.phone_number,
          ':r': user.role,
          ':s': user.status,
          ':ua': Date.now(),
          ':ll': user.last_login,
        },
        ExpressionAttributeNames: {
          '#r': 'role', 
          '#s': 'status'
        },
      }));
      return user;
    }

    async findById(userId: string): Promise<User | null> {
      const result = await dynamoDb.send(new GetCommand({
        TableName: this.tableName,
        Key: { user_id: userId },
      }));
      return result.Item as User;
    }

    async delete(userId: string): Promise<void> {
      await dynamoDb.send(new DeleteCommand({
        TableName: this.tableName,
        Key: { user_id: userId },
      }));
    }

    async findAll(): Promise<User[]> {
      const result = await dynamoDb.send(new ScanCommand({
        TableName: this.tableName,
      }));
      return result.Items as User[];
    }

    async updatePasswordHash(userId: string, newPasswordHash: string): Promise<void> {
      const params = {
        TableName: this.tableName,
        Key: { user_id: userId },
        UpdateExpression: 'SET password_hash = :newHash, updated_at = :updatedAt',
        ExpressionAttributeValues: {
          ':newHash': newPasswordHash,
          ':updatedAt': Date.now(),
        },
      };
      try {
        await dynamoDb.send(new UpdateCommand(params));
      } catch (error) {
        console.error('Error updating password hash:', error);
        throw new Error('Could not update password hash');
      }
    }

    

    



    

}