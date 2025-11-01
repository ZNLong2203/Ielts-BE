import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/modules/auth/auth.service';

export interface AuthenSocket extends Socket {
  data: {
    userId?: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> socketIds

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // log origin on module init
  onModuleInit() {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const namespace = '/notifications';

    // Log config khi init
    this.logger.log(`WebSocket Gateway initialized`);
    this.logger.log(`CORS allowed origin: ${frontendUrl}`);
    this.logger.log(`Namespace: ${namespace}`);
    this.logger.log(
      `JWT Access Secret loaded: ${this.configService.get('JWT_ACCESS_SECRET') ? 'Yes' : 'No'}`,
    );

    // Middleware - log mỗi connection request
    this.server.use((socket, next) => {
      const origin = socket.handshake.headers.origin;
      const userAgent = socket.handshake.headers['user-agent'];

      this.logger.debug(`Connection from: ${origin || 'same-origin'}`);
      this.logger.debug(`User-Agent: ${userAgent}`);

      next();
    });
  }

  /**
   * Xử lý khi user connect
   */
  async handleConnection(client: AuthenSocket) {
    try {
      // Lấy token
      const token: string | undefined =
        (client.handshake.auth?.token as string) ||
        (typeof client.handshake.headers?.authorization === 'string'
          ? client.handshake.headers.authorization.replace('Bearer ', '')
          : undefined) ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`Client ${client.id} - No token provided`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = await this.authService.verifyAccessToken(token);

      const userId = payload?.id;

      if (!userId) {
        this.logger.warn(`Client ${client.id} - Invalid token payload`);
        client.emit('error', { message: 'Invalid token' });
        client.disconnect();
        return;
      }

      // Lưu mapping userId -> socketId
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      client.data.userId = userId;

      this.logger.log(
        `User ${userId} connected - Socket: ${client.id} - Devices: ${this.userSockets.get(userId)!.size}`,
      );

      client.emit('connected', {
        userId,
        message: 'Connected to notification server',
      });
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Connection error: ${e.message}`);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  /**
   * Xử lý khi user disconnect
   */
  handleDisconnect(client: AuthenSocket) {
    const userId = client.data.userId;

    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      if (!sockets) return;
      sockets.delete(client.id);

      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        this.logger.log(`User ${userId} disconnected - All devices offline`);
      } else {
        this.logger.log(
          `User ${userId} disconnected - Socket: ${client.id} - Remaining: ${sockets.size}`,
        );
      }
    }
  }

  /**
   * Gửi notification real-time cho user
   * Return true nếu user online, false nếu offline
   */
  sendNotificationToUser(userId: string, notification: any): boolean {
    const socketIds = this.userSockets.get(userId);

    if (socketIds && socketIds.size > 0) {
      // User online - gửi real-time
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit('new_notification', notification);
      });

      this.logger.log(
        `Sent real-time notification to user ${userId} - ${socketIds.size} device(s)`,
      );
      return true;
    }

    // User offline
    this.logger.log(`User ${userId} offline - Will send email`);
    return false;
  }

  /**
   * Check user online status
   */
  isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
    );
  }
}
