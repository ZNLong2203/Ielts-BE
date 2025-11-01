export interface VideoJobData {
  // buffer: Buffer; //  Remove buffer
  fileName: string;
  bucketName: string;
  folder: string;
  originalObjectName: string;
  mimetype: string;
  fileSize: number; //  Add file size
  originalName: string; //  Add original name
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

export interface VideoUploadRequest {
  originalName: string;
  fileSize: number;
  mimetype: string;
}

export interface PresignedUploadResponse {
  fileName: string;
  originalName: string;
  presignedUrl: string;
  uploadUrl: string; // For compatibility
  fields: Record<string, string>; // For form data (empty for MinIO PUT)
  bucketName: string;
  objectName: string;
  expiresAt: Date;
  maxFileSize: number;
  instructions?: {
    method: string;
    headers: Record<string, string>;
    note: string;
  };
}

export interface VideoUploadSession {
  sessionId: string;
  fileName: string;
  originalName: string;
  originalObjectName: string;
  bucketName: string;
  objectName: string;
  folder: string;
  mimetype: string;
  fileSize: number;
  duration?: number;
  status: 'pending' | 'processing' | 'confirmed' | 'failed';
  confirmedAt?: Date;
  failedAt?: Date;
  error?: Error | string;
  createdAt: Date;
  updatedAt: Date;
}
