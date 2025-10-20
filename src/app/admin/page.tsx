'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdminAuthenticated, getActiveSessions } from '@/core/auth';
import { worldManager, type WorldData } from '@/core/worlds';
import WorldEditor from '@/components/admin/WorldEditor';
import AssetPanel from '@/components/admin/AssetPanel';
import PropertiesPanel from '@/components/admin/PropertiesPanel';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [worlds, setWorlds] = useState<WorldData[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'worlds' | 'editor' | 'assets'>('worlds');
  // const [selectedAsset, setSelectedAsset] = useState<{ url: string; name: string; type: string } | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/verify');
        const data = await response.json();
        
        if (data.authenticated) {
          setIsAuthenticated(true);
          loadWorlds();
        } else {
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Load worlds
  const loadWorlds = async () => {
    try {
      const worldsList = await worldManager.listWorlds();
      setWorlds(worldsList);
    } catch (error) {
      console.error('Error loading worlds:', error);
    }
  };

  // Handle world selection
  const handleWorldSelect = (worldId: string) => {
    setSelectedWorld(worldId);
    setActiveTab('editor');
  };

  // Handle world creation
  const handleCreateWorld = async () => {
    const name = prompt('Enter world name:');
    if (!name) return;

    const id = name.toLowerCase().replace(/\s+/g, '-');
    const result = await worldManager.createWorld(id, name);
    
    if (result.success) {
      loadWorlds();
      setSelectedWorld(id);
      setActiveTab('editor');
    } else {
      alert(result.error || 'Failed to create world');
    }
  };

  // Handle world deletion
  const handleDeleteWorld = async (worldId: string) => {
    if (!confirm('Are you sure you want to delete this world?')) return;

    const result = await worldManager.deleteWorld(worldId);
    
    if (result.success) {
      loadWorlds();
      if (selectedWorld === worldId) {
        setSelectedWorld(null);
        setActiveTab('worlds');
      }
    } else {
      alert(result.error || 'Failed to delete world');
    }
  };

  // Handle asset selection (for future use)
  // const handleAssetSelect = (asset: { url: string; name: string; type: string }) => {
  //   setSelectedAsset(asset);
  // };

  // Handle logout
  const handleLogout = () => {
    document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    router.push('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">NexusWorld3D Admin</h1>
            <p className="text-gray-400">World Editor & Asset Management</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              Active sessions: {getActiveSessions().length}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-2">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('worlds')}
            className={`px-4 py-2 rounded ${
              activeTab === 'worlds'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Worlds
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            disabled={!selectedWorld}
            className={`px-4 py-2 rounded ${
              activeTab === 'editor'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            } ${!selectedWorld ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-4 py-2 rounded ${
              activeTab === 'assets'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Assets
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="h-[calc(100vh-120px)]">
        {activeTab === 'worlds' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Worlds</h2>
              <button
                onClick={handleCreateWorld}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Create New World
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {worlds.map((world) => (
                <div key={world.id} className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">{world.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{world.description}</p>
                  
                  <div className="space-y-2 text-sm text-gray-300 mb-4">
                    <div>Objects: {world.objects.length}</div>
                    <div>Created: {new Date(world.createdAt).toLocaleDateString()}</div>
                    <div>Updated: {new Date(world.updatedAt).toLocaleDateString()}</div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleWorldSelect(world.id)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteWorld(world.id)}
                      className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {worlds.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl text-gray-600 mb-4">🌍</div>
                <h3 className="text-xl text-gray-400 mb-2">No worlds created yet</h3>
                <p className="text-gray-500 mb-4">Create your first world to get started</p>
                <button
                  onClick={handleCreateWorld}
                  className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Create World
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'editor' && selectedWorld && (
          <WorldEditor
            worldId={selectedWorld}
            onSave={loadWorlds}
            onClose={() => setActiveTab('worlds')}
          />
        )}

        {activeTab === 'assets' && (
          <div className="h-full flex">
            <div className="flex-1">
              <AssetPanel onAssetSelect={() => {}} />
            </div>
            <div className="w-80 border-l border-gray-700">
              <PropertiesPanel
                selectedObject={null}
                onObjectUpdate={() => {}}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get session ID from cookie
function getSessionIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies['admin_session'] || null;
}
