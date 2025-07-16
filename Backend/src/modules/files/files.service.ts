import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { v2 as cloudinary, ResourceType, UploadApiResponse } from 'cloudinary';
import { FileType } from 'src/common/constants/file';

interface CloudinaryDeleteOptions {
  resource_type?: ResourceType;
  type?: 'upload' | 'private' | 'authenticated';
  invalidate?: boolean;
  keep_original?: boolean;
  next_cursor?: string;
  [key: string]: any;
}

interface FileDeleteResult {
  success: boolean;
  deletedFiles: string[];
  notFoundFiles?: string[];
  errors?: string[];
  raw?: any; // Kết quả gốc từ Cloudinary nếu cần
}

type CloudinaryDeleteResourcesResult = {
  deleted?: Record<string, string>;
  not_found?: string[];
  partial?: boolean;
  [key: string]: any;
};

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
          if (error) {
            // Tạo exception phù hợp dựa trên mã lỗi
            if (error.http_code === 400) {
              reject(new BadRequestException(error.message));
            } else if (error.http_code === 401) {
              reject(
                new UnauthorizedException('Unauthorized Cloudinary access'),
              );
            } else if (error.http_code >= 500) {
              reject(
                new ServiceUnavailableException('Cloudinary service error'),
              );
            } else {
              // Sử dụng InternalServerErrorException để lưu chi tiết lỗi
              const exception = new InternalServerErrorException(
                `Cloudinary upload failed: ${error.message}`,
              );
              exception.cause = error; // Lưu lỗi gốc
              reject(exception);
            }
          } else if (result) {
            resolve(result);
          } else {
            reject(
              new InternalServerErrorException('Upload failed with no result'),
            );
          }
        })
        .end(fileBuffer);
    });
  }

  /**
   * Xóa một hoặc nhiều file khỏi Cloudinary
   * @param publicIds Mảng các public_id hoặc một public_id đơn lẻ cần xóa
   * @param options Tùy chọn xóa (resource_type, invalidate, ...)
   * @returns Kết quả xóa file theo định dạng tùy chỉnh
   */
  async deleteFiles(
    publicIds: string | readonly string[] | null | undefined,
    options?: Omit<CloudinaryDeleteOptions, 'all'>,
  ): Promise<FileDeleteResult> {
    try {
      // Chuẩn hóa đầu vào: đảm bảo publicIds luôn là mảng
      const ids: readonly string[] = Array.isArray(publicIds)
        ? publicIds
        : publicIds
          ? [publicIds]
          : [];

      // Kiểm tra mảng rỗng
      if (ids.length === 0) {
        return {
          success: true,
          deletedFiles: [],
          notFoundFiles: [],
          raw: { deleted: {}, partial: false },
        };
      }

      // Kiểm tra các public_id không hợp lệ với type guard
      const validIds: string[] = ids.filter(
        (id): id is string =>
          id !== null &&
          id !== undefined &&
          typeof id === 'string' &&
          id.trim() !== '',
      );

      if (validIds.length === 0) {
        throw new BadRequestException('Không có public_id hợp lệ để xóa');
      }

      // Cấu hình mặc định với type assertion chính xác
      const defaultOptions: Required<
        Pick<CloudinaryDeleteOptions, 'resource_type' | 'invalidate'>
      > = {
        resource_type: 'auto' as ResourceType,
        invalidate: true,
      };

      // Thực hiện xóa với options được merge đúng cách
      const mergedOptions = { ...defaultOptions, ...options };

      const cloudinaryResult = (await cloudinary.api.delete_resources(
        validIds,
        mergedOptions,
      )) as CloudinaryDeleteResourcesResult;

      // Xử lý kết quả với null-safe operations
      const deleted = cloudinaryResult?.deleted ?? {};
      const deletedFiles = Object.keys(deleted);
      const notFoundFiles = Array.isArray(cloudinaryResult?.not_found)
        ? cloudinaryResult.not_found
        : [];

      // Tạo kết quả với đầy đủ các thuộc tính của interface FileDeleteResult
      return {
        success: deletedFiles.length > 0,
        deletedFiles,
        notFoundFiles,
        ...(deletedFiles.length === 0 && notFoundFiles.length > 0
          ? { errors: ['Files not found on server'] }
          : {}),
        raw: cloudinaryResult,
      };
    } catch (error: unknown) {
      // Xử lý lỗi với narrowing type
      if (error instanceof BadRequestException) {
        throw error; // Re-throw NestJS exceptions directly
      }

      let errorMessage: string;
      let errors: string[] | undefined;

      if (error instanceof Error) {
        errorMessage = error.message;
        errors = [error.message];
      } else if (typeof error === 'object' && error !== null) {
        // Xử lý lỗi từ Cloudinary API
        const cloudinaryError = error as { error?: { message?: string } };
        errorMessage =
          cloudinaryError.error?.message || 'Lỗi không xác định từ Cloudinary';
        errors = [errorMessage];
      } else {
        errorMessage = 'Lỗi không xác định';
        errors = [errorMessage];
      }

      // Có thể trả về error result thay vì throw exception
      if (options?.returnErrors) {
        return {
          success: false,
          deletedFiles: [],
          notFoundFiles: [],
          errors,
          raw: { error: errorMessage },
        };
      }

      throw new BadRequestException(`Không thể xóa files: ${errorMessage}`);
    }
  }
}
