import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { USER_ROLE } from 'src/common/constants';
import { PaymentStatus } from 'src/modules/payments/constants/payments.constant';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminDashboardDto,
  ChartDataPointDto,
  DashboardStatsDto,
  RecentActivityDto,
  TopCourseDto,
} from './dto/dashboard-stats.dto';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData(): Promise<AdminDashboardDto> {
    const [stats, recentActivities, userGrowthChart, revenueChart, topCourses] =
      await Promise.all([
        this.getDashboardStats(),
        this.getRecentActivities(),
        this.getUserGrowthChart(),
        this.getRevenueChart(),
        this.getTopCourses(),
      ]);

    return {
      stats,
      recentActivities,
      userGrowthChart,
      revenueChart,
      topCourses,
    };
  }

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const currentDate = new Date();
    const previousMonthDate = new Date();
    previousMonthDate.setMonth(currentDate.getMonth() - 1);

    // Lấy dữ liệu tháng hiện tại
    const [totalUsers, totalCourses, totalMockTests, totalRevenue] =
      await Promise.all([
        this.prisma.users.count({ where: { deleted: false } }),
        this.prisma.courses.count({ where: { deleted: false } }),
        this.prisma.mock_tests.count({ where: { deleted: false } }),
        this.getTotalRevenue(),
      ]);

    // Lấy dữ liệu tháng trước để tính toán tăng trưởng
    const [previousUsers, previousCourses, previousMockTests, previousRevenue] =
      await Promise.all([
        this.prisma.users.count({
          where: {
            deleted: false,
            created_at: { lte: previousMonthDate },
          },
        }),
        this.prisma.courses.count({
          where: {
            deleted: false,
            created_at: { lte: previousMonthDate },
          },
        }),
        this.prisma.mock_tests.count({
          where: {
            deleted: false,
            created_at: { lte: previousMonthDate },
          },
        }),
        this.getTotalRevenue(previousMonthDate),
      ]);

    // Lấy dữ liệu hôm nay (từ đầu ngày)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [todayNewUsers, todayTestsCompleted, todayEnrollments, todayRevenue] =
      await Promise.all([
        this.prisma.users.count({
          where: {
            deleted: false,
            created_at: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        }),
        this.prisma.test_results.count({
          where: {
            deleted: false,
            updated_at: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        }),
        this.prisma.enrollments.count({
          where: {
            deleted: false,
            enrollment_date: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        }),
        this.getTodayRevenue(),
      ]);

    // Tính phần trăm tăng trưởng
    const userGrowth = this.calculateGrowth(totalUsers, previousUsers);
    const courseGrowth = this.calculateGrowth(totalCourses, previousCourses);
    const mockTestGrowth = this.calculateGrowth(
      totalMockTests,
      previousMockTests,
    );
    const revenueGrowth = this.calculateGrowth(totalRevenue, previousRevenue);

    return {
      totalUsers,
      totalCourses,
      totalMockTests,
      totalRevenue,
      todayNewUsers,
      todayTestsCompleted,
      todayEnrollments,
      todayRevenue,
      userGrowth,
      courseGrowth,
      mockTestGrowth,
      revenueGrowth,
    };
  }

  async getRecentActivities(limit: number = 10): Promise<RecentActivityDto[]> {
    const activities: RecentActivityDto[] = [];

    // Lấy các đăng ký người dùng gần đây
    const recentUsers = await this.prisma.users.findMany({
      where: { deleted: false, role: { not: USER_ROLE.ADMIN } },
      orderBy: { created_at: 'desc' },
      take: 1,
      select: {
        full_name: true,
        avatar: true,
        created_at: true,
      },
    });

    // Lấy các khóa học được tạo gần đây
    const recentCourses = await this.prisma.courses.findMany({
      where: { deleted: false },
      orderBy: { created_at: 'desc' },
      take: 1,
      select: {
        id: true,
        title: true,
        created_at: true,
        teachers: {
          select: {
            users: {
              select: {
                id: true,
                full_name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Lấy các thanh toán gần đây
    const recentPayments = await this.prisma.payments.findMany({
      where: {
        deleted: false,
        status: PaymentStatus.COMPLETED,
      },
      orderBy: { processed_at: 'desc' },
      take: 1,
      select: {
        id: true,
        amount: true,
        processed_at: true,
        orders: {
          select: {
            users: {
              select: {
                id: true,
                full_name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Lấy các bài kiểm tra hoàn thành gần đây
    const recentTestResults = await this.prisma.test_results.findMany({
      where: { deleted: false },
      orderBy: { updated_at: 'desc' },
      take: 1,
      select: {
        id: true,
        updated_at: true,
        users: {
          select: {
            id: true,
            full_name: true,
            avatar: true,
          },
        },
        mock_tests: {
          select: {
            title: true,
          },
        },
      },
    });

    // Chuyển đổi thành activities
    recentUsers.forEach((user) => {
      activities.push({
        type: 'user_registered',
        title: 'New user registration',
        description: `${user.full_name || 'User'} joined the platform`,
        timestamp: this.formatTimestamp(user.created_at),
        user: {
          name: user.full_name || 'Unknown User',
          avatar: user.avatar || undefined,
        },
      });
    });

    recentCourses.forEach((course) => {
      activities.push({
        type: 'course_created',
        title: 'New course published',
        description: `${course.title} was published`,
        timestamp: this.formatTimestamp(course.created_at),
        user: course.teachers?.users
          ? {
              name: course.teachers.users.full_name || 'Unknown Teacher',
              avatar: course.teachers.users.avatar || undefined,
            }
          : undefined,
      });
    });

    recentPayments.forEach((payment) => {
      activities.push({
        type: 'payment_received',
        title: 'Payment received',
        description: 'Course purchase completed',
        timestamp: this.formatTimestamp(payment.processed_at),
        amount: Number(payment.amount),
        user: payment.orders?.users
          ? {
              name: payment.orders.users.full_name || 'Unknown User',
              avatar: payment.orders.users.avatar || undefined,
            }
          : undefined,
      });
    });

    recentTestResults.forEach((result) => {
      activities.push({
        type: 'mocktest_completed',
        title: 'Mock test completed',
        description: result.mock_tests?.title || 'Mock test',
        timestamp: this.formatTimestamp(result.updated_at),
        user: result.users
          ? {
              name: result.users.full_name || 'Unknown User',
              avatar: result.users.avatar || undefined,
            }
          : undefined,
      });
    });

    // Sắp xếp theo timestamp và giới hạn
    return activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);
  }

  async getUserGrowthChart(): Promise<ChartDataPointDto[]> {
    const currentDate = new Date();
    const months: ChartDataPointDto[] = [];

    // Lấy dữ liệu cho 12 tháng trước
    for (let i = 11; i >= 0; i--) {
      // Tính toán year và month chính xác để tránh lỗi khi setMonth với số âm
      const targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1,
      );
      targetDate.setHours(0, 0, 0, 0);

      const nextMonth = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        1,
      );

      const userCount = await this.prisma.users.count({
        where: {
          deleted: false,
          created_at: {
            gte: targetDate,
            lt: nextMonth,
          },
        },
      });

      months.push({
        name: targetDate.toLocaleDateString('en', { month: 'short' }),
        value: userCount,
        label: 'Users',
      });
    }

    return months;
  }

  async getRevenueChart(): Promise<ChartDataPointDto[]> {
    const currentDate = new Date();
    const months: ChartDataPointDto[] = [];

    // Lấy dữ liệu cho 12 tháng trước
    for (let i = 11; i >= 0; i--) {
      // Tính toán year và month chính xác để tránh lỗi khi setMonth với số âm
      const targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1,
      );
      targetDate.setHours(0, 0, 0, 0);

      const nextMonth = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        1,
      );

      const revenue = await this.prisma.payments.aggregate({
        where: {
          deleted: false,
          status: PaymentStatus.COMPLETED,
          processed_at: {
            gte: targetDate,
            lt: nextMonth,
          },
        },
        _sum: {
          amount: true,
        },
      });

      months.push({
        name: targetDate.toLocaleDateString('en', { month: 'short' }),
        value: Number(revenue._sum.amount) || 0,
        label: 'Revenue ($)',
      });
    }

    return months;
  }

  async getTopCourses(limit: number = 5): Promise<TopCourseDto[]> {
    const courses = await this.prisma.courses.findMany({
      where: {
        deleted: false,
        published_at: { not: null },
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        rating: true,
        price: true,
        enrollments: {
          where: {
            deleted: false,
          },
        },
        order_items: {
          where: {
            orders: {
              payment_status: PaymentStatus.COMPLETED,
            },
          },
          select: {
            price: true,
          },
        },
      },
    });

    // Sắp xếp theo số lượng enrollments và lấy top courses
    const sortedCourses = courses
      .map((course) => ({
        id: course.id,
        title: course.title,
        thumbnail: course.thumbnail || undefined,
        enrollments: course.enrollments.length,
        rating: Number(course.rating) || 0,
        revenue: course.order_items.reduce(
          (total, item) => total + Number(item.price),
          0,
        ),
      }))
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, limit);

    return sortedCourses;
  }

  private async getTotalRevenue(beforeDate?: Date): Promise<number> {
    const whereClause: Prisma.paymentsWhereInput = {
      deleted: false,
      status: PaymentStatus.COMPLETED,
    };

    if (beforeDate) {
      whereClause.processed_at = { lte: beforeDate };
    }

    const result = await this.prisma.payments.aggregate({
      where: whereClause,
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount) || 0;
  }

  private async getTodayRevenue(): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const result = await this.prisma.payments.aggregate({
      where: {
        deleted: false,
        status: PaymentStatus.COMPLETED,
        processed_at: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount) || 0;
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private formatTimestamp(date: Date | null): string {
    if (!date) return 'Unknown time';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString();
  }
}
