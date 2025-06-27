import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private prisma: PrismaService) {}

  async createAdminUser() {
    const email = 'admin@example.com';
    const password = 'Admin@123';

    const existing = await this.prisma.users.findUnique({ where: { email } });
    if (existing) {
      this.logger.log(`Admin user already exists: ${email}`);
      return existing;
    }

    const hashed = await bcrypt.hash(password, 10);

    const admin = await this.prisma.users.create({
      data: {
        email,
        password: hashed,
        role: 'ADMIN', // ensure this is a valid enum in your schema
        status: 'active',
        email_verified: true,
      },
    });

    this.logger.log(`Created admin user: ${email}`);
    return admin;
  }
}
