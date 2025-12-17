import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { USER_ROLE } from 'src/common/constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { UsersService } from 'src/modules/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from './../../utils/utils.service';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly utilsService: UtilsService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(query: PaginationQueryDto, rawQuery: Record<string, any>) {
    const whereCondition: Prisma.usersWhereInput =
      this.utilsService.buildWhereFromQuery(rawQuery);

    whereCondition.role = USER_ROLE.STUDENT;

    return this.utilsService.paginate({
      model: this.prisma.users,
      query,
      defaultOrderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        status: true,
        created_at: true,
        students: {
          select: {
            current_level: true,
            target_ielts_score: true,
          },
        },
      },
      where: whereCondition,
    });
  }

  async findOne(id: string) {
    const student = await this.usersService.findUniqueUserByCondition({
      id,
      role: USER_ROLE.STUDENT,
    });
    if (!student) {
      throw new Error('Student not found');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...dataFormat } = student;
    return dataFormat;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    const existingStudent = await this.usersService.findById(id);
    if (!existingStudent || existingStudent.role !== USER_ROLE.STUDENT) {
      throw new Error('Student not found');
    }

    const updatedData: Prisma.studentsUpdateInput =
      this.utilsService.cleanDto(updateStudentDto);

    return this.prisma.students.update({
      where: { user_id: id },
      data: updatedData,
    });
  }

  async getStudentDashboard(userId: string) {
    // Verify student exists
    const student = await this.prisma.students.findFirst({
      where: { user_id: userId, deleted: false },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            full_name: true,
            avatar: true,
          },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Get combo enrollments with progress
    const comboEnrollments = await this.getStudentComboEnrollments(userId);

    // Get individual course enrollments (for tracking progress only, not sold separately)
    const courseEnrollments = await this.getStudentCourseEnrollments(userId);

    // Calculate statistics - only count courses from combo enrollments
    // Use Set to deduplicate in case a course appears in multiple combos
    const uniqueCourses = new Set<string>();
    comboEnrollments?.forEach((combo) => {
      combo.courses?.forEach((course) => {
        uniqueCourses.add(course.id);
      });
    });
    const totalCourses = uniqueCourses.size;

    // Calculate completed courses (only from combos)
    // Use is_completed field instead of progress === 100
    const completedCoursesSet = new Set<string>();
    comboEnrollments?.forEach((combo) => {
      combo.courses
        ?.filter((c) => c.is_completed === true)
        .forEach((course) => {
          completedCoursesSet.add(course.id);
        });
    });
    const completedCourses = completedCoursesSet.size;

    const inProgressCourses = totalCourses - completedCourses;

    const avgProgress =
      totalCourses > 0
        ? Math.round(
            ((comboEnrollments?.reduce(
              (acc: number, combo) =>
                acc + Number(combo.overall_progress_percentage || 0),
              0,
            ) || 0) +
              (courseEnrollments?.reduce(
                (acc: number, course) =>
                  acc + Number(course.progress_percentage || 0),
                0,
              ) || 0)) /
              (comboEnrollments.length + courseEnrollments.length),
          )
        : 0;

    return {
      student: {
        id: student.users?.id,
        full_name: student.users?.full_name,
        email: student.users?.email,
        avatar: student.users?.avatar,
        current_level: student.current_level,
        target_ielts_score: student.target_ielts_score,
        learning_goals: student.learning_goals,
      },
      stats: {
        totalCourses,
        completedCourses,
        inProgressCourses,
        averageProgress: avgProgress,
      },
      comboEnrollments,
      courseEnrollments,
    };
  }

  async getStudentComboEnrollments(userId: string) {
    const comboEnrollments = await this.prisma.combo_enrollments.findMany({
      where: {
        user_id: userId,
        deleted: false,
        is_active: true,
      },
      include: {
        combo_courses: {
          select: {
            id: true,
            name: true,
            description: true,
            thumbnail: true,
            original_price: true,
            combo_price: true,
            discount_percentage: true,
            course_ids: true,
            enrollment_count: true,
            tags: true,
            created_at: true,
          },
        },
      },
      orderBy: {
        enrollment_date: 'desc',
      },
    });

    // Enhance with course details and progress
    const enhancedEnrollments = await Promise.all(
      comboEnrollments.map(async (enrollment) => {
        if (!enrollment.combo_courses) {
          return null;
        }

        const combo = enrollment.combo_courses;

        // Get all courses in this combo
        const courses = await this.prisma.courses.findMany({
          where: {
            id: { in: combo.course_ids },
            deleted: false,
          },
          include: {
            course_categories: {
              select: {
                name: true,
                icon: true,
              },
            },
            teachers: {
              select: {
                users: {
                  select: {
                    full_name: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        });

        // Get progress for each course
        const coursesWithProgress = await Promise.all(
          courses.map(async (course) => {
            // Count total and completed lessons
            const sections = await this.prisma.sections.findMany({
              where: {
                course_id: course.id,
                deleted: false,
              },
              include: {
                lessons: {
                  where: {
                    deleted: false,
                  },
                },
              },
            });

            const totalLessons = sections.reduce(
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

            // Calculate course progress percentage from lessons (source of truth)
            // Don't use enrollment.progress_percentage as it may be outdated
            const progressPercentage =
              totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

            // Course is completed when all lessons are completed
            // Check both: completed_lessons === total_lessons AND total_lessons > 0
            const isCompleted =
              totalLessons > 0 && completedLessons === totalLessons;

            return {
              id: course.id,
              title: course.title,
              description: course.description,
              thumbnail: course.thumbnail,
              skill_focus: course.skill_focus,
              difficulty_level: course.difficulty_level,
              estimated_duration: course.estimated_duration,
              price: course.price,
              discount_price: course.discount_price,
              rating: course.rating,
              enrollment_count: course.enrollment_count,
              teacher: course.teachers?.users?.full_name,
              teacher_avatar: course.teachers?.users?.avatar,
              category: course.course_categories?.name,
              category_icon: course.course_categories?.icon,
              progress: progressPercentage,
              total_lessons: totalLessons,
              completed_lessons: completedLessons,
              is_completed: isCompleted,
            };
          }),
        );

        // Calculate overall progress percentage from courses
        // If certificate exists, use database value as it's the source of truth for completion
        // Otherwise, calculate from actual lesson progress
        let overallProgressPercentage: number;
        let finalCoursesWithProgress = coursesWithProgress;

        if (
          enrollment.certificate_url &&
          Number(enrollment.overall_progress_percentage) >= 100
        ) {
          // If certificate exists, use the database value (100%)
          // and mark all courses as completed
          overallProgressPercentage = Number(
            enrollment.overall_progress_percentage,
          );
          finalCoursesWithProgress = coursesWithProgress.map((course) => ({
            ...course,
            progress: 100,
            is_completed: true,
            completed_lessons: course.total_lessons,
          }));
        } else {
          // Calculate from actual course progress
          const totalCourseProgress = coursesWithProgress.reduce(
            (acc, course) => acc + course.progress,
            0,
          );
          overallProgressPercentage =
            coursesWithProgress.length > 0
              ? totalCourseProgress / coursesWithProgress.length
              : 0;
        }

        return {
          id: enrollment.id,
          enrollment_date: enrollment.enrollment_date,
          overall_progress_percentage: overallProgressPercentage,
          certificate_url: enrollment.certificate_url,
          is_active: enrollment.is_active,
          combo: {
            id: combo.id,
            name: combo.name,
            description: combo.description,
            thumbnail: combo.thumbnail,
            original_price: combo.original_price,
            combo_price: combo.combo_price,
            discount_percentage: combo.discount_percentage,
            enrollment_count: combo.enrollment_count,
            tags: combo.tags,
            total_courses: courses.length,
            completed_courses: finalCoursesWithProgress.filter(
              (c) => c.is_completed,
            ).length,
          },
          courses: finalCoursesWithProgress,
        };
      }),
    );

    return enhancedEnrollments.filter((e) => e !== null);
  }

  async getStudentCourseEnrollments(userId: string) {
    const enrollments = await this.prisma.enrollments.findMany({
      where: {
        user_id: userId,
        deleted: false,
        is_active: true,
      },
      include: {
        courses: {
          include: {
            course_categories: {
              select: {
                name: true,
                icon: true,
              },
            },
            teachers: {
              select: {
                users: {
                  select: {
                    full_name: true,
                    avatar: true,
                  },
                },
              },
            },
            sections: {
              where: {
                deleted: false,
              },
              include: {
                lessons: {
                  where: {
                    deleted: false,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        enrollment_date: 'desc',
      },
    });

    // Enhance with progress details
    const enhancedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = enrollment.courses;

        if (!course) {
          return null;
        }

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

        // Calculate progress and completion status
        // Course is completed ONLY when all lessons are completed
        const progressPercentage = enrollment.progress_percentage
          ? Number(enrollment.progress_percentage)
          : totalLessons > 0
            ? (completedLessons / totalLessons) * 100
            : 0;

        // Course is completed when all lessons are completed
        const isCompleted =
          totalLessons > 0 && completedLessons === totalLessons;

        return {
          id: enrollment.id,
          enrollment_date: enrollment.enrollment_date,
          progress_percentage: progressPercentage,
          completion_date: enrollment.completion_date,
          is_active: enrollment.is_active,
          course: {
            id: course.id,
            title: course.title,
            description: course.description,
            thumbnail: course.thumbnail,
            skill_focus: course.skill_focus,
            difficulty_level: course.difficulty_level,
            estimated_duration: course.estimated_duration,
            price: course.price,
            discount_price: course.discount_price,
            rating: course.rating,
            rating_count: course.rating_count,
            enrollment_count: course.enrollment_count,
            teacher: course.teachers?.users?.full_name,
            teacher_avatar: course.teachers?.users?.avatar,
            category: course.course_categories?.name,
            category_icon: course.course_categories?.icon,
            total_lessons: totalLessons,
            completed_lessons: completedLessons,
            is_completed: isCompleted,
          },
        };
      }),
    );

    return enhancedEnrollments.filter((e) => e !== null);
  }
}
