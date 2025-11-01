import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo notification trong database
   */
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    const notification = await this.prisma.notifications.create({
      data: {
        user_id: data.userId,
        title: data.title,
        message: data.message,
        data: data.data,
        is_read: false,
        created_at: new Date(),
      },
    });

    this.logger.log(`Created notification for user ${data.userId}`);
    return notification;
  }

  /**
   * Lấy danh sách notifications
   */
  async getMyNotifications(
    userId: string,
    options?: { limit?: number; unreadOnly?: boolean },
  ) {
    const where: Prisma.notificationsWhereInput = {
      user_id: userId,
      deleted: false,
    };

    if (options?.unreadOnly) {
      where.is_read = false;
    }

    return this.prisma.notifications.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
      take: options?.limit || 50,
    });
  }

  /**
   * Đếm số notification chưa đọc
   */
  async getUnreadCount(userId: string) {
    return this.prisma.notifications.count({
      where: {
        user_id: userId,
        is_read: false,
        deleted: false,
      },
    });
  }

  /**
   * Đánh dấu 1 notification đã đọc
   */
  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notifications.updateMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  }

  /**
   * Đánh dấu tất cả đã đọc
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notifications.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  }

  /**
   * Xóa notification
   */
  async deleteNotification(userId: string, notificationId: string) {
    return this.prisma.notifications.updateMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
      data: {
        deleted: true,
      },
    });
  }
}
