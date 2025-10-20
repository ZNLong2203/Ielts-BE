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
import { MESSAGE } from 'src/common/message';
import { MessageResponse, Public } from 'src/decorator/customize';
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
  @MessageResponse(MESSAGE.STUDENT.STUDENT_LIST)
  @Get()
  findAll(@Query() query: PaginationQueryDto, @Req() req: Request) {
    return this.studentsService.findAll(query, req.query);
  }

  @ApiOperation({
    summary: 'Get a student by ID',
    description: 'Retrieve a student by their unique ID.',
  })
  @Public()
  @MessageResponse(MESSAGE.STUDENT.STUDENT_INFO)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Get student dashboard data including combo enrollments',
    description:
      'Retrieve student dashboard with combo courses and enrolled courses.',
  })
  @Public()
  @MessageResponse(MESSAGE.STUDENT.STUDENT_DASHBOARD)
  @Get(':id/dashboard')
  getStudentDashboard(@Param('id') id: string) {
    return this.studentsService.getStudentDashboard(id);
  }

  @ApiOperation({
    summary: 'Get student enrolled combo courses',
    description: 'Retrieve all combo courses that the student has enrolled in.',
  })
  @Public()
  @MessageResponse(MESSAGE.STUDENT.STUDENT_COMBO_ENROLLMENTS)
  @Get(':id/combo-enrollments')
  getStudentComboEnrollments(@Param('id') id: string) {
    return this.studentsService.getStudentComboEnrollments(id);
  }

  @ApiOperation({
    summary: 'Get student individual course enrollments',
    description:
      'Retrieve all individual courses that the student has enrolled in.',
  })
  @Public()
  @MessageResponse(MESSAGE.STUDENT.STUDENT_COURSE_ENROLLMENTS)
  @Get(':id/course-enrollments')
  getStudentCourseEnrollments(@Param('id') id: string) {
    return this.studentsService.getStudentCourseEnrollments(id);
  }

  @ApiOperation({
    summary: 'Update a detail of a student',
    description: 'Update student information by their unique ID (user id).',
  })
  @ApiBody({ type: UpdateStudentDto })
  @Public()
  @MessageResponse(MESSAGE.STUDENT.STUDENT_UPDATE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }
}
