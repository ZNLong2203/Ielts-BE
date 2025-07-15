import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Role } from 'src/casl/casl.interface';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from './../../utils/utils.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);
  constructor(
    private readonly utilsService: UtilsService,
    private readonly prisma: PrismaService,
  ) {}
  create(createStudentDto: CreateStudentDto) {
    return 'This action adds a new student';
  }

  async findAll(query: PaginationQueryDto, rawQuery: Record<string, any>) {
    const whereCondition: Prisma.usersWhereInput =
      this.utilsService.buildWhereFromQuery(rawQuery);

    whereCondition.role = Role.STUDENT;
    console.log('whereCondition', whereCondition);

    return this.utilsService.paginate<
      Prisma.usersWhereInput,
      Prisma.usersInclude,
      Prisma.usersSelect,
      Prisma.usersOrderByWithRelationInput
    >({
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

  findOne(id: number) {
    return `This action returns a #${id} student`;
  }

  update(id: number, updateStudentDto: UpdateStudentDto) {
    return `This action updates a #${id} student`;
  }

  remove(id: number) {
    return `This action removes a #${id} student`;
  }
}
