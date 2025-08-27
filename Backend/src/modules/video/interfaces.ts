export interface VideoJobData {
  // buffer: Buffer; // ❌ Remove buffer
  fileName: string;
  bucketName: string;
  folder: string;
  originalObjectName: string;
  mimetype: string;
  fileSize: number; // ✅ Add file size
  originalName: string; // ✅ Add original name
}

export interface VideoUploadResult {
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  etag: string;
  isProcessing?: boolean;
}

export interface ProcessingProgress {
  fileName: string;
  stage: 'converting' | 'uploading' | 'completed' | 'failed';
  progress: number;
  message: string;
  startTime: Date;
  estimatedCompletion?: Date;
  currentSegment?: number;
  totalSegments?: number;
  uploadedSegments?: number;
  error?: string;
}

export interface SimpleVideoInfo {
  fileName: string;
  status: 'processing' | 'ready' | 'failed';
  duration: number; // seconds
  durationFormatted: string; // "12:34"
  hlsUrl: string | null;
  originalUrl: string | null;
  isProcessing: boolean;
  progress: number; // 0-100
  message: string;
}
