import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { canUpdateTeacherCertification } from 'src/casl/policies/teacher.policies';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { MESSAGE } from 'src/common/message';
import {
  CheckPolicies,
  MessageResponse,
  Public,
} from 'src/decorator/customize';
import {
  UpdateAvailabilityDto,
  UpdateTeacherDto,
  UpdateTeacherStatusDto,
} from 'src/modules/teachers/dto/update-teacher.dto';
import { TeachersService } from './teachers.service';
import { UploadedFileType } from 'src/interface/file-type.interface';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @ApiOperation({
    summary: 'Get all teachers',
    description: 'Retrieve a paginated list of all teachers.',
  })
  @Public()
  @MessageResponse(MESSAGE.TEACHER.TEACHER_LIST)
  @Get()
  findAll(@Query() query: PaginationQueryDto, @Req() req: Request) {
    return this.teachersService.findAll(query, req.query);
  }

  @ApiOperation({
    summary: 'Get all pending teachers',
    description: 'Retrieve a paginated list of all pending teachers.',
  })
  @Public()
  @MessageResponse(MESSAGE.TEACHER.NEW_TEACHERS_LIST)
  @Get('pending')
  findNewTeachers(@Query() query: PaginationQueryDto, @Req() req: Request) {
    return this.teachersService.findNewTeachers(query, req.query);
  }

  @ApiOperation({
    summary: 'Get a teacher by ID',
    description: 'Retrieve a teacher by their unique ID.',
  })
  @Public()
  @MessageResponse(MESSAGE.TEACHER.TEACHER_INFO)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update a detail of a teacher',
    description: 'Update teacher information by their unique ID (user id).',
  })
  @ApiBody({ type: UpdateTeacherDto })
  @Public()
  @MessageResponse(MESSAGE.TEACHER.TEACHER_UPDATE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeacherDto: UpdateTeacherDto) {
    return this.teachersService.update(id, updateTeacherDto);
  }

  @ApiOperation({
    summary: 'Update a teacher status',
    description: 'Update the status of a teacher account.',
  })
  @ApiBody({ type: UpdateTeacherStatusDto })
  @Public()
  @MessageResponse(MESSAGE.TEACHER.TEACHER_STATUS_UPDATE)
  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateTeacherStatusDto: UpdateTeacherStatusDto,
  ) {
    return this.teachersService.updateStatus(id, updateTeacherStatusDto);
  }

  @ApiOperation({
    summary: 'Schedule availability for a teacher',
    description: 'Update the availability schedule of a teacher.',
  })
  @ApiBody({ type: UpdateAvailabilityDto })
  @Public()
  @MessageResponse(MESSAGE.TEACHER.TEACHER_AVAILABILITY_UPDATE)
  @Patch(':id/availability')
  scheduleAvailability(
    @Param('id') id: string,
    @Body() availabilityDto: UpdateAvailabilityDto,
  ) {
    return this.teachersService.scheduleAvailability(id, availabilityDto);
  }

  @ApiOperation({
    summary: 'Update teacher certification',
    description: 'Update the certification details of a teacher.',
  })
  @ApiBody({
    type: 'multipart/form-data',
    description: 'Teacher certification file (image or PDF)',
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
  @Public()
  @MessageResponse(MESSAGE.TEACHER.TEACHER_CERTIFICATION_UPDATE)
  @Patch(':id/certificate')
  @UseInterceptors(FileInterceptor('file'))
  @CheckPolicies(canUpdateTeacherCertification)
  async uploadCertificate(
    @Param('id') id: string,
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
    return this.teachersService.updateCertificate(id, file);
  }
}
