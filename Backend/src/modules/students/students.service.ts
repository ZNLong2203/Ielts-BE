import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Role } from 'src/casl/casl.interface';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from './../../utils/utils.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly utilsService: UtilsService,
    private readonly prisma: PrismaService,
  ) {}
  create(createStudentDto: CreateStudentDto) {
    return 'This action adds a new student';
  }

  async findAll(query: PaginationQueryDto) {
    const whereCondition: Prisma.usersWhereInput = {
      role: Role.STUDENT,
    };
    if (query.search) {
      whereCondition.OR = [
        { full_name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.utilsService.paginate<
      Prisma.usersWhereInput,
      Prisma.usersInclude,
      Prisma.usersSelect,
      Prisma.usersOrderByWithRelationInput
    >({
      model: this.prisma.users,
      query,
      defaultOrderBy: { created_at: 'desc' },
      include: {
        students: true,
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
