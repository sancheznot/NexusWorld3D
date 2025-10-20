'use client';

import { useState, useRef, useCallback } from 'react';
import { assetStorage, type UploadResult } from '@/core/storage';

interface AssetPanelProps {
  onAssetSelect: (asset: { url: string; name: string; type: string }) => void;
}

interface AssetItem {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  isTemporary: boolean;
}

export default function AssetPanel({ onAssetSelect }: AssetPanelProps) {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const results: UploadResult[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await assetStorage.uploadTemp(file);
        results.push(result);
        
        setUploadProgress(((i + 1) / files.length) * 100);
        
        if (result.success) {
          // Add to assets list
          const newAsset: AssetItem = {
            id: result.key,
            name: file.name,
            url: result.url,
            type: 'glb',
            size: file.size,
            isTemporary: true,
          };
          
          setAssets(prev => [...prev, newAsset]);
        } else {
          setError(result.error || 'Upload failed');
        }
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  }, [handleFileUpload]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    handleFileUpload(files);
  }, [handleFileUpload]);

  // Handle asset click
  const handleAssetClick = useCallback((asset: AssetItem) => {
    onAssetSelect({
      url: asset.url,
      name: asset.name,
      type: asset.type,
    });
  }, [onAssetSelect]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Assets</h3>
        <p className="text-sm text-gray-400">Upload and manage 3D models</p>
      </div>

      {/* Upload Area */}
      <div className="p-4 border-b border-gray-700">
        <div
          className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          {isUploading ? (
            <div className="space-y-2">
              <div className="text-white">Uploading...</div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="text-sm text-gray-400">{uploadProgress.toFixed(0)}%</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl text-gray-400">📁</div>
              <div className="text-white">Drop GLB files here</div>
              <div className="text-sm text-gray-400">or click to browse</div>
            </div>
          )}
        </div>
      </div>

      {/* Assets List */}
      <div className="flex-1 overflow-y-auto p-4">
        {assets.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-2">📦</div>
            <div>No assets uploaded</div>
            <div className="text-sm">Upload some GLB files to get started</div>
          </div>
        ) : (
          <div className="space-y-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors"
                onClick={() => handleAssetClick(asset)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-white font-medium truncate">{asset.name}</div>
                    <div className="text-sm text-gray-400">
                      {formatFileSize(asset.size)} • {asset.type.toUpperCase()}
                    </div>
                    {asset.isTemporary && (
                      <div className="text-xs text-yellow-400">Temporary</div>
                    )}
                  </div>
                  <div className="text-2xl text-gray-400">🎲</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900 border-t border-red-700">
          <p className="text-red-200 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-300 hover:text-red-100 text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
