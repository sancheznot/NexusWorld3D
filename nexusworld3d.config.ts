/**
 * NexusWorld3D Framework Configuration
 * 
 * This is the central configuration file for the framework.
 * All game settings, server options, and asset paths are defined here.
 */

export interface NexusWorld3DConfig {
  // Server configuration
  server: {
    maxPlayers: number;
    tickRate: number;
    port?: number;
    host?: string;
  };
  
  // Game mechanics
  gameplay: {
    hasHealth: boolean;
    hasStamina: boolean;
    hasCombat: boolean;
    hasInventory: boolean;
    maxInventorySlots: number;
    hasExperience: boolean;
    hasLeveling: boolean;
  };
  
  // Physics settings
  physics: {
    gravity: number;
    playerSpeed: number;
    runSpeed: number;
    jumpForce: number;
    friction: number;
    airResistance: number;
  };
  
  // Asset management
  assets: {
    storageProvider: 's3' | 'local' | 'cloudflare-r2';
    cdnUrl?: string;
    projectName: string;
    maxFileSize: number; // in MB
    tempCleanupHours: number;
    // S3 Configuration
    s3BucketName?: string;
    s3Region?: string;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
  };
  
  // Character system
  characters: {
    models: {
      male: string;
      female: string;
    };
    animations: {
      [key: string]: string[]; // e.g., idle: ['Idle', 'idle', 'Standing']
    };
    defaultCustomization: {
      modelType: 'male' | 'female';
      skinColor: string;
      hairColor: string;
      eyeColor: string;
    };
  };
  
  // World/Level system
  worlds: {
    default: string;
    directory: string;
    maxWorlds: number;
  };
  
  // UI settings
  ui: {
    showFPS: boolean;
    showDebugInfo: boolean;
    showPlayerList: boolean;
    chatMaxMessages: number;
  };
  
  // Admin settings
  admin: {
    enabled: boolean;
    sessionTimeout: number; // in minutes
  };
}

// Default configuration
const defaultConfig: NexusWorld3DConfig = {
  server: {
    maxPlayers: 50,
    tickRate: 60,
    port: 3000,
    host: 'localhost',
  },
  
  gameplay: {
    hasHealth: true,
    hasStamina: true,
    hasCombat: false,
    hasInventory: true,
    maxInventorySlots: 20,
    hasExperience: true,
    hasLeveling: true,
  },
  
  physics: {
    gravity: -9.8,
    playerSpeed: 5,
    runSpeed: 8,
    jumpForce: 4,
    friction: 0.8,
    airResistance: 0.95,
  },
  
  assets: {
    storageProvider: (process.env.STORAGE_PROVIDER as 'local' | 's3' | 'cloudflare-r2') || 'local',
    cdnUrl: process.env.CDN_URL,
    projectName: process.env.PROJECT_NAME || 'nexusworld3d',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '100'), // MB
    tempCleanupHours: parseInt(process.env.TEMP_CLEANUP_HOURS || '24'),
    // S3 Configuration
    s3BucketName: process.env.AWS_S3_BUCKET,
    s3Region: process.env.AWS_REGION,
    s3AccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    s3SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  
  characters: {
    models: {
      male: '/models/characters/men/men-all.glb',
      female: '/models/characters/women/women-all.glb',
    },
    animations: {
      idle: ['Idle', 'idle', 'Standing'],
      walking: ['Walking', 'Walk', 'walking'],
      running: ['Running', 'Run', 'running'],
      jumping: ['Jumping', 'Jump', 'jumping'],
      attacking: ['Attacking', 'Attack', 'attacking'],
      // Users can add more animations
      dancing: ['Dancing', 'Dance'],
      sitting: ['Sitting', 'Sit'],
    },
    defaultCustomization: {
      modelType: 'male',
      skinColor: '#FDBCB4',
      hairColor: '#8B4513',
      eyeColor: '#4A90E2',
    },
  },
  
  worlds: {
    default: 'main-world',
    directory: './worlds',
    maxWorlds: 100,
  },
  
  ui: {
    showFPS: true,
    showDebugInfo: true,
    showPlayerList: true,
    chatMaxMessages: 100,
  },
  
  admin: {
    enabled: true,
    sessionTimeout: 60, // 1 hour
  },
};

// Environment-based overrides
function getConfig(): NexusWorld3DConfig {
  const config = { ...defaultConfig };
  
  // Override with environment variables
  if (process.env.NEXT_PUBLIC_MAX_PLAYERS) {
    config.server.maxPlayers = parseInt(process.env.NEXT_PUBLIC_MAX_PLAYERS);
  }
  
  if (process.env.PORT) {
    config.server.port = parseInt(process.env.PORT);
  }
  
  if (process.env.AWS_S3_BUCKET) {
    config.assets.storageProvider = 's3';
  }
  
  if (process.env.CDN_URL) {
    config.assets.cdnUrl = process.env.CDN_URL;
  }
  
  if (process.env.PROJECT_NAME) {
    config.assets.projectName = process.env.PROJECT_NAME;
  }
  
  return config;
}

// Export the configuration
export const nexusWorld3DConfig = getConfig();

// Export individual sections for easier imports
export const serverConfig = nexusWorld3DConfig.server;
export const gameplayConfig = nexusWorld3DConfig.gameplay;
export const physicsConfig = nexusWorld3DConfig.physics;
export const assetsConfig = nexusWorld3DConfig.assets;
export const charactersConfig = nexusWorld3DConfig.characters;
export const worldsConfig = nexusWorld3DConfig.worlds;
export const uiConfig = nexusWorld3DConfig.ui;
export const adminConfig = nexusWorld3DConfig.admin;

// Helper functions
export function getAnimationName(action: string, availableAnimations: string[]): string {
  const possibleNames = charactersConfig.animations[action] || [action];
  
  for (const name of possibleNames) {
    if (availableAnimations.includes(name)) {
      return name;
    }
  }
  
  // Fallback to idle
  return getAnimationName('idle', availableAnimations);
}

export function getAssetUrl(path: string): string {
  if (assetsConfig.cdnUrl) {
    return `${assetsConfig.cdnUrl}/${path}`;
  }
  
  if (assetsConfig.storageProvider === 's3') {
    return `https://s3.amazonaws.com/${assetsConfig.projectName}/${path}`;
  }
  
  return path; // Local path
}

export function isFeatureEnabled(feature: keyof typeof gameplayConfig): boolean {
  return gameplayConfig[feature] as boolean;
}

// Export default
export default nexusWorld3DConfig;
