import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { User } from 'src/casl/entities';
import {
  canCreateCourse,
  canFeatureCourse,
  canManageCourseCategories,
  canUpdateCourse,
} from 'src/casl/policies/course.policies';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { MESSAGE } from 'src/common/message';
import {
  CheckPolicies,
  CurrentUser,
  MessageResponse,
  SkipCheckPermission,
} from 'src/decorator/customize';
import { UploadedFileType } from 'src/interface/file-type.interface';
import {
  CreateComboCourseDto,
  CreateCourseCategoryDto,
  CreateCourseDto,
  FeatureCourseDto,
} from 'src/modules/courses/dto/create-course.dto';
import {
  UpdateComboCourseDto,
  UpdateCourseCategoryDto,
  UpdateCourseDto,
} from 'src/modules/courses/dto/update-course.dto';
import { CoursesService } from './courses.service';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post('/categories')
  @ApiOperation({ summary: 'Create a course category' })
  @ApiBearerAuth()
  @CheckPolicies(canManageCourseCategories)
  @MessageResponse(MESSAGE.COURSE.CATEGORY_CREATED)
  async createCategory(
    @Body() createCourseCategoryDto: CreateCourseCategoryDto,
  ) {
    return this.coursesService.createCategory(createCourseCategoryDto);
  }

  @Get('/categories')
  @ApiOperation({ summary: 'Get all course categories' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive categories (admin only)',
  })
  @SkipCheckPermission()
  @MessageResponse(MESSAGE.COURSE.CATEGORY_LIST)
  async findAllCategory(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive = false,
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    return this.coursesService.findAllCategory(
      includeInactive,
      query,
      req.query,
    );
  }

  @Get('/categories/course-counts')
  @ApiOperation({ summary: 'Get course count by category' })
  @MessageResponse(MESSAGE.COURSE.CATEGORY_COURSE_COUNT)
  @SkipCheckPermission()
  async getCourseCountByCategory() {
    return this.coursesService.getCourseCountByCategory();
  }

  @Get('/categories/:id')
  @ApiOperation({ summary: 'Get a course category by ID' })
  @MessageResponse(MESSAGE.COURSE.CATEGORY_FETCHED)
  @SkipCheckPermission()
  async findOneCategory(@Param('id') id: string) {
    return this.coursesService.findByIdCategory(id);
  }

  @Patch('/categories/:id')
  @ApiOperation({ summary: 'Update a course category' })
  @ApiBearerAuth()
  @CheckPolicies(canManageCourseCategories)
  @MessageResponse(MESSAGE.COURSE.CATEGORY_UPDATED)
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCourseCategoryDto: UpdateCourseCategoryDto,
  ) {
    return this.coursesService.updateCategory(id, updateCourseCategoryDto);
  }

  @Delete('/categories/:id')
  @ApiOperation({ summary: 'Delete a course category' })
  @ApiBearerAuth()
  @CheckPolicies(canManageCourseCategories)
  @MessageResponse(MESSAGE.COURSE.CATEGORY_DELETED)
  async removeCategory(@Param('id') id: string) {
    return this.coursesService.removeCategory(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a course' })
  @ApiBearerAuth()
  @CheckPolicies(canCreateCourse)
  @MessageResponse(MESSAGE.COURSE.COURSE_CREATED)
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.create(createCourseDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses with filters and pagination' })
  @MessageResponse(MESSAGE.COURSE.COURSE_LIST)
  @SkipCheckPermission()
  async findAll(@Query() query: PaginationQueryDto, @Req() req: Request) {
    return this.coursesService.findAll(query, req.query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured courses' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @SkipCheckPermission()
  @MessageResponse(MESSAGE.COURSE.COURSE_FEATURED)
  async getFeaturedCourses(@Query('limit') limit?: number) {
    return this.coursesService.getFeaturedCourses(limit);
  }

  @Get('newest')
  @ApiOperation({ summary: 'Get newest courses' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @SkipCheckPermission()
  @MessageResponse(MESSAGE.COURSE.COURSE_NEWEST)
  async getNewestCourses(@Query('limit') limit?: number) {
    return this.coursesService.getNewestCourses(limit);
  }

  @Get('teacher/:teacherId')
  @ApiOperation({ summary: 'Get courses by teacher ID' })
  @MessageResponse(MESSAGE.COURSE.COURSE_LIST)
  @SkipCheckPermission()
  async getTeacherCourses(
    @Param('teacherId') teacherId: string,
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    return this.coursesService.getTeacherCourses(teacherId, query, req.query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiQuery({
    name: 'includeUnpublished',
    required: false,
    type: Boolean,
    description: 'Include unpublished courses (for author or admin)',
  })
  @SkipCheckPermission()
  @MessageResponse(MESSAGE.COURSE.COURSE_FETCHED)
  async findOne(
    @Param('id') id: string,
    @Query('includeUnpublished', new ParseBoolPipe({ optional: true }))
    includeUnpublished = false,
  ) {
    return this.coursesService.findById(id, includeUnpublished);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a course' })
  @ApiBearerAuth()
  @CheckPolicies(canUpdateCourse)
  @MessageResponse(MESSAGE.COURSE.COURSE_UPDATED)
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a course' })
  @ApiBearerAuth()
  @CheckPolicies(canUpdateCourse)
  @MessageResponse(MESSAGE.COURSE.COURSE_DELETED)
  async remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }

  @Patch(':id/feature')
  @ApiOperation({ summary: 'Feature or unfeature a course (admin only)' })
  @ApiBearerAuth()
  @CheckPolicies(canFeatureCourse)
  @MessageResponse(MESSAGE.COURSE.COURSE_FEATURED_UPDATED)
  async featureCourse(@Param('id') id: string, @Body() dto: FeatureCourseDto) {
    return this.coursesService.featureCourse(id, dto.is_featured);
  }

  @Post(':id/thumbnail')
  @ApiOperation({ summary: 'Upload course thumbnail' })
  @ApiBearerAuth()
  @CheckPolicies(canUpdateCourse)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
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
  @MessageResponse(MESSAGE.COURSE.THUMBNAIL_UPLOAD_SUCCESS)
  async uploadThumbnail(
    @Param('id') id: string,
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
    return this.coursesService.uploadThumbnail(id, file);
  }

  @Post('combo')
  @ApiOperation({ summary: 'Create a combo course' })
  @ApiBearerAuth()
  @CheckPolicies(canCreateCourse)
  @MessageResponse(MESSAGE.COURSE.COMBO_COURSE_CREATED)
  async createComboCourse(
    @Body() createComboCourseDto: CreateComboCourseDto,
    @CurrentUser() user: User,
  ) {
    return this.coursesService.createComboCourse(createComboCourseDto);
  }

  @Get('combo')
  @ApiOperation({ summary: 'Get all combo courses' })
  @MessageResponse(MESSAGE.COURSE.COMBO_COURSE_LIST)
  @SkipCheckPermission()
  async findAllComboCourses(
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    return this.coursesService.findAllComboCourses(query, req.query);
  }

  @Get('combo/:id')
  @ApiOperation({ summary: 'Get a combo course by ID' })
  @SkipCheckPermission()
  @MessageResponse(MESSAGE.COURSE.COMBO_COURSE_FETCHED)
  async findOneComboCourse(@Param('id') id: string) {
    return this.coursesService.findComboCourseById(id);
  }

  @Patch('combo/:id')
  @ApiOperation({ summary: 'Update a combo course' })
  @ApiBearerAuth()
  @CheckPolicies(canUpdateCourse)
  @MessageResponse(MESSAGE.COURSE.COMBO_COURSE_UPDATED)
  async updateComboCourse(
    @Param('id') id: string,
    @Body() updateComboCourseDto: UpdateComboCourseDto,
  ) {
    return this.coursesService.updateComboCourse(id, updateComboCourseDto);
  }

  @Delete('combo/:id')
  @ApiOperation({ summary: 'Delete a combo course' })
  @ApiBearerAuth()
  @CheckPolicies(canUpdateCourse)
  @MessageResponse(MESSAGE.COURSE.COMBO_COURSE_DELETED)
  async removeComboCourse(@Param('id') id: string) {
    return this.coursesService.removeComboCourse(id);
  }

  @Post('combo/:id/thumbnail')
  @ApiOperation({ summary: 'Upload combo course thumbnail' })
  @ApiBearerAuth()
  @CheckPolicies(canUpdateCourse)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
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
  @MessageResponse(MESSAGE.COURSE.THUMBNAIL_UPLOAD_SUCCESS)
  async uploadComboThumbnail(
    @Param('id') id: string,
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
    return this.coursesService.uploadComboThumbnail(id, file);
  }
}
