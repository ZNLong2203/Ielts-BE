import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileType } from 'src/common/constants';
import {
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { MESSAGE } from 'src/common/message';

interface UploadedFileType {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload/avatar')
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
    );

    return {
      message: MESSAGE.FILES.FILE_USER_AVATAR_UPLOADED,
      data: {
        url: fileData.secure_url,
        publicId: fileData.public_id,
      },
    };
  }

  @Post('upload/certificate')
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
    );

    return {
      message: MESSAGE.FILES.FILE_CERTIFICATE_UPLOADED,
      data: {
        url: fileData.secure_url,
        publicId: fileData.public_id,
      },
    };
  }

  @Post('upload/blog-image')
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
    );

    return {
      message: MESSAGE.FILES.FILE_BLOG_IMAGE_UPLOADED,
      data: {
        url: fileData.secure_url,
        publicId: fileData.public_id,
      },
    };
  }

  @Post('upload/exercise-image')
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
    );

    return {
      message: MESSAGE.FILES.FILE_EXERCISE_IMAGE_UPLOADED,
      data: {
        url: fileData.secure_url,
        publicId: fileData.public_id,
      },
    };
  }

  @Post('upload/course-thumbnail')
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
    );

    return {
      message: MESSAGE.FILES.FILE_COURSE_THUMBNAIL_UPLOADED,
      data: {
        url: fileData.secure_url,
        publicId: fileData.public_id,
      },
    };
  }

  @Post('upload/lesson-material')
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
    );

    return {
      message: MESSAGE.FILES.FILE_LESSON_MATERIAL_UPLOADED,
      data: {
        url: fileData.secure_url,
        publicId: fileData.public_id,
      },
    };
  }

  @Post('upload/audio')
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
        .addFileTypeValidator({
          fileType: 'audio/mpeg|audio/wav|audio/mp3|audio/ogg',
        })
        .addMaxSizeValidator({
          maxSize: 20 * 1024 * 1024, // 20MB
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
      FileType.AUDIO,
    );

    return {
      message: MESSAGE.FILES.FILE_AUDIO_UPLOADED,
      data: {
        url: fileData.secure_url,
        publicId: fileData.public_id,
      },
    };
  }
}
