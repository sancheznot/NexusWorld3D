/**
 * Admin Authentication System for NexusWorld3D Framework
 * 
 * Simple authentication system using environment variables (no database required)
 */

import { getAdminConfig } from './config';

export interface AdminSession {
  isAuthenticated: boolean;
  username: string;
  loginTime: Date;
  expiresAt: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// In-memory session storage (in production, you might want to use Redis)
const sessions = new Map<string, AdminSession>();

/**
 * Check if admin credentials are valid
 */
export function validateAdminCredentials(credentials: LoginCredentials): boolean {
  const adminUsername = process.env.ADMIN_USERNAME_ACCESS;
  const adminPassword = process.env.ADMIN_PASSWORD_ACCESS;

  if (!adminUsername || !adminPassword) {
    console.warn('Admin credentials not configured in environment variables');
    return false;
  }

  return (
    credentials.username === adminUsername &&
    credentials.password === adminPassword
  );
}

/**
 * Create a new admin session
 */
export function createAdminSession(username: string): string {
  const sessionId = generateSessionId();
  const config = getAdminConfig();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.sessionTimeout * 60 * 1000);

  const session: AdminSession = {
    isAuthenticated: true,
    username,
    loginTime: now,
    expiresAt,
  };

  sessions.set(sessionId, session);

  // Clean up expired sessions
  cleanupExpiredSessions();

  return sessionId;
}

/**
 * Get admin session by ID
 */
export function getAdminSession(sessionId: string): AdminSession | null {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return null;
  }

  // Check if session is expired
  if (new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * Check if user is authenticated
 */
export function isAdminAuthenticated(sessionId: string): boolean {
  const session = getAdminSession(sessionId);
  return session?.isAuthenticated || false;
}

/**
 * Logout admin session
 */
export function logoutAdmin(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

/**
 * Get all active sessions (for admin dashboard)
 */
export function getActiveSessions(): AdminSession[] {
  cleanupExpiredSessions();
  return Array.from(sessions.values());
}

/**
 * Generate a secure session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `admin_${timestamp}_${random}`;
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = new Date();
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
    }
  }
}

/**
 * Middleware for protecting admin routes
 */
export function requireAdminAuth(handler: Function) {
  return async (req: Request) => {
    const sessionId = getSessionIdFromRequest(req);
    
    if (!sessionId || !isAdminAuthenticated(sessionId)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', redirect: '/admin/login' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(req);
  };
}

/**
 * Extract session ID from request (cookie or header)
 */
export function getSessionIdFromRequest(req: Request): string | null {
  // Try to get from cookie
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    return cookies['admin_session'] || null;
  }

  // Try to get from Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Set session cookie
 */
export function setSessionCookie(sessionId: string): string {
  const config = getAdminConfig();
  const expires = new Date(Date.now() + config.sessionTimeout * 60 * 1000);
  
  return `admin_session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Expires=${expires.toUTCString()}`;
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(): string {
  return 'admin_session=; HttpOnly; Secure; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

/**
 * Check if admin system is enabled
 */
export function isAdminEnabled(): boolean {
  const config = getAdminConfig();
  return config.enabled;
}

/**
 * Get admin configuration
 */
export function getAdminSettings() {
  const config = getAdminConfig();
  return {
    enabled: config.enabled,
    sessionTimeout: config.sessionTimeout,
    hasCredentials: !!(process.env.ADMIN_USERNAME_ACCESS && process.env.ADMIN_PASSWORD_ACCESS),
  };
}
