import { Injectable } from '@nestjs/common';
import { CreateBlogCommentDto } from './dto/create-blog-comment.dto';
import { UpdateBlogCommentDto } from './dto/update-blog-comment.dto';

@Injectable()
export class BlogCommentsService {
  create(createBlogCommentDto: CreateBlogCommentDto) {
    return 'This action adds a new blogComment';
  }

  findAll() {
    return `This action returns all blogComments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} blogComment`;
  }

  update(id: number, updateBlogCommentDto: UpdateBlogCommentDto) {
    return `This action updates a #${id} blogComment`;
  }

  remove(id: number) {
    return `This action removes a #${id} blogComment`;
  }
}
