import {
  BadRequestException,
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileType } from 'src/common/constants';
import { MESSAGE } from 'src/common/message';
import { FilesService } from './files.service';
import { SkipCheckPermission } from 'src/decorator/customize';
import { UploadedFileType } from 'src/interface/file-type.interface';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload/avatar')
  @SkipCheckPermission()
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Avatar image file',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'image/jpeg|image/png|image/jpg',
        })
        .addMaxSizeValidator({
          maxSize: 2 * 1024 * 1024, // 2MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: UploadedFileType,
  ) {
    const fileData = await this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      FileType.USER_AVATAR,
      file.mimetype,
    );

    return {
      message: MESSAGE.FILES.FILE_USER_AVATAR_UPLOADED,
      data: {
        url: fileData.url,
        fileName: fileData.fileName,
        etag: fileData.etag,
      },
    };
  }

  @Post('upload/certificate')
  @SkipCheckPermission()
  @ApiOperation({ summary: 'Upload teacher certificate (image or PDF)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Certificate file (image or PDF)',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCertificate(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'image/jpeg|image/png|image/jpg|application/pdf',
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024, // 5MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: UploadedFileType,
  ) {
    const fileData = await this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      FileType.TEACHER_CERTIFICATE,
      file.mimetype,
    );

    return {
      message: MESSAGE.FILES.FILE_CERTIFICATE_UPLOADED,
      data: {
        url: fileData.url,
        fileName: fileData.fileName,
        etag: fileData.etag,
      },
    };
  }

  @Post('upload/blog-image')
  @SkipCheckPermission()
  @ApiOperation({ summary: 'Upload blog image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Blog image file',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadBlogImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'image/jpeg|image/png|image/jpg|image/gif|image/webp',
        })
        .addMaxSizeValidator({
          maxSize: 3 * 1024 * 1024, // 3MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: UploadedFileType,
  ) {
    const fileData = await this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      FileType.BLOG_IMAGE,
      file.mimetype,
    );

    return {
      message: MESSAGE.FILES.FILE_BLOG_IMAGE_UPLOADED,
      data: {
        url: fileData.url,
        fileName: fileData.fileName,
        etag: fileData.etag,
      },
    };
  }

  @Post('upload/exercise-image')
  @SkipCheckPermission()
  @ApiOperation({ summary: 'Upload exercise image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Exercise image file',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadExerciseImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'image/jpeg|image/png|image/jpg|image/gif|image/webp',
        })
        .addMaxSizeValidator({
          maxSize: 2 * 1024 * 1024, // 2MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: UploadedFileType,
  ) {
    const fileData = await this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      FileType.EXERCISE_IMAGE,
      file.mimetype,
    );

    return {
      message: MESSAGE.FILES.FILE_EXERCISE_IMAGE_UPLOADED,
      data: {
        url: fileData.url,
        fileName: fileData.fileName,
        etag: fileData.etag,
      },
    };
  }

  @Post('upload/course-thumbnail')
  @SkipCheckPermission()
  @ApiOperation({ summary: 'Upload course thumbnail' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Course thumbnail image file',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCourseThumbnail(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'image/jpeg|image/png|image/jpg|image/webp',
        })
        .addMaxSizeValidator({
          maxSize: 3 * 1024 * 1024, // 3MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: UploadedFileType,
  ) {
    const fileData = await this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      FileType.COURSE_THUMBNAIL,
      file.mimetype,
    );

    return {
      message: MESSAGE.FILES.FILE_COURSE_THUMBNAIL_UPLOADED,
      data: {
        url: fileData.url,
        fileName: fileData.fileName,
        etag: fileData.etag,
      },
    };
  }

  @Post('upload/lesson-material')
  @SkipCheckPermission()
  @ApiOperation({ summary: 'Upload lesson material (PDF, doc, etc.)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Lesson material file',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadLessonMaterial(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            'application/pdf|application/msword|application/vnd.openxmlformats-officedocument.wordprocessingml.document|application/vnd.ms-powerpoint|application/vnd.openxmlformats-officedocument.presentationml.presentation',
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024, // 10MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: UploadedFileType,
  ) {
    const fileData = await this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      FileType.LESSON_MATERIAL,
      file.mimetype,
    );

    return {
      message: MESSAGE.FILES.FILE_LESSON_MATERIAL_UPLOADED,
      data: {
        url: fileData.url,
        fileName: fileData.fileName,
        etag: fileData.etag,
      },
    };
  }

  @Post('upload/audio')
  @SkipCheckPermission()
  @ApiOperation({ summary: 'Upload audio file for lessons/exercises' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Audio file',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudio(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 50 * 1024 * 1024, // 50MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: UploadedFileType,
  ) {
    // Validate file type - MulterModule already filters, but double-check for safety
    const allowedTypes = [
      'audio/mpeg',
      'audio/wav',
      'audio/mp3',
      'audio/ogg',
      'audio/m4a',
      'audio/webm',
      'audio/x-m4a',
      'audio/x-wav',
    ];
    
    // Normalize mimetype (remove charset, etc.)
    const normalizedMimeType = file.mimetype.split(';')[0].trim().toLowerCase();
    
    if (!allowedTypes.includes(normalizedMimeType)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }
    const fileData = await this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      FileType.AUDIO,
      file.mimetype,
    );

    return {
      message: MESSAGE.FILES.FILE_AUDIO_UPLOADED,
      data: {
        url: fileData.url,
        fileName: fileData.fileName,
        etag: fileData.etag,
      },
    };
  }
}
