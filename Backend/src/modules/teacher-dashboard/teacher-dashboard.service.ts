import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RecentSubmissionDto,
  TeacherDashboardDto,
  TeacherStatsDto,
} from './dto/teacher-dashboard.dto';

@Injectable()
export class TeacherDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData(teacherId: string): Promise<TeacherDashboardDto> {
    const [stats, recentSubmissions] = await Promise.all([
      this.getTeacherStats(teacherId),
      this.getRecentSubmissions(teacherId),
    ]);

    return {
      stats,
      recentSubmissions,
    };
  }

  async getTeacherStats(teacherId: string): Promise<TeacherStatsDto> {
    const currentDate = new Date();

    const weekStart = new Date();
    weekStart.setDate(currentDate.getDate() - 7);

    const previousWeekStart = new Date();
    previousWeekStart.setDate(currentDate.getDate() - 14);

    const previousWeekEnd = new Date();
    previousWeekEnd.setDate(currentDate.getDate() - 7);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Get current data for teacher (blogs and grading)
    const [
      totalBlogs,
      publishedBlogs,
      weeklyBlogs,
      pendingGrading,
      weeklyGraded,
      monthlyGraded,
    ] = await Promise.all([
      // Total blogs
      this.prisma.blogs.count({
        where: { author_id: teacherId, deleted: false },
      }),
      // Published blogs
      this.prisma.blogs.count({
        where: {
          author_id: teacherId,
          status: 'published',
          deleted: false,
        },
      }),
      // Blogs this week
      this.prisma.blogs.count({
        where: {
          author_id: teacherId,
          created_at: { gte: weekStart },
          deleted: false,
        },
      }),
      // Pending grading (writing + speaking submissions)
      this.prisma.user_submissions.count({
        where: {
          exercises: {
            skill_type: { in: ['writing', 'speaking'] },
          },
          status: 'submitted',
          deleted: false,
        },
      }),
      // Graded this week
      this.prisma.user_submissions.count({
        where: {
          exercises: {
            skill_type: { in: ['writing', 'speaking'] },
          },
          graded_by: teacherId,
          graded_at: { gte: weekStart },
          deleted: false,
        },
      }),
      // Graded this month
      this.prisma.user_submissions.count({
        where: {
          exercises: {
            skill_type: { in: ['writing', 'speaking'] },
          },
          graded_by: teacherId,
          graded_at: { gte: monthStart },
          deleted: false,
        },
      }),
    ]);

    // Get previous week data for growth comparison
    const [previousWeekBlogs, previousWeekGraded] = await Promise.all([
      this.prisma.blogs.count({
        where: {
          author_id: teacherId,
          deleted: false,
          created_at: {
            gte: previousWeekStart,
            lt: previousWeekEnd,
          },
        },
      }),
      this.prisma.user_submissions.count({
        where: {
          exercises: {
            skill_type: { in: ['writing', 'speaking'] },
          },
          graded_by: teacherId,
          graded_at: {
            gte: previousWeekStart,
            lt: previousWeekEnd,
          },
          deleted: false,
        },
      }),
    ]);

    return {
      pendingSubmissions: pendingGrading,
      totalBlogs,
      publishedBlogs,
      weeklyBlogs,
      weeklyGraded,
      monthlyGraded,
      blogGrowth: this.calculateGrowth(weeklyBlogs, previousWeekBlogs),
      gradingGrowth: this.calculateGrowth(weeklyGraded, previousWeekGraded),
    };
  }

  async getRecentSubmissions(
    teacherId: string,
    limit: number = 10,
  ): Promise<RecentSubmissionDto[]> {
    const submissions = await this.prisma.user_submissions.findMany({
      where: {
        exercises: {
          skill_type: { in: ['writing', 'speaking'] },
        },
        status: 'submitted',
        deleted: false,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        exercises: {
          select: {
            title: true,
            skill_type: true,
          },
        },
        users: {
          select: {
            full_name: true,
            avatar: true,
          },
        },
      },
    });

    return submissions.map((sub) => ({
      id: sub.id,
      studentName: sub.users?.full_name || 'Unknown Student',
      studentAvatar: sub.users?.avatar || undefined,
      courseTitle: '', // Not needed for grading context
      exerciseTitle: sub.exercises?.title || 'Unknown Exercise',
      type: sub.exercises?.skill_type || 'general',
      submittedAt: this.formatTimestamp(sub.created_at),
      status: sub.status || 'submitted',
    }));
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
