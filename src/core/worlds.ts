/**
 * World Management System for NexusWorld3D Framework
 * 
 * Handles saving, loading, and managing 3D worlds as JSON files
 */

import { getWorldsConfig } from './config';
import { assetStorage } from './storage';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface WorldObject {
  id: string;
  type: 'terrain' | 'building' | 'decoration' | 'interactive' | 'character';
  model: string; // URL to the 3D model
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  hasCollision: boolean;
  metadata?: Record<string, any>;
}

export interface WorldData {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  spawnPoint: { x: number; y: number; z: number };
  skybox?: string; // URL to skybox texture
  objects: WorldObject[];
  settings: {
    gravity: number;
    lighting: {
      ambient: number;
      directional: number;
    };
    fog?: {
      enabled: boolean;
      color: string;
      near: number;
      far: number;
    };
  };
}

export class WorldManager {
  private worldsDirectory: string;
  private maxWorlds: number;

  constructor() {
    const config = getWorldsConfig();
    this.worldsDirectory = config.directory;
    this.maxWorlds = config.maxWorlds;
  }

  /**
   * Create a new world
   */
  async createWorld(
    id: string,
    name: string,
    description?: string
  ): Promise<{ success: boolean; world?: WorldData; error?: string }> {
    try {
      // Check if world already exists
      if (await this.worldExists(id)) {
        return {
          success: false,
          error: `World with ID '${id}' already exists`,
        };
      }

      // Check world limit
      const existingWorlds = await this.listWorlds();
      if (existingWorlds.length >= this.maxWorlds) {
        return {
          success: false,
          error: `Maximum number of worlds (${this.maxWorlds}) reached`,
        };
      }

      // Create world data
      const now = new Date();
      const world: WorldData = {
        id,
        name,
        description,
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        spawnPoint: { x: 0, y: 0, z: 0 },
        objects: [],
        settings: {
          gravity: -9.8,
          lighting: {
            ambient: 0.4,
            directional: 0.8,
          },
        },
      };

      // Save world
      await this.saveWorld(world);

      return { success: true, world };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Save world to JSON file
   */
  async saveWorld(world: WorldData): Promise<{ success: boolean; error?: string }> {
    try {
      // Ensure worlds directory exists
      await this.ensureWorldsDirectory();

      // Update timestamp
      world.updatedAt = new Date();

      // Convert to JSON
      const jsonData = JSON.stringify(world, null, 2);
      const filePath = path.join(this.worldsDirectory, `${world.id}.json`);

      // Write file
      await fs.writeFile(filePath, jsonData, 'utf8');

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Load world from JSON file
   */
  async loadWorld(id: string): Promise<{ success: boolean; world?: WorldData; error?: string }> {
    try {
      const filePath = path.join(this.worldsDirectory, `${id}.json`);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return {
          success: false,
          error: `World '${id}' not found`,
        };
      }

      // Read and parse file
      const jsonData = await fs.readFile(filePath, 'utf8');
      const world: WorldData = JSON.parse(jsonData);

      // Convert date strings back to Date objects
      world.createdAt = new Date(world.createdAt);
      world.updatedAt = new Date(world.updatedAt);

      return { success: true, world };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List all available worlds
   */
  async listWorlds(): Promise<WorldData[]> {
    try {
      await this.ensureWorldsDirectory();
      
      const files = await fs.readdir(this.worldsDirectory);
      const worldFiles = files.filter(file => file.endsWith('.json'));
      
      const worlds: WorldData[] = [];
      
      for (const file of worldFiles) {
        const id = path.basename(file, '.json');
        const result = await this.loadWorld(id);
        
        if (result.success && result.world) {
          worlds.push(result.world);
        }
      }
      
      // Sort by updated date (newest first)
      worlds.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      return worlds;
    } catch (error) {
      console.error('Error listing worlds:', error);
      return [];
    }
  }

  /**
   * Delete a world
   */
  async deleteWorld(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Load world to get asset references
      const loadResult = await this.loadWorld(id);
      if (!loadResult.success || !loadResult.world) {
        return {
          success: false,
          error: `World '${id}' not found`,
        };
      }

      // Delete world file
      const filePath = path.join(this.worldsDirectory, `${id}.json`);
      await fs.unlink(filePath);

      // Delete associated assets
      await assetStorage.deleteWorld(id);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if world exists
   */
  async worldExists(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.worldsDirectory, `${id}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add object to world
   */
  async addObjectToWorld(
    worldId: string,
    object: WorldObject
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const loadResult = await this.loadWorld(worldId);
      if (!loadResult.success || !loadResult.world) {
        return {
          success: false,
          error: `World '${worldId}' not found`,
        };
      }

      const world = loadResult.world;
      
      // Check if object ID already exists
      if (world.objects.some(obj => obj.id === object.id)) {
        return {
          success: false,
          error: `Object with ID '${object.id}' already exists in world`,
        };
      }

      // Add object
      world.objects.push(object);
      
      // Save world
      const saveResult = await this.saveWorld(world);
      if (!saveResult.success) {
        return saveResult;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Remove object from world
   */
  async removeObjectFromWorld(
    worldId: string,
    objectId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const loadResult = await this.loadWorld(worldId);
      if (!loadResult.success || !loadResult.world) {
        return {
          success: false,
          error: `World '${worldId}' not found`,
        };
      }

      const world = loadResult.world;
      
      // Remove object
      const initialLength = world.objects.length;
      world.objects = world.objects.filter(obj => obj.id !== objectId);
      
      if (world.objects.length === initialLength) {
        return {
          success: false,
          error: `Object with ID '${objectId}' not found in world`,
        };
      }
      
      // Save world
      const saveResult = await this.saveWorld(world);
      if (!saveResult.success) {
        return saveResult;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Ensure worlds directory exists
   */
  private async ensureWorldsDirectory(): Promise<void> {
    try {
      await fs.access(this.worldsDirectory);
    } catch {
      await fs.mkdir(this.worldsDirectory, { recursive: true });
    }
  }

  /**
   * Get world statistics
   */
  async getWorldStats(): Promise<{
    totalWorlds: number;
    totalObjects: number;
    totalSize: number;
  }> {
    try {
      const worlds = await this.listWorlds();
      const totalObjects = worlds.reduce((sum, world) => sum + world.objects.length, 0);
      
      // Calculate total size (simplified)
      const totalSize = worlds.length * 1024; // Rough estimate
      
      return {
        totalWorlds: worlds.length,
        totalObjects,
        totalSize,
      };
    } catch (error) {
      console.error('Error getting world stats:', error);
      return {
        totalWorlds: 0,
        totalObjects: 0,
        totalSize: 0,
      };
    }
  }
}

// Export singleton instance
export const worldManager = new WorldManager();
