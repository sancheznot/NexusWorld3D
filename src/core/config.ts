/**
 * Configuration loader for NexusWorld3D Framework
 * 
 * This module provides a centralized way to access configuration
 * throughout the application without importing the config file directly.
 */

import { nexusWorld3DConfig, type NexusWorld3DConfig } from '../../nexusworld3d.config';

// Global config instance
let config: NexusWorld3DConfig = nexusWorld3DConfig;

/**
 * Get the current configuration
 */
export function getConfig(): NexusWorld3DConfig {
  return config;
}

/**
 * Update configuration (useful for runtime changes)
 */
export function updateConfig(newConfig: Partial<NexusWorld3DConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Get server configuration
 */
export function getServerConfig() {
  return config.server;
}

/**
 * Get gameplay configuration
 */
export function getGameplayConfig() {
  return config.gameplay;
}

/**
 * Get physics configuration
 */
export function getPhysicsConfig() {
  return config.physics;
}

/**
 * Get assets configuration
 */
export function getAssetsConfig() {
  return config.assets;
}

/**
 * Get characters configuration
 */
export function getCharactersConfig() {
  return config.characters;
}

/**
 * Get worlds configuration
 */
export function getWorldsConfig() {
  return config.worlds;
}

/**
 * Get UI configuration
 */
export function getUIConfig() {
  return config.ui;
}

/**
 * Get admin configuration
 */
export function getAdminConfig() {
  return config.admin;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof config.gameplay): boolean {
  return config.gameplay[feature] as boolean;
}

/**
 * Get animation name with fallback
 */
export function getAnimationName(action: string, availableAnimations: string[]): string {
  const possibleNames = config.characters.animations[action] || [action];
  
  for (const name of possibleNames) {
    if (availableAnimations.includes(name)) {
      return name;
    }
  }
  
  // Fallback to idle
  return getAnimationName('idle', availableAnimations);
}

/**
 * Get asset URL with CDN support
 */
export function getAssetUrl(path: string): string {
  if (config.assets.cdnUrl) {
    return `${config.assets.cdnUrl}/${path}`;
  }
  
  if (config.assets.storageProvider === 's3') {
    return `https://s3.amazonaws.com/${config.assets.projectName}/${path}`;
  }
  
  return path; // Local path
}

/**
 * Validate configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate server config
  if (config.server.maxPlayers < 1 || config.server.maxPlayers > 1000) {
    errors.push('maxPlayers must be between 1 and 1000');
  }
  
  if (config.server.tickRate < 10 || config.server.tickRate > 120) {
    errors.push('tickRate must be between 10 and 120');
  }
  
  // Validate physics config
  if (config.physics.gravity > 0) {
    errors.push('gravity should be negative (downward)');
  }
  
  if (config.physics.playerSpeed <= 0) {
    errors.push('playerSpeed must be positive');
  }
  
  if (config.physics.runSpeed <= config.physics.playerSpeed) {
    errors.push('runSpeed must be greater than playerSpeed');
  }
  
  // Validate assets config
  if (config.assets.maxFileSize <= 0) {
    errors.push('maxFileSize must be positive');
  }
  
  if (config.assets.tempCleanupHours <= 0) {
    errors.push('tempCleanupHours must be positive');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export the config instance for direct access if needed
export { config };
