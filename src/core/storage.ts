/**
 * Asset Storage System for NexusWorld3D Framework
 * 
 * Handles upload, management, and retrieval of 3D assets (models, textures, etc.)
 * Supports S3, Cloudflare R2, and local storage.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getAssetsConfig } from './config';

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  error?: string;
}

export interface AssetMetadata {
  key: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: Date;
  worldId?: string;
  isTemporary: boolean;
}

export class AssetStorage {
  private provider: 'local' | 's3' | 'cloudflare-r2';
  private cdnUrl?: string;
  private projectName: string;
  private maxFileSize: number;
  private tempCleanupHours: number;
  private s3Client?: S3Client;
  private s3BucketName?: string;

  constructor() {
    const config = getAssetsConfig();
    this.provider = config.storageProvider;
    this.cdnUrl = config.cdnUrl;
    this.projectName = config.projectName;
    this.maxFileSize = config.maxFileSize;
    this.tempCleanupHours = config.tempCleanupHours;
    this.s3BucketName = config.s3BucketName;

    // Initialize S3 client if S3 is configured
    if (this.provider === 's3' && config.s3AccessKeyId && config.s3SecretAccessKey) {
      this.s3Client = new S3Client({
        region: config.s3Region || 'us-east-1',
        credentials: {
          accessKeyId: config.s3AccessKeyId,
          secretAccessKey: config.s3SecretAccessKey,
        },
      });
    }
  }

  /**
   * Get S3 path structure
   */
  getS3Paths() {
    return {
      temp: `nexusworld3d/temp/`,
      maps: `nexusworld3d/maps/`,
      shared: `nexusworld3d/shared/`,
    };
  }

  /**
   * Upload a temporary file (for editor use)
   */
  async uploadTemp(file: File): Promise<UploadResult> {
    try {
      // Validate file
      if (file.size > this.maxFileSize * 1024 * 1024) {
        return {
          success: false,
          url: '',
          key: '',
          error: `File too large. Maximum size: ${this.maxFileSize}MB`,
        };
      }

      if (!file.name.toLowerCase().endsWith('.glb')) {
        return {
          success: false,
          url: '',
          key: '',
          error: 'Only GLB files are supported',
        };
      }

      // Generate unique key
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const key = `${this.getS3Paths().temp}model-${timestamp}-${randomId}.glb`;

      if (this.provider === 'local') {
        return await this.uploadLocal(file, key);
      } else {
        return await this.uploadToS3(file, key);
      }
    } catch (error) {
      return {
        success: false,
        url: '',
        key: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Make a temporary asset persistent (move to world folder)
   */
  async makePersistent(tempKey: string, worldId: string): Promise<UploadResult> {
    try {
      const paths = this.getS3Paths();
      const fileName = tempKey.split('/').pop() || 'model.glb';
      const newKey = `${paths.maps}${worldId}/models/${fileName}`;

      if (this.provider === 'local') {
        return await this.moveLocalFile(tempKey, newKey);
      } else {
        return await this.moveS3File(tempKey, newKey);
      }
    } catch (error) {
      return {
        success: false,
        url: '',
        key: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get asset URL with CDN support
   */
  getAssetUrl(key: string): string {
    if (this.cdnUrl) {
      // Use CDN URL with the key as path
      return `${this.cdnUrl}/${key}`;
    }

    if (this.provider === 's3' && this.s3BucketName) {
      return `https://${this.s3BucketName}.s3.${this.s3Client?.config.region || 'us-east-2'}.amazonaws.com/${key}`;
    }

    if (this.provider === 'cloudflare-r2') {
      return `https://${this.projectName}.r2.cloudflarestorage.com/${key}`;
    }

    return `/${key}`; // Local path
  }

  /**
   * Clean up temporary files older than specified hours
   */
  async cleanupTemp(): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = [];
    const cleaned: number = 0;

    try {
      if (this.provider === 'local') {
        // For local storage, we'd need to implement file system cleanup
        // This is a placeholder for now
        console.log('Local temp cleanup not implemented yet');
      } else {
        // For S3, we'd list objects in temp/ folder and delete old ones
        // This is a placeholder for now
        console.log('S3 temp cleanup not implemented yet');
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return { cleaned, errors };
  }

  /**
   * Delete a world and all its assets
   */
  async deleteWorld(worldId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const paths = this.getS3Paths();
      const worldPath = `${paths.maps}${worldId}/`;

      if (this.provider === 'local') {
        // For local storage, we'd delete the directory
        console.log(`Would delete local directory: ${worldPath}`);
        return { success: true };
      } else {
        // For S3, we'd list and delete all objects with this prefix
        console.log(`Would delete S3 objects with prefix: ${worldPath}`);
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload to local storage (development)
   */
  private async uploadLocal(file: File, key: string): Promise<UploadResult> {
    // This would be implemented for local development
    // For now, we'll simulate it
    const url = `/models/temp/${file.name}`;
    
    return {
      success: true,
      url,
      key,
    };
  }

  /**
   * Upload to S3 (production)
   */
  private async uploadToS3(file: File, key: string): Promise<UploadResult> {
    if (!this.s3Client || !this.s3BucketName) {
      return {
        success: false,
        url: '',
        key: '',
        error: 'S3 not configured properly',
      };
    }

    try {
      // Convert File to Buffer
      const buffer = await file.arrayBuffer();
      
      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.s3BucketName,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: 'model/gltf-binary',
        Metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      // Generate URL
      const url = this.getAssetUrl(key);

      return {
        success: true,
        url,
        key,
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      return {
        success: false,
        url: '',
        key: '',
        error: error instanceof Error ? error.message : 'S3 upload failed',
      };
    }
  }

  /**
   * Move local file
   */
  private async moveLocalFile(fromKey: string, toKey: string): Promise<UploadResult> {
    // This would move the file in the local filesystem
    // For now, we'll simulate it
    const url = `/${toKey}`;
    
    return {
      success: true,
      url,
      key: toKey,
    };
  }

  /**
   * Move S3 file
   */
  private async moveS3File(fromKey: string, toKey: string): Promise<UploadResult> {
    if (!this.s3Client || !this.s3BucketName) {
      return {
        success: false,
        url: '',
        key: '',
        error: 'S3 not configured properly',
      };
    }

    try {
      // Copy file to new location
      const copyCommand = new CopyObjectCommand({
        Bucket: this.s3BucketName,
        CopySource: `${this.s3BucketName}/${fromKey}`,
        Key: toKey,
      });

      await this.s3Client.send(copyCommand);

      // Delete original file
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.s3BucketName,
        Key: fromKey,
      });

      await this.s3Client.send(deleteCommand);

      // Generate URL
      const url = this.getAssetUrl(toKey);

      return {
        success: true,
        url,
        key: toKey,
      };
    } catch (error) {
      console.error('S3 move error:', error);
      return {
        success: false,
        url: '',
        key: '',
        error: error instanceof Error ? error.message : 'S3 move failed',
      };
    }
  }

  /**
   * Get storage provider info
   */
  getProviderInfo() {
    return {
      provider: this.provider,
      cdnUrl: this.cdnUrl,
      projectName: this.projectName,
      maxFileSize: this.maxFileSize,
      tempCleanupHours: this.tempCleanupHours,
    };
  }
}

// Export singleton instance
export const assetStorage = new AssetStorage();
