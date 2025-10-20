'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { validateAdminCredentials, createAdminSession, setSessionCookie, isAdminEnabled } from '@/core/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  // Check if admin is enabled on mount
  useEffect(() => {
    const checkAdminEnabled = () => {
      const adminSettings = isAdminEnabled();
      setIsEnabled(adminSettings);
      
      if (!adminSettings) {
        setError('Admin panel is disabled');
      }
    };

    checkAdminEnabled();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isEnabled) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Validate credentials
      if (!validateAdminCredentials(credentials)) {
        setError('Invalid username or password');
        setIsLoading(false);
        return;
      }

      // Create session
      const sessionId = createAdminSession(credentials.username);
      
      // Set session cookie
      document.cookie = setSessionCookie(sessionId);
      
      // Redirect to admin panel
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!isEnabled) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center">
          <div className="text-6xl text-gray-600 mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-4">Admin Disabled</h1>
          <p className="text-gray-400 mb-6">
            The admin panel is currently disabled. Please check your environment configuration.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8">
        <div className="text-center mb-8">
          <div className="text-6xl text-blue-500 mb-4">🌍</div>
          <h1 className="text-2xl font-bold text-white mb-2">NexusWorld3D Admin</h1>
          <p className="text-gray-400">Sign in to access the admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={credentials.username}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={credentials.password}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
