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
    // Xác minh sinh viên tồn tại
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

    // Lấy các ghi danh combo với tiến độ
    const comboEnrollments = await this.getStudentComboEnrollments(userId);

    // Lấy các ghi danh khóa học riêng lẻ (chỉ để theo dõi tiến độ, không bán riêng)
    const courseEnrollments = await this.getStudentCourseEnrollments(userId);

    // Tính toán thống kê - chỉ đếm các khóa học từ ghi danh combo
    // Sử dụng Set để loại trùng lặp trong trường hợp một khóa học xuất hiện trong nhiều combo
    const uniqueCourses = new Set<string>();
    comboEnrollments?.forEach((combo) => {
      combo.courses?.forEach((course) => {
        uniqueCourses.add(course.id);
      });
    });
    const totalCourses = uniqueCourses.size;

    // Tính toán các khóa học đã hoàn thành (chỉ từ combos)
    // Sử dụng trường is_completed thay vì progress === 100
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

    // Bổ sung với chi tiết khóa học và tiến độ
    const enhancedEnrollments = await Promise.all(
      comboEnrollments.map(async (enrollment) => {
        if (!enrollment.combo_courses) {
          return null;
        }

        const combo = enrollment.combo_courses;

        // Lấy tất cả các khóa học trong combo này
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

        // Lấy tiến độ cho từng khóa học
        const coursesWithProgress = await Promise.all(
          courses.map(async (course) => {
            // Đếm tổng số và số bài học đã hoàn thành
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

            // Tính toán phần trăm tiến độ khóa học từ bài học (nguồn sự thật)
            // Không sử dụng enrollment.progress_percentage vì nó có thể lỗi thời
            const progressPercentage =
              totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

            // Khóa học được hoàn thành khi tất cả các bài học được hoàn thành
            // Kiểm tra cả hai: completed_lessons === total_lessons VÀ total_lessons > 0
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

        // Tính toán phần trăm tiến độ tổng thể từ các khóa học
        // Nếu chứng chỉ tồn tại, sử dụng giá trị database vì nó là nguồn sự thật cho việc hoàn thành
        // Nếu không, tính toán từ tiến độ bài học thực tế
        let overallProgressPercentage: number;
        let finalCoursesWithProgress = coursesWithProgress;

        if (
          enrollment.certificate_url &&
          Number(enrollment.overall_progress_percentage) >= 100
        ) {
          // Nếu chứng chỉ tồn tại, sử dụng giá trị database (100%)
          // và đánh dấu tất cả các khóa học là đã hoàn thành
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
          // Tính toán từ tiến độ khóa học thực tế
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

    // Bổ sung với chi tiết tiến độ
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

        // Tính toán tiến độ và trạng thái hoàn thành
        // Khóa học được hoàn thành CHỈ khi tất cả các bài học được hoàn thành
        const progressPercentage = enrollment.progress_percentage
          ? Number(enrollment.progress_percentage)
          : totalLessons > 0
            ? (completedLessons / totalLessons) * 100
            : 0;

        // Khóa học được hoàn thành khi tất cả các bài học được hoàn thành
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
