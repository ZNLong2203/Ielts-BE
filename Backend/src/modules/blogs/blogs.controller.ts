import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { MessageResponse } from 'src/decorator/customize';
import { MESSAGE } from 'src/common/message';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Post('/category')
  @MessageResponse(MESSAGE.BLOG.BLOG_CATEGORY_CREATED)
  async createBlogCategory(
    @Body() createBlogCategoryDto: CreateBlogCategoryDto,
  ) {
    return this.blogsService.createBlogCategory(createBlogCategoryDto);
  }

  @Get('/category')
  @MessageResponse(MESSAGE.BLOG.BLOG_CATEGORIES_FETCHED)
  async findAllBlogCategories() {
    return this.blogsService.findAllBlogCategories();
  }

  @Get('/category/:id')
  @MessageResponse(MESSAGE.BLOG.BLOG_FETCHED)
  async findBlogByCategoryId(@Param('id') categoryId: string) {
    return this.blogsService.findBlogByCategoryId(categoryId);
  }

  @Patch('/category/:id')
  @MessageResponse(MESSAGE.BLOG.BLOG_CATEGORY_UPDATED)
  async updateBlogCategory(
    @Param('id') id: string,
    @Body() updateBlogCategoryDto: UpdateBlogCategoryDto,
  ) {
    return this.blogsService.updateBlogCategory(id, updateBlogCategoryDto);
  }

  @Delete('/category/:id')
  @MessageResponse(MESSAGE.BLOG.BLOG_CATEGORY_DELETED)
  async removeBlogCategory(@Param('id') id: string) {
    return this.blogsService.removeBlogCategory(id);
  }

  @Post()
  @MessageResponse(MESSAGE.BLOG.BLOG_CREATED)
  async createBlog(@Body() createBlogDto: CreateBlogDto) {
    return this.blogsService.createBlog(createBlogDto);
  }

  @Get()
  @MessageResponse(MESSAGE.BLOG.BLOGS_FETCHED)
  async findAllBlogs() {
    return this.blogsService.findAllBlogs();
  }

  @Get('/:id')
  @MessageResponse(MESSAGE.BLOG.BLOG_FETCHED)
  async findOneBlog(@Param('id') id: string) {
    return this.blogsService.findOneBlog(id);
  }

  @Patch('/:id')
  @MessageResponse(MESSAGE.BLOG.BLOG_UPDATED)
  async updateBlog(
    @Param('id') id: string,
    @Body() updateBlogDto: UpdateBlogDto,
  ) {
    return this.blogsService.updateBlog(id, updateBlogDto);
  }

  @Delete('/:id')
  @MessageResponse(MESSAGE.BLOG.BLOG_DELETED)
  async removeBlog(@Param('id') id: string) {
    return this.blogsService.removeBlog(id);
  }
}
