import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import {
  BlogResponseDto,
  BlogCategoryResponseDto,
  ApiResponseDto,
} from './dto/blog-response.dto';
import { MessageResponse, Public, CurrentUser } from 'src/decorator/customize';
import { MESSAGE } from 'src/common/message';
import { IUser } from 'src/interface/users.interface';
// import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@ApiTags('Blogs')
@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  // PUBLIC APIs
  @Public()
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
  @Get('/category/:id')
  @ApiOperation({
    summary: 'Get published blogs by category',
    description:
      'Retrieve all published blogs belonging to a specific category',
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
    description: 'Blogs retrieved successfully',
    type: ApiResponseDto<BlogResponseDto[]>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOG_FETCHED)
  async findBlogByCategoryId(@Param('id') categoryId: string) {
    return this.blogsService.findPublishedBlogsByCategory(categoryId);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get all published blogs',
    description: 'Retrieve all published blogs for public viewing',
  })
  @ApiResponse({
    status: 200,
    description: 'Published blogs retrieved successfully',
    type: ApiResponseDto<BlogResponseDto[]>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findAllPublishedBlogs() {
    return this.blogsService.findAllPublishedBlogs();
  }

  @Public()
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
  @Post('/teacher')
  @ApiOperation({
    summary: 'Create a new blog (Teacher)',
    description:
      'Create a new blog as a teacher. Blog will be created with draft status.',
  })
  @ApiBody({ type: CreateBlogDto })
  @ApiResponse({
    status: 201,
    description: 'Blog created successfully',
    type: ApiResponseDto<BlogResponseDto>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOG_CREATED)
  async createTeacherBlog(
    @Body() createBlogDto: CreateBlogDto,
    @CurrentUser() user: IUser,
  ) {
    return this.blogsService.createTeacherBlog(createBlogDto, user.id);
  }

  @ApiBearerAuth()
  @Get('/teacher')
  @ApiOperation({
    summary: 'Get all teacher blogs',
    description:
      'Retrieve all blogs created by the current teacher (all statuses)',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher blogs retrieved successfully',
    type: ApiResponseDto<BlogResponseDto[]>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findAllTeacherBlogs(@CurrentUser() user: IUser) {
    return this.blogsService.findAllTeacherBlogs(user.id);
  }

  @ApiBearerAuth()
  @Get('/teacher/detail/:id')
  @ApiOperation({
    summary: 'Get teacher blog details',
    description:
      'Retrieve detailed information of a specific blog owned by the teacher',
  })
  @ApiParam({ name: 'id', description: 'Blog ID', type: 'string' })
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
  @Patch('/teacher/:id')
  @ApiOperation({
    summary: 'Update teacher blog',
    description:
      'Update a blog owned by the teacher. Can only edit draft or archived blogs.',
  })
  @ApiParam({ name: 'id', description: 'Blog ID', type: 'string' })
  @ApiBody({ type: UpdateBlogDto })
  @ApiResponse({
    status: 200,
    description: 'Blog updated successfully',
    type: ApiResponseDto<BlogResponseDto>,
  })
  @MessageResponse(MESSAGE.BLOG.BLOG_UPDATED)
  async updateTeacherBlog(
    @Param('id') id: string,
    @Body() updateBlogDto: UpdateBlogDto,
    @CurrentUser() user: IUser,
  ) {
    return this.blogsService.updateTeacherBlog(id, updateBlogDto, user.id);
  }

  @ApiBearerAuth()
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
  @Post('/admin/category')
  @ApiOperation({
    summary: 'Create blog category (Admin)',
    description: 'Create a new blog category',
  })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @MessageResponse(MESSAGE.BLOG.BLOG_CATEGORY_CREATED)
  async createBlogCategory(
    @Body() createBlogCategoryDto: CreateBlogCategoryDto,
  ) {
    return this.blogsService.createBlogCategory(createBlogCategoryDto);
  }

  @ApiBearerAuth()
  @Patch('/admin/category/:id')
  @ApiOperation({
    summary: 'Update blog category (Admin)',
    description: 'Update an existing blog category',
  })
  @ApiParam({ name: 'id', description: 'Category ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @MessageResponse(MESSAGE.BLOG.BLOG_CATEGORY_UPDATED)
  async updateBlogCategory(
    @Param('id') id: string,
    @Body() updateBlogCategoryDto: UpdateBlogCategoryDto,
  ) {
    return this.blogsService.updateBlogCategory(id, updateBlogCategoryDto);
  }

  @ApiBearerAuth()
  @Delete('/admin/category/:id')
  @ApiOperation({
    summary: 'Delete blog category (Admin)',
    description: 'Delete a blog category',
  })
  @ApiParam({ name: 'id', description: 'Category ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @MessageResponse(MESSAGE.BLOG.BLOG_CATEGORY_DELETED)
  async removeBlogCategory(@Param('id') id: string) {
    return this.blogsService.removeBlogCategory(id);
  }

  // Blog Management APIs
  @ApiBearerAuth()
  @Get('/admin')
  @ApiOperation({
    summary: 'Get all blogs (Admin)',
    description: 'Retrieve all blogs with any status for admin management',
  })
  @ApiResponse({ status: 200, description: 'All blogs retrieved successfully' })
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findAllBlogsForAdmin() {
    return this.blogsService.findAllBlogsForAdmin();
  }

  @ApiBearerAuth()
  @Get('/admin/draft')
  @ApiOperation({
    summary: 'Get draft blogs (Admin)',
    description: 'Retrieve all blogs with draft status',
  })
  @ApiResponse({
    status: 200,
    description: 'Draft blogs retrieved successfully',
  })
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findDraftBlogs() {
    return this.blogsService.findBlogsByStatus('draft');
  }

  @ApiBearerAuth()
  @Get('/admin/published')
  @ApiOperation({
    summary: 'Get published blogs (Admin)',
    description: 'Retrieve all blogs with published status',
  })
  @ApiResponse({
    status: 200,
    description: 'Published blogs retrieved successfully',
  })
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findPublishedBlogs() {
    return this.blogsService.findBlogsByStatus('published');
  }

  @ApiBearerAuth()
  @Get('/admin/archived')
  @ApiOperation({
    summary: 'Get archived blogs (Admin)',
    description: 'Retrieve all blogs with archived status',
  })
  @ApiResponse({
    status: 200,
    description: 'Archived blogs retrieved successfully',
  })
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findArchivedBlogs() {
    return this.blogsService.findBlogsByStatus('archived');
  }

  @ApiBearerAuth()
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
