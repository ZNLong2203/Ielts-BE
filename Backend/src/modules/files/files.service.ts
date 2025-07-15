import { Inject, Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { FileType } from 'src/common/constants/file';

@Injectable()
export class FilesService {
  constructor(@Inject('CLOUDINARY') private readonly cloudinary) {}

  private getUploadConfig(fileType: FileType, fileName: string) {
    const configs = {
      [FileType.USER_AVATAR]: {
        folder: 'ielts/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [{ width: 400, height: 400, crop: 'fill' }],
        resource_type: 'image' as const,
      },
      [FileType.TEACHER_CERTIFICATE]: {
        folder: 'ielts/certificates',
        allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
        resource_type: 'auto' as const,
      },
      [FileType.BLOG_IMAGE]: {
        folder: 'ielts/blogs',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        resource_type: 'image' as const,
      },
      [FileType.EXERCISE_IMAGE]: {
        folder: 'ielts/exercises',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        resource_type: 'image' as const,
      },
      [FileType.COURSE_THUMBNAIL]: {
        folder: 'ielts/courses',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 800, height: 450, crop: 'fill' }],
        resource_type: 'image' as const,
      },
      [FileType.LESSON_MATERIAL]: {
        folder: 'ielts/materials',
        allowed_formats: ['pdf', 'doc', 'docx', 'ppt', 'pptx'],
        resource_type: 'raw' as const,
      },
      [FileType.AUDIO]: {
        folder: 'ielts/audio',
        allowed_formats: ['mp3', 'wav', 'ogg', 'mpeg'],
        resource_type: 'video' as const,
      },
    };

    return {
      ...configs[fileType],
      public_id: `${fileName}_${Date.now()}`,
    };
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    fileType: FileType,
  ): Promise<UploadApiResponse> {
    const config = this.getUploadConfig(fileType, fileName);

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(config, (error, result) => {
          if (error) reject(new Error(error.message));
          else if (result) resolve(result);
          else reject(new Error('Upload failed'));
        })
        .end(fileBuffer);
    });
  }
}
