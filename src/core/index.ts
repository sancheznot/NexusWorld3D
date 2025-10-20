/**
 * NexusWorld3D Framework Core
 * 
 * Central exports for the framework core functionality
 */

// Configuration
export * from './config';

// Storage
export * from './storage';

// Authentication
export * from './auth';

// World Management
export * from './worlds';

// Re-export the main config for convenience
export { nexusWorld3DConfig as config } from '../../nexusworld3d.config';
