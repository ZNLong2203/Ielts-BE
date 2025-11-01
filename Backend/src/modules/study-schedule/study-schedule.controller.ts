import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/decorator/customize';
import { IUser } from 'src/interface/users.interface';
import {
  BulkCreateScheduleDto,
  CompleteScheduleDto,
  CreateScheduleDto,
} from 'src/modules/study-schedule/dto/create-study-schedule.dto';
import { UpdateScheduleDto } from 'src/modules/study-schedule/dto/update-study-schedule.dto';
import {
  REMINDER_STATUS,
  ReminderStatusType,
  SCHEDULE_STATUS,
  ScheduleStatusType,
} from 'src/modules/study-schedule/types/types';
import { StudyScheduleService } from './study-schedule.service';

@ApiTags('Study Schedule')
@ApiBearerAuth()
@Controller('study-schedule')
export class StudyScheduleController {
  constructor(private readonly studyScheduleService: StudyScheduleService) {}

  // ==================== STUDY SCHEDULES ====================

  @Post()
  @ApiOperation({
    summary: 'Create study schedule',
    description: 'Student creates a single study schedule for a course/lesson',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Study schedule created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or schedule conflict',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course, combo, or lesson not found',
  })
  async createSchedule(
    @CurrentUser() user: IUser,
    @Body() createDto: CreateScheduleDto,
  ) {
    return this.studyScheduleService.createSchedule(user.id, createDto);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk create schedules for combo',
    description:
      'Automatically generate study schedules for all courses in a combo based on preferred time slots',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk schedules created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Combo not found or not enrolled',
  })
  async bulkCreateSchedules(
    @CurrentUser() user: IUser,
    @Body() bulkDto: BulkCreateScheduleDto,
  ) {
    return this.studyScheduleService.bulkCreateSchedules(user.id, bulkDto);
  }

  @Get('my-schedules')
  @ApiOperation({
    summary: 'Get my study schedules',
    description: 'Get all study schedules of current user with filters',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter by specific date (YYYY-MM-DD)',
    example: '2025-11-05',
  })
  @ApiQuery({
    name: 'week',
    required: false,
    description: 'Filter by week',
    enum: ['current'],
  })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Filter by month',
    enum: ['current'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
    enum: SCHEDULE_STATUS,
  })
  @ApiQuery({
    name: 'combo_id',
    required: false,
    description: 'Filter by combo ID',
    type: 'string',
  })
  @ApiQuery({
    name: 'course_id',
    required: false,
    description: 'Filter by course ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Study schedules retrieved successfully',
  })
  async getMySchedules(
    @CurrentUser() user: IUser,
    @Query('date') date?: string,
    @Query('week') week?: string,
    @Query('month') month?: string,
    @Query('status') status?: ScheduleStatusType,
    @Query('combo_id') combo_id?: string,
    @Query('course_id') course_id?: string,
  ) {
    return this.studyScheduleService.getMySchedules(user.id, {
      date,
      week,
      month,
      status,
      combo_id,
      course_id,
    });
  }

  @Get('weekly-schedule')
  @ApiOperation({
    summary: 'Get weekly schedule summary',
    description: 'Get detailed schedule and statistics for a specific week',
  })
  @ApiQuery({
    name: 'week_offset',
    required: false,
    description:
      'Week offset from current week (0 = current, 1 = next, -1 = previous)',
    example: 0,
    type: 'number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Weekly schedule retrieved successfully',
  })
  async getWeeklySchedule(
    @CurrentUser() user: IUser,
    @Query('week_offset') weekOffset?: number,
  ) {
    return this.studyScheduleService.getWeeklySchedule(
      user.id,
      Number(weekOffset) || 0,
    );
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get study analytics',
    description: 'Get study statistics and analytics for week or month',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Analytics period',
    enum: ['week', 'month'],
    example: 'week',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Study analytics retrieved successfully',
  })
  async getStudyAnalytics(
    @CurrentUser() user: IUser,
    @Query('period') period: 'week' | 'month' = 'week',
  ) {
    return this.studyScheduleService.getStudyAnalytics(user.id, period);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get schedule details',
    description: 'Get detailed information of a study schedule',
  })
  @ApiParam({
    name: 'id',
    description: 'Schedule ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Schedule details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Schedule not found',
  })
  async getScheduleById(@CurrentUser() user: IUser, @Param('id') id: string) {
    return this.studyScheduleService.getScheduleById(user.id, id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update study schedule',
    description:
      'Update study schedule information (time, course, notes, etc.)',
  })
  @ApiParam({
    name: 'id',
    description: 'Schedule ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Schedule updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or schedule conflict',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Schedule not found',
  })
  async updateSchedule(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateScheduleDto,
  ) {
    return this.studyScheduleService.updateSchedule(user.id, id, updateDto);
  }

  @Post(':id/start')
  @ApiOperation({
    summary: 'Start study session',
    description: 'Mark study session as started and track actual start time',
  })
  @ApiParam({
    name: 'id',
    description: 'Schedule ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Study session started successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot start this session',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Schedule not found',
  })
  async startSession(@CurrentUser() user: IUser, @Param('id') id: string) {
    return this.studyScheduleService.startSession(user.id, id);
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Complete study session',
    description:
      'Mark study session as completed with feedback and performance data',
  })
  @ApiParam({
    name: 'id',
    description: 'Schedule ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Study session completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Schedule not found',
  })
  async completeSession(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() completeDto: CompleteScheduleDto,
  ) {
    return this.studyScheduleService.completeSession(user.id, id, completeDto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel study schedule',
    description: 'Cancel a scheduled study session',
  })
  @ApiParam({
    name: 'id',
    description: 'Schedule ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Schedule cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel this schedule',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Schedule not found',
  })
  async cancelSchedule(@CurrentUser() user: IUser, @Param('id') id: string) {
    await this.studyScheduleService.cancelSchedule(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete study schedule',
    description: 'Soft delete a study schedule and its reminders',
  })
  @ApiParam({
    name: 'id',
    description: 'Schedule ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Schedule deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Schedule not found',
  })
  async deleteSchedule(@CurrentUser() user: IUser, @Param('id') id: string) {
    await this.studyScheduleService.deleteSchedule(user.id, id);
  }

  // ==================== REMINDERS ====================

  @Get('reminders/my-reminders')
  @ApiOperation({
    summary: 'Get my reminders',
    description: 'Get all reminders of current user with filters',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
    enum: REMINDER_STATUS,
  })
  @ApiQuery({
    name: 'unread',
    required: false,
    description: 'Filter unread reminders only',
    type: 'boolean',
    example: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reminders retrieved successfully',
  })
  async getMyReminders(
    @CurrentUser() user: IUser,
    @Query('status') status?: ReminderStatusType,
    @Query('unread') unread?: boolean,
  ) {
    return this.studyScheduleService.getMyReminders(user.id, {
      status,
      unread: unread === true,
    });
  }

  @Post('reminders/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Mark reminder as read',
    description: 'Mark a specific reminder as read',
  })
  @ApiParam({
    name: 'id',
    description: 'Reminder ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Reminder marked as read successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reminder not found',
  })
  async markReminderAsRead(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
  ) {
    await this.studyScheduleService.markReminderAsRead(user.id, id);
  }

  // ==================== COMBO-SPECIFIC ENDPOINTS ====================

  @Get('combo/:comboId/schedules')
  @ApiOperation({
    summary: 'Get schedules for specific combo',
    description: 'Get all study schedules for a specific combo',
  })
  @ApiParam({
    name: 'comboId',
    description: 'Combo ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Combo schedules retrieved successfully',
  })
  async getComboSchedules(
    @CurrentUser() user: IUser,
    @Param('comboId') comboId: string,
  ) {
    return this.studyScheduleService.getMySchedules(user.id, {
      combo_id: comboId,
    });
  }

  @Get('combo/:comboId/progress')
  @ApiOperation({
    summary: 'Get combo study progress',
    description: 'Get study progress statistics for a specific combo',
  })
  @ApiParam({
    name: 'comboId',
    description: 'Combo ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Combo progress retrieved successfully',
  })
  async getComboProgress(
    @CurrentUser() user: IUser,
    @Param('comboId') comboId: string,
  ) {
    const schedules = await this.studyScheduleService.getMySchedules(user.id, {
      combo_id: comboId,
    });

    const completed = schedules.filter((s) => s.status === 'completed');
    const totalHours = completed.reduce(
      (sum, s) => sum + (s.actual_duration || 0) / 60,
      0,
    );

    return {
      combo_id: comboId,
      total_sessions: schedules.length,
      completed_sessions: completed.length,
      progress_percentage:
        schedules.length > 0
          ? ((completed.length / schedules.length) * 100).toFixed(1)
          : 0,
      total_study_hours: totalHours.toFixed(1),
      upcoming_sessions: schedules
        .filter((s) => s.status === 'scheduled')
        .slice(0, 5),
    };
  }
}
