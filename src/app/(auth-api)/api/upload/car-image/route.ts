import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'cars';
    const oldAvatar = formData.get('oldAvatar') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Delete old avatar if provided
    if (oldAvatar && oldAvatar.startsWith('/uploads/cars/')) {
      try {
        // FIX: Use Railway volume path instead of process.cwd()
        const oldFilename = oldAvatar.split('/').pop();
        if (oldFilename) {
          const oldFilePath = path.join('/upload', folder, oldFilename);
          
          // Also try legacy path for backward compatibility
          const legacyPath = path.join(process.cwd(), 'uploads', folder, oldFilename);
          
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          } else if (fs.existsSync(legacyPath)) {
            fs.unlinkSync(legacyPath);
          }
        }
      } catch (deleteError) {
        // Silent fail
      }
    }

    // FIX: Create upload directory in Railway volume
    const uploadDir = path.join('/upload', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename - FIXED TypeScript error
    const fileNameParts = file.name.split('.');
    const fileExtension = fileNameParts.length > 1 ? fileNameParts.pop() : 'jpg';
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    fs.writeFileSync(filePath, buffer);

    // IMPORTANT: Keep returning /uploads/... for frontend compatibility
    const urlPath = `/uploads/${folder}/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      url: urlPath,
      filename: uniqueFilename
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload file' },
      { status: 500 }
    );
  }
}