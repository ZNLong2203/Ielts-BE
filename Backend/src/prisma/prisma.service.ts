import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createSoftDeleteExtension } from 'prisma-extension-soft-delete';

function createExtendedPrisma(base: PrismaClient) {
  return base.$extends(
    createSoftDeleteExtension({
      models: {
        users: true,
        students: true,
        teachers: true,
        blog_categories: true,
        blog_comments: true,
        blogs: true,
        cart_items: true,
        carts: true,
        coupon_usage: true,
        coupons: true,
        course_categories: true,
        courses: true,
        enrollments: true,
        exercise_types: true,
        exercises: true,
        learning_paths: true,
        lesson_notes: true,
        lessons: true,
        mock_tests: true,
        order_items: true,
        orders: true,
        payments: true,
        question_answers: true,
        question_options: true,
        questions: true,
        test_results: true,
        user_learning_paths: true,
        user_progress: true,
        user_submissions: true,
      },
    }),
  );
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  public readonly prisma: ReturnType<typeof createExtendedPrisma>;

  constructor() {
    super();
    this.prisma = createExtendedPrisma(this);
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
