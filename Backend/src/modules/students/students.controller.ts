import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Public } from 'src/decorator/customize';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @ApiOperation({
    summary: 'Get all students',
    description: 'Retrieve a paginated list of all students.',
  })
  @Public()
  @Get()
  findAll(@Query() query: PaginationQueryDto, @Req() req: Request) {
    return this.studentsService.findAll(query, req.query);
  }

  @ApiOperation({
    summary: 'Get a student by ID',
    description: 'Retrieve a student by their unique ID.',
  })
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update a student',
    description: 'Update student information by their unique ID (user id).',
  })
  @ApiBody({ type: UpdateStudentDto })
  @Public()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }
}
