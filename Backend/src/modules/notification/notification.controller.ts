import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/decorator/customize';
import { IUser } from 'src/interface/users.interface';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Lấy danh sách notifications
   */
  @Get()
  @ApiOperation({ summary: '📋 Get my notifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unread_only', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async getMyNotifications(
    @CurrentUser() user: IUser,
    @Query('limit') limit?: string,
    @Query('unread_only') unreadOnly?: string,
  ) {
    return this.notificationService.getMyNotifications(user.id, {
      limit: limit ? parseInt(limit) : 50,
      unreadOnly: unreadOnly === 'true',
    });
  }

  /**
   * Đếm số notification chưa đọc
   */
  @Get('unread-count')
  @ApiOperation({ summary: '🔢 Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Count retrieved successfully' })
  async getUnreadCount(@CurrentUser() user: IUser) {
    const count = await this.notificationService.getUnreadCount(user.id);
    return { count };
  }

  /**
   * Đánh dấu 1 notification đã đọc
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '✅ Mark notification as read' })
  @ApiResponse({ status: 204, description: 'Marked as read successfully' })
  async markAsRead(@CurrentUser() user: IUser, @Param('id') id: string) {
    await this.notificationService.markAsRead(user.id, id);
  }

  /**
   * Đánh dấu tất cả đã đọc
   */
  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '✅ Mark all notifications as read' })
  @ApiResponse({ status: 204, description: 'All marked as read successfully' })
  async markAllAsRead(@CurrentUser() user: IUser) {
    await this.notificationService.markAllAsRead(user.id);
  }

  /**
   * Xóa notification
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '🗑️ Delete notification' })
  @ApiResponse({
    status: 204,
    description: 'Notification deleted successfully',
  })
  async deleteNotification(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
  ) {
    await this.notificationService.deleteNotification(user.id, id);
  }
}
