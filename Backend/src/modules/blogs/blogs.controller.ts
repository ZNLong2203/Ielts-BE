import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Blog, BlogCategory } from 'src/casl/entities';
import { Action } from 'src/casl/enums/action.enum';
import { PermissionGuard } from '../../casl/guards/permission.guard';
import { MESSAGE } from '../../common/message';
import {
  CheckPolicies,
  CurrentUser,
  MessageResponse,
  Public,
  SkipCheckPermission,
} from '../../decorator/customize';
import { IUser } from '../../interface/users.interface';
import { BlogsService } from './blogs.service';
import {
  ApiResponseDto,
  BlogCategoryResponseDto,
  BlogResponseDto,
} from './dto/blog-response.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { CreateBlogWithFileDto } from './dto/create-blog-with-file.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { UpdateBlogWithFileDto } from './dto/update-blog-with-file.dto';
import { UploadedFileType } from 'src/interface/file-type.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@ApiTags('Blogs')
@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  // PUBLIC APIs
  @Public()
  @SkipCheckPermission()
  @Get('/category')
  @ApiOperation({
    summary: 'Get all blog categories',
    description: 'Retrieve all available blog categories for public use',
  })
  @ApiResponse({
    status: 200,
    description: 'Blog categories retrieved successfully',
    type: ApiResponseDto<BlogCategoryResponseDto[]>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOG_CATEGORIES_FETCHED)
  async findAllBlogCategories() {
    return this.blogsService.findAllBlogCategories();
  }

  @Public()
  @SkipCheckPermission()
  @Get('/category/:id')
  @ApiOperation({
    summary: 'Get published blogs by category',
    description:
      'Retrieve all published blogs belonging to a specific category with pagination',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
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
    example: 'created_at',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (asc or desc)',
    example: 'desc',
  })
  @ApiResponse({
    status: 200,
    description: 'Blogs retrieved successfully',
    type: ApiResponseDto<BlogResponseDto[]>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOG_FETCHED)
  async findBlogByCategoryId(
    @Param('id') categoryId: string,
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    return this.blogsService.findPublishedBlogsByCategory(
      categoryId,
      query,
      req.query,
    );
  }

  @Public()
  @SkipCheckPermission()
  @Get()
  @ApiOperation({
    summary: 'Get all published blogs',
    description:
      'Retrieve all published blogs for public viewing with pagination',
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
    example: 'created_at',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (asc or desc)',
    example: 'desc',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for blog title or content',
    example: 'IELTS',
  })
  @ApiResponse({
    status: 200,
    description: 'Published blogs retrieved successfully',
    type: ApiResponseDto<BlogResponseDto[]>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findAllPublishedBlogs(
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    return this.blogsService.findAllPublishedBlogs(query, req.query);
  }

  @Public()
  @SkipCheckPermission()
  @Get('/detail/:id')
  @ApiOperation({
    summary: 'Get published blog details',
    description: 'Retrieve detailed information of a specific published blog',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Blog details retrieved successfully',
    type: ApiResponseDto<BlogResponseDto>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOG_FETCHED)
  async findPublishedBlogDetail(@Param('id') id: string) {
    return this.blogsService.findPublishedBlogDetail(id);
  }

  // TEACHER APIs
  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Create, Blog))
  @Post('/teacher')
  @ApiOperation({
    summary: 'Create a new blog (Teacher)',
    description:
      'Create a new blog as a teacher. Blog will be created with draft status.',
  })
  @ApiBody({ type: CreateBlogWithFileDto })
  @ApiResponse({
    status: 201,
    description: 'Blog created successfully',
    type: ApiResponseDto<BlogResponseDto>,
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @MessageResponse(MESSAGE.BLOG.BLOG_CREATED)
  async createTeacherBlog(
    @Body() createBlogDto: CreateBlogDto,
    @CurrentUser() user: IUser,
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
    return this.blogsService.createTeacherBlog(createBlogDto, user.id, file);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Read, Blog))
  @Get('/teacher/:id')
  @ApiOperation({
    summary: 'Get all teacher blogs',
    description:
      'Retrieve all blogs created by the specified teacher (all statuses) with pagination',
  })
  @ApiParam({
    name: 'id',
    description: 'Teacher ID',
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
    example: 'created_at',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (asc or desc)',
    example: 'desc',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by blog status (draft, published, archived)',
    example: 'published',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher blogs retrieved successfully',
    type: ApiResponseDto<BlogResponseDto[]>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findAllTeacherBlogs(
    @Param('id') teacherId: string,
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    return this.blogsService.findAllTeacherBlogs(teacherId, query, req.query);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Read, Blog))
  @Get('/teacher/detail/:id')
  @ApiOperation({
    summary: 'Get teacher blog details',
    description:
      'Retrieve detailed information of a specific blog owned by the teacher',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Blog details retrieved successfully',
    type: ApiResponseDto<BlogResponseDto>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOG_FETCHED)
  async findTeacherBlogDetail(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.blogsService.findTeacherBlogDetail(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Update, Blog))
  @Patch('/teacher/:id')
  @ApiOperation({
    summary: 'Update teacher blog',
    description:
      'Update a blog owned by the teacher. Can only edit draft or archived blogs.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateBlogWithFileDto })
  @ApiResponse({
    status: 200,
    description: 'Blog updated successfully',
    type: ApiResponseDto<BlogResponseDto>,
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @MessageResponse(MESSAGE.BLOG.BLOG_UPDATED)
  async updateTeacherBlog(
    @Param('id') id: string,
    @Body() updateBlogDto: UpdateBlogDto,
    @CurrentUser() user: IUser,
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
    return this.blogsService.updateTeacherBlog(
      id,
      updateBlogDto,
      user.id,
      file,
    );
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Delete, Blog))
  @Delete('/teacher/:id')
  @ApiOperation({
    summary: 'Delete teacher blog',
    description: 'Delete a blog owned by the teacher',
  })
  @ApiParam({ name: 'id', description: 'Blog ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Blog deleted successfully' })
  @MessageResponse(MESSAGE.BLOG.BLOG_DELETED)
  async deleteTeacherBlog(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.blogsService.deleteTeacherBlog(id, user.id);
  }

  // ADMIN APIs
  // Category Management APIs
  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Create, BlogCategory))
  @Post('/admin/category')
  @ApiOperation({
    summary: 'Create blog category (Admin)',
    description: 'Create a new blog category for organizing blogs',
  })
  @ApiBody({ type: CreateBlogCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: ApiResponseDto<BlogCategoryResponseDto>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOG_CATEGORY_CREATED)
  async createBlogCategory(
    @Body() createBlogCategoryDto: CreateBlogCategoryDto,
  ) {
    return this.blogsService.createBlogCategory(createBlogCategoryDto);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Update, BlogCategory))
  @Patch('/admin/category/:id')
  @ApiOperation({
    summary: 'Update blog category (Admin)',
    description: 'Update an existing blog category',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateBlogCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: ApiResponseDto<BlogCategoryResponseDto>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOG_CATEGORY_UPDATED)
  async updateBlogCategory(
    @Param('id') id: string,
    @Body() updateBlogCategoryDto: UpdateBlogCategoryDto,
  ) {
    return this.blogsService.updateBlogCategory(id, updateBlogCategoryDto);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Delete, BlogCategory))
  @Delete('/admin/category/:id')
  @ApiOperation({
    summary: 'Delete blog category (Admin)',
    description: 'Delete a blog category',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
  })
  @MessageResponse(MESSAGE.BLOG.BLOG_CATEGORY_DELETED)
  async removeBlogCategory(@Param('id') id: string) {
    return this.blogsService.removeBlogCategory(id);
  }

  // Blog Management APIs
  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, Blog))
  @Get('/admin')
  @ApiOperation({
    summary: 'Get all blogs (Admin)',
    description:
      'Retrieve all blogs with any status for admin management with pagination',
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
    example: 'created_at',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (asc or desc)',
    example: 'desc',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by blog status (draft, published, archived)',
    example: 'published',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for blog title or content',
    example: 'IELTS',
  })
  @ApiQuery({
    name: 'author_id',
    required: false,
    type: String,
    description: 'Filter by author/teacher ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'All blogs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        meta: {
          type: 'object',
          properties: {
            current: { type: 'number', example: 1 },
            currentSize: { type: 'number', example: 10 },
            pageSize: { type: 'number', example: 10 },
            total: { type: 'number', example: 100 },
            pages: { type: 'number', example: 10 },
          },
        },
        result: {
          type: 'array',
          items: { $ref: '#/components/schemas/BlogResponseDto' },
        },
      },
    },
  })
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findAllBlogsForAdmin(
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    return this.blogsService.findAllBlogsForAdmin(query, req.query);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, Blog))
  @Get('/admin/draft')
  @ApiOperation({
    summary: 'Get draft blogs (Admin)',
    description: 'Retrieve all blogs with draft status with pagination',
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
    example: 'created_at',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (asc or desc)',
    example: 'desc',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for blog title or content',
    example: 'IELTS',
  })
  @ApiQuery({
    name: 'author_id',
    required: false,
    type: String,
    description: 'Filter by author/teacher ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Draft blogs retrieved successfully',
  })
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findDraftBlogs(
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    return this.blogsService.findBlogsByStatus('draft', query, req.query);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, Blog))
  @Get('/admin/published')
  @ApiOperation({
    summary: 'Get published blogs (Admin)',
    description: 'Retrieve all blogs with published status with pagination',
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
    example: 'created_at',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (asc or desc)',
    example: 'desc',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for blog title or content',
    example: 'IELTS',
  })
  @ApiQuery({
    name: 'author_id',
    required: false,
    type: String,
    description: 'Filter by author/teacher ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Published blogs retrieved successfully',
  })
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findPublishedBlogs(
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    return this.blogsService.findBlogsByStatus('published', query, req.query);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, Blog))
  @Get('/admin/archived')
  @ApiOperation({
    summary: 'Get archived blogs (Admin)',
    description: 'Retrieve all blogs with archived status with pagination',
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
    example: 'created_at',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (asc or desc)',
    example: 'desc',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for blog title or content',
    example: 'IELTS',
  })
  @ApiQuery({
    name: 'author_id',
    required: false,
    type: String,
    description: 'Filter by author/teacher ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Archived blogs retrieved successfully',
  })
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findArchivedBlogs(
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    return this.blogsService.findBlogsByStatus('archived', query, req.query);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, Blog))
  @Get('/admin/detail/:id')
  @ApiOperation({
    summary: 'Get blog details (Admin)',
    description:
      'Retrieve detailed information of any blog for admin management',
  })
  @ApiParam({ name: 'id', description: 'Blog ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Blog details retrieved successfully',
  })
  @MessageResponse(MESSAGE.BLOG.BLOG_FETCHED)
  async findBlogDetailForAdmin(@Param('id') id: string) {
    return this.blogsService.findBlogDetailForAdmin(id);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, Blog))
  @Patch('/admin/:id/publish')
  @ApiOperation({
    summary: 'Publish blog (Admin)',
    description: 'Publish a draft blog for public viewing',
  })
  @ApiParam({ name: 'id', description: 'Blog ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Blog published successfully' })
  @MessageResponse(MESSAGE.BLOG.BLOG_UPDATED)
  async publishBlog(@Param('id') id: string) {
    return this.blogsService.updateBlogStatus(id, 'published');
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, Blog))
  @Patch('/admin/:id/archive')
  @ApiOperation({
    summary: 'Archive blog (Admin)',
    description: 'Archive a published blog to remove it from public view',
  })
  @ApiParam({ name: 'id', description: 'Blog ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Blog archived successfully' })
  @MessageResponse(MESSAGE.BLOG.BLOG_UPDATED)
  async archiveBlog(@Param('id') id: string) {
    return this.blogsService.updateBlogStatus(id, 'archived');
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, Blog))
  @Patch('/admin/:id/draft')
  @ApiOperation({
    summary: 'Set blog to draft (Admin)',
    description: 'Move a blog back to draft status',
  })
  @ApiParam({ name: 'id', description: 'Blog ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Blog moved to draft successfully' })
  @MessageResponse(MESSAGE.BLOG.BLOG_UPDATED)
  async draftBlog(@Param('id') id: string) {
    return this.blogsService.updateBlogStatus(id, 'draft');
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, Blog))
  @Patch('/admin/:id')
  @ApiOperation({
    summary: 'Update blog (Admin)',
    description: 'Update any blog content as admin',
  })
  @ApiParam({ name: 'id', description: 'Blog ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Blog updated successfully' })
  @MessageResponse(MESSAGE.BLOG.BLOG_UPDATED)
  async updateBlogByAdmin(
    @Param('id') id: string,
    @Body() updateBlogDto: UpdateBlogDto,
  ) {
    return this.blogsService.updateBlogByAdmin(id, updateBlogDto);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, Blog))
  @Delete('/admin/:id')
  @ApiOperation({
    summary: 'Delete blog (Admin)',
    description: 'Permanently delete any blog as admin',
  })
  @ApiParam({ name: 'id', description: 'Blog ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Blog deleted successfully' })
  @MessageResponse(MESSAGE.BLOG.BLOG_DELETED)
  async deleteBlogByAdmin(@Param('id') id: string) {
    return this.blogsService.deleteBlogByAdmin(id);
  }
}
