import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, study_schedules } from '@prisma/client';
import {
  addDays,
  addMinutes,
  addWeeks,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isAfter,
  isBefore,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  BulkCreateScheduleDto,
  CompleteScheduleDto,
  CreateScheduleDto,
} from 'src/modules/study-schedule/dto/create-study-schedule.dto';
import { UpdateScheduleDto } from 'src/modules/study-schedule/dto/update-study-schedule.dto';
import {
  ComboProgressData,
  REMINDER_STATUS,
  ReminderStatusType,
  SCHEDULE_STATUS,
  ScheduleStatusType,
  StudyAnalytics,
  StudyScheduleDetails,
  WeeklyScheduleSummary,
} from 'src/modules/study-schedule/types/types';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StudyScheduleService {
  private readonly logger = new Logger(StudyScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create Single Study Schedule
   */
  async createSchedule(
    userId: string,
    createDto: CreateScheduleDto,
  ): Promise<StudyScheduleDetails> {
    // Xác thực ghi danh khóa học
    await this.validateEnrollment(
      userId,
      createDto.course_id,
      createDto.combo_id,
    );

    // Xác thực bài học nếu được cung cấp
    if (createDto.lesson_id) {
      await this.validateLesson(createDto.lesson_id, createDto.course_id);
    }

    // Tính thời lượng
    const duration = this.calculateDuration(
      createDto.start_time,
      createDto.end_time,
    );

    if (duration <= 0) {
      throw new BadRequestException('End time must be after start time');
    }

    // Kiểm tra xung đột lịch trình
    const hasConflict = await this.checkScheduleConflict(
      userId,
      createDto.scheduled_date,
      createDto.start_time,
      createDto.end_time,
    );

    if (hasConflict) {
      throw new BadRequestException(
        'You already have a study session scheduled at this time',
      );
    }

    // Chuyển đổi chuỗi thời gian thành đối tượng DateTime cho Prisma
    const startTimeDate = this.parseTimeString(createDto.start_time);
    const endTimeDate = this.parseTimeString(createDto.end_time);

    // Tạo lịch học
    const schedule = await this.prisma.study_schedules.create({
      data: {
        user_id: userId,
        combo_id: createDto.combo_id,
        course_id: createDto.course_id,
        lesson_id: createDto.lesson_id,
        scheduled_date: new Date(createDto.scheduled_date),
        start_time: startTimeDate,
        end_time: endTimeDate,
        duration,
        study_goal: createDto.study_goal,
        notes: createDto.notes,
        reminder_enabled: createDto.reminder_enabled ?? true,
        reminder_minutes_before: createDto.reminder_minutes_before ?? 30,
        status: SCHEDULE_STATUS.SCHEDULED,
      },
      include: this.getScheduleIncludes(),
    });

    // Tạo nhắc nhở nếu được bật
    if (schedule.reminder_enabled) {
      await this.createReminder(schedule);
    }

    this.logger.log(
      `Created study schedule for user ${userId} on ${createDto.scheduled_date}`,
    );

    return this.mapScheduleToDetails(schedule);
  }

  /**
   * Bulk Create Schedules for Combo
   */
  async bulkCreateSchedules(
    userId: string,
    bulkDto: BulkCreateScheduleDto,
  ): Promise<{ created_count: number; schedules: StudyScheduleDetails[] }> {
    // Xác thực ghi danh combo
    const comboEnrollment = await this.prisma.combo_enrollments.findFirst({
      where: {
        user_id: userId,
        combo_id: bulkDto.combo_id,
        deleted: false,
      },
      include: {
        combo_courses: {
          select: {
            id: true,
            name: true,
            course_ids: true,
          },
        },
      },
    });

    if (!comboEnrollment) {
      throw new NotFoundException(
        'Combo not found or you are not enrolled in this combo',
      );
    }

    const combo = comboEnrollment.combo_courses;
    const courseIds = combo?.course_ids as unknown as string[];

    // Lấy tất cả các khóa học trong combo
    const courses = await this.prisma.courses.findMany({
      where: {
        id: { in: courseIds },
        deleted: false,
      },
      orderBy: { skill_focus: 'asc' },
    });

    if (courses.length === 0) {
      throw new BadRequestException('No courses found in this combo');
    }

    // Tạo các lịch học
    const schedulesToCreate: any[] = [];
    const startDate = new Date();
    const totalWeeks = bulkDto.weeks_count;

    let currentWeek = 0;
    let courseIndex = 0;

    // Ánh xạ tên ngày sang số
    const dayMap: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    while (currentWeek < totalWeeks && courseIndex < courses.length) {
      const weekStart = addWeeks(startDate, currentWeek);

      for (const timeSlot of bulkDto.time_slots) {
        if (courseIndex >= courses.length) break;

        const dayNumber = dayMap[timeSlot.day.toLowerCase()];
        const sessionDate = addDays(
          weekStart,
          (dayNumber - getDay(weekStart) + 7) % 7,
        );

        // Kiểm tra ngày không phải trong quá khứ
        if (isAfter(sessionDate, new Date())) {
          const course = courses[courseIndex];
          const duration = this.calculateDuration(
            timeSlot.start_time,
            timeSlot.end_time,
          );

          // Chuyển đổi chuỗi thời gian thành đối tượng Date cho Prisma
          const startTimeDate = this.parseTimeString(timeSlot.start_time);
          const endTimeDate = this.parseTimeString(timeSlot.end_time);

          schedulesToCreate.push({
            user_id: userId,
            combo_id: bulkDto.combo_id,
            course_id: course.id,
            scheduled_date: sessionDate,
            start_time: startTimeDate,
            end_time: endTimeDate,
            duration,
            study_goal: `Study ${course.title}`,
            reminder_enabled: bulkDto.reminder_enabled ?? true,
            reminder_minutes_before: bulkDto.reminder_minutes_before ?? 30,
            status: SCHEDULE_STATUS.SCHEDULED,
          });
        }

        courseIndex++;
      }

      currentWeek++;
    }

    // Chèn hàng loạt các lịch học
    const createdSchedules = await this.prisma.$transaction(
      schedulesToCreate.map((data: study_schedules) =>
        this.prisma.study_schedules.create({
          data,
          include: this.getScheduleIncludes(),
        }),
      ),
    );

    // Tạo nhắc nhở cho các lịch học được bật
    const reminderPromises = createdSchedules
      .filter((s) => s.reminder_enabled)
      .map((s) => this.createReminder(s));

    await Promise.all(reminderPromises);

    this.logger.log(
      `Bulk created ${createdSchedules.length} schedules for combo ${bulkDto.combo_id}`,
    );

    return {
      created_count: createdSchedules.length,
      schedules: createdSchedules.map((s) => this.mapScheduleToDetails(s)),
    };
  }

  /**
   * Get My Schedules
   */
  async getMySchedules(
    userId: string,
    filters?: {
      date?: string;
      week?: string;
      month?: string;
      status?: ScheduleStatusType;
      combo_id?: string;
      course_id?: string;
    },
  ): Promise<StudyScheduleDetails[]> {
    const where: Prisma.study_schedulesWhereInput = {
      user_id: userId,
      deleted: false,
    };

    // Lọc theo ngày cụ thể
    if (filters?.date) {
      where.scheduled_date = new Date(filters.date);
    }

    // Lọc theo tuần
    if (filters?.week === 'current') {
      const now = new Date();
      where.scheduled_date = {
        gte: startOfWeek(now, { weekStartsOn: 1 }),
        lte: endOfWeek(now, { weekStartsOn: 1 }),
      };
    }

    // Lọc theo tháng
    if (filters?.month === 'current') {
      const now = new Date();
      where.scheduled_date = {
        gte: startOfMonth(now),
        lte: endOfMonth(now),
      };
    }

    // Lọc theo trạng thái
    if (filters?.status) {
      where.status = filters.status;
    }

    // Lọc theo combo
    if (filters?.combo_id) {
      where.combo_id = filters.combo_id;
    }

    // Lọc theo khóa học
    if (filters?.course_id) {
      where.course_id = filters.course_id;
    }

    const schedules = await this.prisma.study_schedules.findMany({
      where,
      include: this.getScheduleIncludes(),
      orderBy: [{ scheduled_date: 'asc' }, { start_time: 'asc' }],
    });

    return schedules.map((s) => this.mapScheduleToDetails(s));
  }

  /**
   * Get Weekly Schedule Summary
   */
  async getWeeklySchedule(
    userId: string,
    weekOffset: number = 0,
  ): Promise<WeeklyScheduleSummary> {
    const now = new Date();
    const targetWeek = addWeeks(now, weekOffset);
    const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });

    const schedules = await this.prisma.study_schedules.findMany({
      where: {
        user_id: userId,
        scheduled_date: {
          gte: weekStart,
          lte: weekEnd,
        },
        deleted: false,
      },
      include: this.getScheduleIncludes(),
      orderBy: [{ scheduled_date: 'asc' }, { start_time: 'asc' }],
    });

    const completed = schedules.filter(
      (s) => s.status === SCHEDULE_STATUS.COMPLETED,
    );
    const missed = schedules.filter((s) => s.status === SCHEDULE_STATUS.MISSED);

    const totalPlannedMinutes = schedules.reduce(
      (sum, s) => sum + (s.duration || 0),
      0,
    );
    const totalActualMinutes = completed.reduce(
      (sum, s) => sum + (s.actual_duration || 0),
      0,
    );

    return {
      week_start: weekStart,
      week_end: weekEnd,
      total_sessions: schedules.length,
      completed_sessions: completed.length,
      missed_sessions: missed.length,
      total_planned_hours: Number((totalPlannedMinutes / 60).toFixed(1)),
      total_actual_hours: Number((totalActualMinutes / 60).toFixed(1)),
      completion_rate:
        schedules.length > 0
          ? Number(((completed.length / schedules.length) * 100).toFixed(1))
          : 0,
      schedules: schedules.map((s) => this.mapScheduleToDetails(s)),
    };
  }

  /**
   * Get Schedule by ID
   */
  async getScheduleById(
    userId: string,
    scheduleId: string,
  ): Promise<StudyScheduleDetails> {
    const schedule = await this.prisma.study_schedules.findFirst({
      where: {
        id: scheduleId,
        user_id: userId,
        deleted: false,
      },
      include: this.getScheduleIncludes(),
    });

    if (!schedule) {
      throw new NotFoundException('Study schedule not found');
    }

    return this.mapScheduleToDetails(schedule);
  }

  /**
   * Update Schedule
   */
  async updateSchedule(
    userId: string,
    scheduleId: string,
    updateDto: UpdateScheduleDto,
  ): Promise<StudyScheduleDetails> {
    const existingSchedule = await this.prisma.study_schedules.findFirst({
      where: {
        id: scheduleId,
        user_id: userId,
        deleted: false,
      },
    });

    if (!existingSchedule) {
      throw new NotFoundException('Study schedule not found');
    }

    // Kiểm tra nếu cố gắng cập nhật lịch học đã hoàn thành/bỏ lỡ
    if (
      [SCHEDULE_STATUS.COMPLETED, SCHEDULE_STATUS.MISSED].includes(
        existingSchedule.status as ScheduleStatusType,
      ) &&
      !updateDto.status
    ) {
      throw new BadRequestException('Cannot modify completed/missed schedule');
    }

    // Tính toán thời lượng mới nếu thời gian được cập nhật
    let duration = existingSchedule.duration;
    if (updateDto.start_time || updateDto.end_time) {
      const startTime = this.formatTimeToString(
        updateDto.start_time || existingSchedule.start_time,
      );
      const endTime = this.formatTimeToString(
        updateDto.end_time || existingSchedule.end_time,
      );
      duration = this.calculateDuration(startTime, endTime);

      if (duration <= 0) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    // Kiểm tra xung đột lịch học nếu ngày/giờ thay đổi
    if (
      updateDto.scheduled_date ||
      updateDto.start_time ||
      updateDto.end_time
    ) {
      const startTime = this.formatTimeToString(
        updateDto.start_time || existingSchedule.start_time,
      );
      const endTime = this.formatTimeToString(
        updateDto.end_time || existingSchedule.end_time,
      );
      const hasConflict = await this.checkScheduleConflict(
        userId,
        updateDto.scheduled_date ||
          format(existingSchedule.scheduled_date, 'yyyy-MM-dd'),
        startTime,
        endTime,
        scheduleId,
      );

      if (hasConflict) {
        throw new BadRequestException(
          'You already have a study session scheduled at this time',
        );
      }
    }

    // Xây dựng đối tượng dữ liệu cập nhật chỉ với các trường được cung cấp
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    // Thêm các trường tùy chọn chỉ nếu được cung cấp
    if (updateDto.combo_id !== undefined) {
      updateData.combo_id = updateDto.combo_id;
    }
    if (updateDto.course_id !== undefined) {
      updateData.course_id = updateDto.course_id;
    }
    if (updateDto.lesson_id !== undefined) {
      updateData.lesson_id = updateDto.lesson_id;
    }
    if (updateDto.scheduled_date) {
      updateData.scheduled_date = new Date(updateDto.scheduled_date);
    }
    if (updateDto.start_time) {
      updateData.start_time = this.parseTimeString(updateDto.start_time);
    }
    if (updateDto.end_time) {
      updateData.end_time = this.parseTimeString(updateDto.end_time);
    }
    // Luôn cập nhật thời lượng nếu thời gian thay đổi
    if (updateDto.start_time || updateDto.end_time) {
      updateData.duration = duration;
    }
    if (updateDto.study_goal !== undefined) {
      updateData.study_goal = updateDto.study_goal;
    }
    if (updateDto.notes !== undefined) {
      updateData.notes = updateDto.notes;
    }
    if (updateDto.reminder_enabled !== undefined) {
      updateData.reminder_enabled = updateDto.reminder_enabled;
    }
    if (updateDto.reminder_minutes_before !== undefined) {
      updateData.reminder_minutes_before = updateDto.reminder_minutes_before;
    }
    if (updateDto.status !== undefined) {
      updateData.status = updateDto.status;
    }

    const updatedSchedule = await this.prisma.study_schedules.update({
      where: { id: scheduleId },
      data: updateData,
      include: this.getScheduleIncludes(),
    });

    // Cập nhật nhắc nhở nếu thời gian/ngày thay đổi
    if (
      updateDto.scheduled_date ||
      updateDto.start_time ||
      updateDto.reminder_minutes_before !== undefined
    ) {
      await this.prisma.study_reminders.updateMany({
        where: {
          schedule_id: scheduleId,
          status: REMINDER_STATUS.PENDING,
        },
        data: { deleted: true },
      });

      if (updatedSchedule.reminder_enabled) {
        await this.createReminder(updatedSchedule);
      }
    }

    this.logger.log(`Updated schedule: ${scheduleId}`);
    return this.mapScheduleToDetails(updatedSchedule);
  }

  /**
   * Start Study Session
   */
  async startSession(
    userId: string,
    scheduleId: string,
  ): Promise<StudyScheduleDetails> {
    const schedule = await this.prisma.study_schedules.findFirst({
      where: {
        id: scheduleId,
        user_id: userId,
        deleted: false,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Study schedule not found');
    }

    if (schedule.status !== SCHEDULE_STATUS.SCHEDULED) {
      throw new BadRequestException('Can only start scheduled sessions');
    }

    const updatedSchedule = await this.prisma.study_schedules.update({
      where: { id: scheduleId },
      data: {
        actual_start_time: new Date(),
        updated_at: new Date(),
      },
      include: this.getScheduleIncludes(),
    });

    this.logger.log(`Started study session: ${scheduleId}`);
    return this.mapScheduleToDetails(updatedSchedule);
  }

  /**
   * Complete Study Session
   */
  async completeSession(
    userId: string,
    scheduleId: string,
    completeDto: CompleteScheduleDto,
  ): Promise<StudyScheduleDetails> {
    const schedule = await this.prisma.study_schedules.findFirst({
      where: {
        id: scheduleId,
        user_id: userId,
        deleted: false,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Study schedule not found');
    }

    const now = new Date();
    const actualDuration = schedule.actual_start_time
      ? differenceInMinutes(now, new Date(schedule.actual_start_time))
      : schedule.duration;

    const completedSchedule = await this.prisma.study_schedules.update({
      where: { id: scheduleId },
      data: {
        status: SCHEDULE_STATUS.COMPLETED,
        actual_end_time: now,
        actual_duration: actualDuration,
        completion_percentage: completeDto.completion_percentage,
        productivity_rating: completeDto.productivity_rating,
        session_notes: completeDto.session_notes,
        updated_at: now,
      },
      include: this.getScheduleIncludes(),
    });

    // Cập nhật tiến độ ghi danh kiểm tra course id không null
    if (!schedule.course_id) {
      throw new BadRequestException('Invalid course associated with schedule');
    }

    // Cập nhật tiến độ combo nếu có thể áp dụng
    if (schedule.combo_id) {
      await this.updateComboProgress(userId, schedule.combo_id);
    }

    this.logger.log(`Completed study session: ${scheduleId}`);
    return this.mapScheduleToDetails(completedSchedule);
  }

  /**
   * Cancel Schedule
   */
  async cancelSchedule(userId: string, scheduleId: string): Promise<void> {
    const schedule = await this.prisma.study_schedules.findFirst({
      where: {
        id: scheduleId,
        user_id: userId,
        deleted: false,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Study schedule not found');
    }

    if (schedule.status !== SCHEDULE_STATUS.SCHEDULED) {
      throw new BadRequestException('Can only cancel scheduled sessions');
    }

    await this.prisma.study_schedules.update({
      where: { id: scheduleId },
      data: {
        status: SCHEDULE_STATUS.CANCELLED,
        updated_at: new Date(),
      },
    });

    // Hủy nhắc nhở
    await this.prisma.study_reminders.updateMany({
      where: {
        schedule_id: scheduleId,
        status: REMINDER_STATUS.PENDING,
      },
      data: { deleted: true },
    });

    this.logger.log(`Cancelled schedule: ${scheduleId}`);
  }

  /**
   * Delete Schedule
   */
  async deleteSchedule(userId: string, scheduleId: string): Promise<void> {
    const schedule = await this.prisma.study_schedules.findFirst({
      where: {
        id: scheduleId,
        user_id: userId,
        deleted: false,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Study schedule not found');
    }

    await this.prisma.$transaction([
      this.prisma.study_schedules.update({
        where: { id: scheduleId },
        data: {
          deleted: true,
          updated_at: new Date(),
        },
      }),
      this.prisma.study_reminders.updateMany({
        where: { schedule_id: scheduleId },
        data: { deleted: true },
      }),
    ]);

    this.logger.log(`Deleted schedule: ${scheduleId}`);
  }

  /**
   * Get My Reminders
   */
  async getMyReminders(
    userId: string,
    filters?: {
      status?: ReminderStatusType;
      unread?: boolean;
    },
  ) {
    const where: Prisma.study_remindersWhereInput = {
      user_id: userId,
      deleted: false,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.unread) {
      where.is_read = false;
    }

    const reminders = await this.prisma.study_reminders.findMany({
      where,
      include: {
        study_schedules: {
          include: {
            courses: {
              select: {
                title: true,
                thumbnail: true,
              },
            },
            combo_courses: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { scheduled_time: 'desc' },
      take: 50,
    });

    return reminders;
  }

  /**
   * Mark Reminder as Read
   */
  async markReminderAsRead(userId: string, reminderId: string): Promise<void> {
    const reminder = await this.prisma.study_reminders.findFirst({
      where: {
        id: reminderId,
        user_id: userId,
        deleted: false,
      },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    await this.prisma.study_reminders.update({
      where: { id: reminderId },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    this.logger.log(`Marked reminder as read: ${reminderId}`);
  }

  /**
   * Get Study Analytics
   */
  async getStudyAnalytics(
    userId: string,
    period: 'week' | 'month' = 'week',
  ): Promise<StudyAnalytics> {
    const now = new Date();
    const startDate =
      period === 'week'
        ? startOfWeek(now, { weekStartsOn: 1 })
        : startOfMonth(now);
    const endDate =
      period === 'week' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);

    const schedules = await this.prisma.study_schedules.findMany({
      where: {
        user_id: userId,
        scheduled_date: {
          gte: startDate,
          lte: endDate,
        },
        deleted: false,
      },
      include: {
        courses: {
          select: {
            skill_focus: true,
          },
        },
        combo_courses: true,
      },
    });

    const completed = schedules.filter(
      (s) => s.status === SCHEDULE_STATUS.COMPLETED,
    );
    const missed = schedules.filter((s) => s.status === SCHEDULE_STATUS.MISSED);
    const cancelled = schedules.filter(
      (s) => s.status === SCHEDULE_STATUS.CANCELLED,
    );

    const totalStudyMinutes = completed.reduce(
      (sum, s) => sum + (s.actual_duration || 0),
      0,
    );

    // Kỹ năng được học nhiều nhất
    const skillCounts: { [key: string]: number } = {};
    completed.forEach((s) => {
      const skill = s.courses?.skill_focus || 'general';
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });
    const mostStudiedSkill = Object.keys(skillCounts).sort(
      (a, b) => skillCounts[b] - skillCounts[a],
    )[0];

    // Tiến độ combo
    const comboProgressMap = new Map<string, ComboProgressData>();
    schedules.forEach((s) => {
      if (s.combo_id && s.combo_courses) {
        if (!comboProgressMap.has(s.combo_id)) {
          comboProgressMap.set(s.combo_id, {
            combo_id: s.combo_id,
            combo_name: s.combo_courses.name,
            completed: 0,
            total: 0,
          });
        }
        const progress = comboProgressMap.get(s.combo_id)!;
        progress.total++;
        if (s.status === SCHEDULE_STATUS.COMPLETED) {
          progress.completed++;
        }
      }
    });

    const comboProgress = Array.from(comboProgressMap.values()).map((p) => ({
      combo_id: p.combo_id,
      combo_name: p.combo_name,
      completed_courses: p.completed,
      total_courses: p.total,
      progress_percentage: p.total > 0 ? (p.completed / p.total) * 100 : 0,
    }));

    return {
      period,
      total_sessions: schedules.length,
      completed_sessions: completed.length,
      missed_sessions: missed.length,
      cancelled_sessions: cancelled.length,
      total_study_hours: (totalStudyMinutes / 60).toFixed(1),
      avg_completion_percentage:
        completed.length > 0
          ? (
              completed.reduce(
                (sum, s) => sum + Number(s.completion_percentage),
                0,
              ) / completed.length
            ).toFixed(1)
          : '0',
      avg_productivity_rating:
        completed.filter((s) => s.productivity_rating).length > 0
          ? (
              completed
                .filter((s) => s.productivity_rating)
                .reduce((sum, s) => sum + (s.productivity_rating || 0), 0) /
              completed.filter((s) => s.productivity_rating).length
            ).toFixed(1)
          : null,
      most_studied_skill: mostStudiedSkill,
      combo_progress: comboProgress.length > 0 ? comboProgress : undefined,
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private calculateDuration(startTime: string, endTime: string): number {
    const start = parse(startTime, 'HH:mm', new Date());
    const end = parse(endTime, 'HH:mm', new Date());
    return differenceInMinutes(end, start);
  }

  private formatTimeToString(time: string | Date): string {
    if (typeof time === 'string') {
      return time;
    }
    return format(time, 'HH:mm');
  }

  /**
   * Parse time string (HH:mm) to DateTime for Prisma Time field
   */
  private parseTimeString(timeString: string | Date): Date {
    if (timeString instanceof Date) {
      return timeString;
    }
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes || 0, 0, 0);
    return date;
  }

  private async checkScheduleConflict(
    userId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeScheduleId?: string,
  ): Promise<boolean> {
    const where: Prisma.study_schedulesWhereInput = {
      user_id: userId,
      scheduled_date: new Date(date),
      status: SCHEDULE_STATUS.SCHEDULED,
      deleted: false,
    };

    if (excludeScheduleId) {
      where.id = { not: excludeScheduleId };
    }

    const existingSchedules = await this.prisma.study_schedules.findMany({
      where,
    });

    const newStart = parse(startTime, 'HH:mm', new Date());
    const newEnd = parse(endTime, 'HH:mm', new Date());

    return existingSchedules.some((schedule) => {
      const startTime = this.formatTimeToString(schedule.start_time);
      const endTime = this.formatTimeToString(schedule.end_time);
      const existingStart = parse(startTime, 'HH:mm', new Date());
      const existingEnd = parse(endTime, 'HH:mm', new Date());

      return (
        (isAfter(newStart, existingStart) && isBefore(newStart, existingEnd)) ||
        (isAfter(newEnd, existingStart) && isBefore(newEnd, existingEnd)) ||
        (isBefore(newStart, existingStart) && isAfter(newEnd, existingEnd))
      );
    });
  }

  private async validateEnrollment(
    userId: string,
    courseId: string,
    comboId?: string,
  ) {
    if (comboId) {
      // Kiểm tra ghi danh combo
      const comboEnrollment = await this.prisma.combo_enrollments.findFirst({
        where: {
          user_id: userId,
          combo_id: comboId,
          deleted: false,
        },
        include: {
          combo_courses: true,
        },
      });

      if (!comboEnrollment) {
        throw new NotFoundException('Combo not found or not enrolled');
      }

      // Kiểm tra xem khóa học có thuộc combo không
      const courseIds = comboEnrollment.combo_courses?.course_ids as string[];
      if (!courseIds.includes(courseId)) {
        throw new BadRequestException('Course does not belong to this combo');
      }

      return comboEnrollment;
    }

    // Kiểm tra ghi danh khóa học riêng lẻ
    const enrollment = await this.prisma.enrollments.findFirst({
      where: {
        user_id: userId,
        course_id: courseId,
        deleted: false,
      },
      include: {
        courses: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Course not found or not enrolled');
    }

    return enrollment;
  }

  private async validateLesson(lessonId: string, courseId: string) {
    const lesson = await this.prisma.lessons.findFirst({
      where: {
        id: lessonId,
        deleted: false,
        sections: {
          course_id: courseId,
          deleted: false,
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(
        'Lesson not found or does not belong to this course',
      );
    }

    return lesson;
  }

  private async createReminder(schedule: study_schedules) {
    try {
      const startTime = this.formatTimeToString(schedule.start_time);
      const scheduledDateTime = new Date(
        `${format(new Date(schedule.scheduled_date), 'yyyy-MM-dd')}T${startTime}`,
      );

      // kiểm tra xem thời gian nhắc nhở không null
      if (!schedule.reminder_minutes_before) {
        this.logger.warn(
          `Reminder not created for schedule ${schedule.id}: reminder_minutes_before is null`,
        );
        return;
      }

      const reminderTime = addMinutes(
        scheduledDateTime,
        -schedule.reminder_minutes_before,
      );

      const now = new Date();
      const isReminderInFuture = isAfter(reminderTime, now);

      if (isReminderInFuture) {
        await this.prisma.study_reminders.create({
          data: {
            user_id: schedule.user_id,
            schedule_id: schedule.id,
            title: `Study Session Reminder`,
            message: `Your study session "${schedule.study_goal || 'Study Session'}" starts in ${schedule.reminder_minutes_before} minutes!`,
            scheduled_time: reminderTime,
            status: REMINDER_STATUS.PENDING,
          },
        });

        this.logger.log(
          `Created reminder for schedule ${schedule.id} at ${format(reminderTime, 'yyyy-MM-dd HH:mm')}`,
        );
      } else {
        this.logger.warn(
          `Reminder not created for schedule ${schedule.id}: reminder time (${format(reminderTime, 'yyyy-MM-dd HH:mm')}) is in the past. ` +
            `Scheduled time: ${format(scheduledDateTime, 'yyyy-MM-dd HH:mm')}, ` +
            `Reminder minutes before: ${schedule.reminder_minutes_before}`,
        );
      }
    } catch (error) {
      const e = error as Error;
      this.logger.error(
        `Failed to create reminder for schedule ${schedule.id}: ${e.message}`,
        e.stack,
      );
    }
  }

  private async updateComboProgress(userId: string, comboId: string) {
    const comboEnrollment = await this.prisma.combo_enrollments.findFirst({
      where: {
        user_id: userId,
        combo_id: comboId,
        deleted: false,
      },
      include: {
        combo_courses: true,
      },
    });

    if (!comboEnrollment) return;

    const courseIds = comboEnrollment.combo_courses?.course_ids as string[];

    // Đếm số khóa học đã hoàn thành
    // Một khóa học được coi là hoàn thành khi tất cả các bài học của nó được hoàn thành
    const comboCourseEnrollments = await this.prisma.enrollments.findMany({
      where: {
        user_id: userId,
        course_id: { in: courseIds },
        deleted: false,
      },
      include: {
        courses: {
          include: {
            sections: {
              include: {
                lessons: {
                  where: {
                    deleted: false,
                  },
                },
              },
              where: {
                deleted: false,
              },
            },
          },
        },
      },
    });

    // Tính toán tiến độ tổng thể là trung bình của tất cả các phần trăm tiến độ khóa học
    // Điều này mang lại một biểu diễn chính xác hơn so với chỉ đếm số khóa học đã hoàn thành
    let totalProgress = 0;

    for (const courseEnrollment of comboCourseEnrollments) {
      const course = courseEnrollment.courses;
      if (!course) continue;

      const totalLessons = course.sections.reduce(
        (acc, section) => acc + section.lessons.length,
        0,
      );

      const completedLessons = await this.prisma.user_progress.count({
        where: {
          user_id: userId,
          course_id: course.id,
          status: 'completed',
          deleted: false,
        },
      });

      // Tính toán phần trăm tiến độ khóa học
      const courseProgress =
        totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      totalProgress += courseProgress;
    }

    // Tiến độ tổng thể là trung bình của tất cả các phần trăm tiến độ khóa học
    const overallProgress =
      comboCourseEnrollments.length > 0
        ? totalProgress / comboCourseEnrollments.length
        : 0;

    await this.prisma.combo_enrollments.update({
      where: { id: comboEnrollment.id },
      data: {
        overall_progress_percentage: overallProgress,
      },
    });
  }

  private getScheduleIncludes() {
    return {
      courses: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          skill_focus: true,
        },
      },
      lessons: {
        select: {
          id: true,
          title: true,
          lesson_type: true,
        },
      },
      combo_courses: {
        select: {
          id: true,
          name: true,
        },
      },
      study_reminders: {
        where: { deleted: false },
        orderBy: { created_at: 'desc' as const },
        take: 1,
      },
    };
  }

  private mapScheduleToDetails(
    schedule: Prisma.study_schedulesGetPayload<{
      include: {
        courses: {
          select: {
            id: true;
            title: true;
            thumbnail: true;
            skill_focus: true;
          };
        };
        lessons: {
          select: {
            id: true;
            title: true;
            lesson_type: true;
          };
        };
        combo_courses: {
          select: {
            id: true;
            name: true;
          };
        };
        study_reminders: {
          where: { deleted: false };
          orderBy: { created_at: 'desc' };
          take: 1;
        };
      };
    }>,
  ): StudyScheduleDetails {
    return {
      id: schedule.id,
      user_id: schedule.user_id,
      combo_id: schedule.combo_id,
      course_id: schedule.course_id,
      lesson_id: schedule.lesson_id,
      scheduled_date: schedule.scheduled_date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      duration: schedule.duration,
      study_goal: schedule.study_goal,
      notes: schedule.notes,
      status: schedule.status,
      actual_start_time: schedule.actual_start_time,
      actual_end_time: schedule.actual_end_time,
      actual_duration: schedule.actual_duration,
      completion_percentage: Number(schedule.completion_percentage || 0),
      productivity_rating: schedule.productivity_rating,
      session_notes: schedule.session_notes,
      reminder_enabled: schedule.reminder_enabled,
      reminder_minutes_before: schedule.reminder_minutes_before,
      reminder_sent: schedule.reminder_sent,
      created_at: schedule.created_at,
      updated_at: schedule.updated_at,

      // Dữ liệu liên quan - được ánh xạ đúng cách
      combo: schedule.combo_courses
        ? {
            id: schedule.combo_courses.id,
            name: schedule.combo_courses.name,
          }
        : undefined,

      course: schedule.courses
        ? {
            id: schedule.courses.id,
            title: schedule.courses.title,
            thumbnail: schedule.courses.thumbnail,
            skill_focus: schedule.courses.skill_focus,
          }
        : undefined,

      lesson: schedule.lessons
        ? {
            id: schedule.lessons.id,
            title: schedule.lessons.title,
            lesson_type: schedule.lessons.lesson_type,
          }
        : undefined,

      // Ánh xạ mảng reminders (lấy cái đầu tiên hoặc undefined)
      reminders:
        schedule.study_reminders?.length > 0
          ? schedule.study_reminders.map((reminder) => ({
              id: reminder.id,
              title: reminder.title,
              message: reminder.message,
              scheduled_time: reminder.scheduled_time,
              status: reminder.status,
              is_read: reminder.is_read,
            }))
          : undefined,
    };
  }
}
