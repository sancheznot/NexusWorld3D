import { NextRequest, NextResponse } from 'next/server';
import { getSessionIdFromRequest } from '@/core/auth';
import { assetStorage } from '@/core/storage';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId || !sessionId.startsWith('admin_')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get assets from storage (S3 + default assets)
    const defaultAssets = [
      {
        id: 'terrain-01',
        name: 'Terrain 01',
        url: '/models/terrain/Terrain_01.glb',
        type: 'glb',
        size: 1024000, // 1MB placeholder
        isTemporary: false
      },
      {
        id: 'hotel-humboldt',
        name: 'Hotel Humboldt',
        url: '/models/hotel_humboldt_model.glb',
        type: 'glb',
        size: 2048000, // 2MB placeholder
        isTemporary: false
      },
      {
        id: 'green-dome',
        name: 'Green Dome Structure',
        url: '/models/Green_Dome_Structure.glb',
        type: 'glb',
        size: 512000, // 512KB placeholder
        isTemporary: false
      }
    ];

    // Get uploaded assets from S3
    const uploadedAssets = await assetStorage.listAssets();
    
    // Log S3 configuration for debugging
    const s3Info = assetStorage.getProviderInfo();
    console.log('S3 Configuration:', s3Info);
    
    // Combine default assets with uploaded assets
    const assets = [...defaultAssets, ...uploadedAssets];
    
    console.log('Returning assets:', assets.map(a => ({ id: a.id, name: a.name, url: a.url })));

    return NextResponse.json({ 
      success: true, 
      assets 
    });
  } catch (error) {
    console.error('Error listing assets:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
