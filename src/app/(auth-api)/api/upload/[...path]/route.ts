import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }  // Keep as Promise
) {
  try {
    // IMPORTANT: Await the params first
    const params = await context.params;  // Add await here
    const urlPath = params.path.join('/'); // e.g., "uploads/cars/filename.jpg"
    
    // Convert URL path to volume path
    const filePath = urlPath.replace(/^uploads\//, '');
    
    // Use /upload as base directory for Railway volume
    const baseDir = '/upload';
    const fullPath = path.join(baseDir, filePath);
    
    // Also check in development/local path
    if (!fs.existsSync(fullPath)) {
      // For backward compatibility/development
      const devPath = path.join(process.cwd(), urlPath);
      if (fs.existsSync(devPath)) {
        const fileBuffer = fs.readFileSync(devPath);
        const stats = fs.statSync(devPath);
        
        const ext = path.extname(devPath).toLowerCase();
        let contentType = 'application/octet-stream';
        
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.webp') contentType = 'image/webp';
        else if (ext === '.gif') contentType = 'image/gif';
        
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000',
            'Content-Length': stats.size.toString(),
          },
        });
      }
      
      return new NextResponse('File not found', { status: 404 });
    }
    
    const fileBuffer = fs.readFileSync(fullPath);
    const stats = fs.statSync(fullPath);
    
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.gif') contentType = 'image/gif';
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'Content-Length': stats.size.toString(),
      },
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}