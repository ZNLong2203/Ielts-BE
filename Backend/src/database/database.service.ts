import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from 'src/modules/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async createAdminUser() {
    const email = 'admin@example.com';
    const password = 'Admin@123';

    const existing = await this.prisma.users.findUnique({ where: { email } });
    if (existing) {
      this.logger.log(`Admin user already exists: ${email}`);
      return existing;
    }

    const admin = await this.prisma.users.create({
      data: {
        email,
        password: this.usersService.getHashPassword(password),
        role: 'ADMIN',
        status: 'active',
        email_verified: true,
      },
    });

    this.logger.log(`Created admin user: ${email}`);
    return admin;
  }
}
