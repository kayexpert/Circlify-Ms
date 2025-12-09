/**
 * Image compression utility
 * Compresses images before upload to reduce file size
 */

import imageCompression from 'browser-image-compression'

export interface CompressionOptions {
  maxSizeMB?: number // Maximum size in MB (default: 0.5)
  maxWidthOrHeight?: number // Maximum width or height in pixels (default: 1920)
  useWebWorker?: boolean // Use web worker for non-blocking compression (default: true)
  fileType?: string // Output file type (default: 'image/jpeg')
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 0.5, // 500KB
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg',
}

/**
 * Compress an image file
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const compressionOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  try {
    const compressedFile = await imageCompression(file, compressionOptions)
    return compressedFile
  } catch (error) {
    console.error('Error compressing image:', error)
    throw new Error('Failed to compress image. Please try again.')
  }
}

/**
 * Validate image file before compression
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB before compression (default: 5MB)
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 5
): { isValid: boolean; error?: string } {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'File must be an image (JPEG, PNG, WebP, etc.)',
    }
  }

  // Check file size (before compression)
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `Image size must be less than ${maxSizeMB}MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    }
  }

  return { isValid: true }
}
