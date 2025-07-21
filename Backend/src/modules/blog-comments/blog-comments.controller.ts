import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BlogComment } from 'src/casl/entities';
import { Action } from 'src/casl/enums/action.enum';
import { PermissionGuard } from 'src/casl/guards/permission.guard';
import { MESSAGE } from 'src/common/message';
import {
  CheckPolicies,
  CurrentUser,
  MessageResponse,
} from 'src/decorator/customize';
import { IUser } from 'src/interface/users.interface';
import { BlogCommentsService } from './blog-comments.service';
import {
  BlogCommentApiResponseDto,
  BlogCommentListResponseDto,
  BlogCommentResponseDto,
} from './dto/blog-comment-response.dto';
import { CreateBlogCommentDto } from './dto/create-blog-comment.dto';

@ApiTags('Blog Comments')
@Controller('blog-comments')
export class BlogCommentsController {
  constructor(private readonly blogCommentsService: BlogCommentsService) {}

  @Post(':blog_id/comments')
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Create, BlogComment))
  @ApiOperation({ summary: 'Create a new comment on a blog post' })
  @ApiParam({ name: 'blog_id', description: 'ID of the blog post' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: BlogCommentApiResponseDto<BlogCommentResponseDto>,
  })
  @ApiBearerAuth()
  @MessageResponse(MESSAGE.BLOG_COMMENT.COMMENT_ADDED)
  async createBlogComment(
    @Body() createBlogCommentDto: CreateBlogCommentDto,
    @Param('blog_id') blog_id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.blogCommentsService.createBlogComment(
      createBlogCommentDto,
      blog_id,
      user.id,
    );
  }

  @Post(':blog_id/comments/:comment_id')
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Create, BlogComment))
  @ApiOperation({ summary: 'Reply to a specific comment' })
  @ApiParam({ name: 'blog_id', description: 'ID of the blog post' })
  @ApiParam({ name: 'comment_id', description: 'ID of the parent comment' })
  @ApiResponse({
    status: 201,
    description: 'Reply created successfully',
    type: BlogCommentApiResponseDto<BlogCommentResponseDto>,
  })
  @ApiBearerAuth()
  @MessageResponse(MESSAGE.BLOG_COMMENT.REPLY_ADDED)
  async createReplyInComment(
    @Param('blog_id') blog_id: string,
    @Param('comment_id') comment_id: string,
    @Body() createBlogCommentDto: CreateBlogCommentDto,
    @CurrentUser() user: IUser,
  ) {
    return this.blogCommentsService.createReplyInComment(
      blog_id,
      comment_id,
      createBlogCommentDto,
      user.id,
    );
  }

  @Get(':blog_id/comments')
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Read, BlogComment))
  @ApiOperation({ summary: 'Get all comments for a blog post' })
  @ApiParam({ name: 'blog_id', description: 'ID of the blog post' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
    type: BlogCommentApiResponseDto<BlogCommentListResponseDto>,
  })
  @MessageResponse(MESSAGE.BLOG_COMMENT.COMMENT_LIST)
  async findAllBlogComments(@Param('blog_id') blog_id: string) {
    return this.blogCommentsService.findAllBlogComments(blog_id);
  }

  @Get(':blog_id/comments/:comment_id')
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Read, BlogComment))
  @ApiOperation({ summary: 'Get replies for a specific comment' })
  @ApiParam({ name: 'blog_id', description: 'ID of the blog post' })
  @ApiParam({ name: 'comment_id', description: 'ID of the parent comment' })
  @ApiResponse({
    status: 200,
    description: 'Replies retrieved successfully',
    type: BlogCommentApiResponseDto<BlogCommentListResponseDto>,
  })
  @MessageResponse(MESSAGE.BLOG_COMMENT.REPLY_LIST)
  async findReplyInComment(
    @Param('blog_id') blog_id: string,
    @Param('comment_id') comment_id: string,
  ) {
    return this.blogCommentsService.findReplyInComment(blog_id, comment_id);
  }

  @Delete(':blog_id/comments/:comment_id')
  @UseGuards(PermissionGuard)
  @CheckPolicies((ability) => ability.can(Action.Delete, BlogComment))
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'blog_id', description: 'ID of the blog post' })
  @ApiParam({ name: 'comment_id', description: 'ID of the comment to delete' })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
    type: BlogCommentApiResponseDto<{ deleted: boolean }>,
  })
  @ApiBearerAuth()
  @MessageResponse(MESSAGE.BLOG_COMMENT.COMMENT_DELETED)
  async deleteBlogComment(
    @Param('blog_id') blog_id: string,
    @Param('comment_id') comment_id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.blogCommentsService.deleteBlogComment(
      blog_id,
      comment_id,
      user.id,
    );
  }
}
