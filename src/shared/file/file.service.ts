import { Injectable, BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import * as crypto from 'crypto';
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from '../../config/aws-cluster.config';

@Injectable()
export class FileService {
  private readonly maxSizeInBytes = 10 * 1024 * 1024; // 10 MB
  private readonly allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  private readonly bucketName = '';
  private readonly region = ''

  async validateAndSaveFiles(files: Express.Multer.File[]): Promise<string[]> {
    const savedUrls: string[] = [];

    for (const file of files) {
      this.validateFileSize(file);
      this.validateFileType(file);
      
      const filename = this.generateUniqueFilename(file);
      const url = await this.uploadFileToS3(file.buffer, filename);
      
      savedUrls.push(url);
    }

    return savedUrls;
  }

  private async uploadFileToS3(buffer: Buffer, filename: string): Promise<string> {
    const params = {
      Bucket: this.bucketName,
      Key: `${filename}`,
      Body: buffer,
      ContentType: 'image/jpeg', // Adjust based on file type
    };

    try {
      await s3Client.send(new PutObjectCommand(params));
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filename}`;
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async deleteFile(filename: string): Promise<void> {
    const params = {
      Bucket: this.bucketName,
      Key: `${filename}`,
    };

    try {
      await s3Client.send(new DeleteObjectCommand(params));
    } catch (error) {
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  private validateFileSize(file: Express.Multer.File): void {
    if (file.size > this.maxSizeInBytes) {
      throw new BadRequestException('File size exceeds the limit of 10 MB');
    }
  }

  private validateFileType(file: Express.Multer.File): void {
    const ext = extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      throw new BadRequestException('Invalid file type. Allowed types: jpg, jpeg, png, gif');
    }
  }

  private generateUniqueFilename(file: Express.Multer.File): string {
    const randomName = crypto.randomBytes(16).toString('hex');
    return `${randomName}${extname(file.originalname)}`;
  }

  extractFilenameFromUrl(url: string): string | null {
    const matches = url.match(/\/([^\/]+)$/);
    return matches ? matches[1] : null;
  }
}