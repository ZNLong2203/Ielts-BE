import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import {
  CurrentUser,
  Public,
  SkipCheckPermission,
} from 'src/decorator/customize';
import { IUser } from 'src/interface/users.interface';
import { CreateSectionDto, ReorderSectionsDto } from './dto/create-section.dto';
import { ApiResponseDto, SectionResponseDto } from './dto/section-response.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { SectionsService } from './sections.service';

@ApiTags('Sections')
@Controller('courses/:courseId/sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all sections in a course',
    description:
      'Retrieve all sections within a specific course with pagination',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (starts from 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Field to sort by',
    example: 'ordering',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (asc or desc)',
    example: 'asc',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for section title or description',
    example: 'IELTS',
  })
  @ApiResponse({
    status: 200,
    description: 'Sections retrieved successfully',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginatedResponseDto' },
        {
          properties: {
            result: {
              type: 'array',
              items: { $ref: '#/components/schemas/SectionResponseDto' },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  @Public()
  async findAll(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ): Promise<any> {
    return await this.sectionsService.findAllByCourse(
      courseId,
      query,
      req.query,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new section',
    description: 'Create a new section within a specific course',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: CreateSectionDto })
  @ApiResponse({
    status: 201,
    description: 'Section created successfully',
    type: ApiResponseDto<SectionResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  @Public()
  create(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() createSectionDto: CreateSectionDto,
  ) {
    return this.sectionsService.create(createSectionDto, courseId);
  }

  @Get('progress')
  @ApiOperation({
    summary: 'Get course progress for current user',
    description:
      'Retrieve the progress status of a course for the authenticated user',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Course progress retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found or user not enrolled',
  })
  @SkipCheckPermission()
  async getCourseProgress(
    @CurrentUser() user: IUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return await this.sectionsService.getCourseProgress(user.id, courseId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get section by ID',
    description: 'Retrieve detailed information of a specific section',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Section ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Section retrieved successfully',
    type: ApiResponseDto<SectionResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Section not found',
  })
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.findOne(id);
  }

  @Patch('reorder')
  @ApiOperation({
    summary: 'Reorder sections',
    description: 'Change the order of sections within a course',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: ReorderSectionsDto })
  @ApiResponse({
    status: 200,
    description: 'Sections reordered successfully',
    type: ApiResponseDto<SectionResponseDto[]>,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid ordering data',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  @Public()
  reorder(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() reorderDto: ReorderSectionsDto,
  ) {
    return this.sectionsService.reorder(courseId, reorderDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update section',
    description: 'Update section information and content',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Section ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateSectionDto })
  @ApiResponse({
    status: 200,
    description: 'Section updated successfully',
    type: ApiResponseDto<SectionResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Section not found',
  })
  @Public()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSectionDto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(id, updateSectionDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete section',
    description: 'Permanently delete a section and all its lessons',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Section ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Section deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Section not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete section with existing lessons',
  })
  @Public()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.remove(id);
  }

  @Get(':id/progress')
  @ApiOperation({
    summary: 'Get section progress for current user',
    description:
      'Retrieve the progress status of a section for the authenticated user',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Section ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Section progress retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Section not found',
  })
  @SkipCheckPermission()
  async getSectionProgress(
    @CurrentUser() user: IUser,
    @Param('id', ParseUUIDPipe) sectionId: string,
  ) {
    return await this.sectionsService.getSectionProgress(user.id, sectionId);
  }
}
