/**
 * Client-side World Management for NexusWorld3D Framework
 * 
 * This is a client-side wrapper that calls the API routes
 */

import { type WorldData, type WorldObject } from './worlds';

// Re-export types for client use
export type { WorldData, WorldObject };

export class WorldManagerClient {
  private baseUrl = '/api/admin/worlds';

  /**
   * List all worlds
   */
  async listWorlds(): Promise<WorldData[]> {
    try {
      const response = await fetch(this.baseUrl);
      const data = await response.json();
      
      if (response.ok) {
        return data.worlds || [];
      } else {
        console.error('Error listing worlds:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Error listing worlds:', error);
      return [];
    }
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
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, name, description }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, world: data.world };
      } else {
        return { success: false, error: data.error || 'Failed to create world' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Load a world
   */
  async loadWorld(id: string): Promise<{ success: boolean; world?: WorldData; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      const data = await response.json();

      if (response.ok) {
        return { success: true, world: data.world };
      } else {
        return { success: false, error: data.error || 'Failed to load world' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Save a world
   */
  async saveWorld(world: WorldData): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${world.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(world),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to save world' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a world
   */
  async deleteWorld(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to delete world' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
      // First load the world
      const loadResult = await this.loadWorld(worldId);
      if (!loadResult.success || !loadResult.world) {
        return { success: false, error: 'Failed to load world' };
      }

      // Add object to world
      const world = loadResult.world;
      world.objects.push(object);

      // Save the world
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
      // First load the world
      const loadResult = await this.loadWorld(worldId);
      if (!loadResult.success || !loadResult.world) {
        return { success: false, error: 'Failed to load world' };
      }

      // Remove object from world
      const world = loadResult.world;
      world.objects = world.objects.filter(obj => obj.id !== objectId);

      // Save the world
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
}

// Export singleton instance
export const worldManagerClient = new WorldManagerClient();
