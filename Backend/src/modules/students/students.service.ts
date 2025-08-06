import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { USER_ROLE } from 'src/common/constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { UsersService } from 'src/modules/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from './../../utils/utils.service';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly utilsService: UtilsService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(query: PaginationQueryDto, rawQuery: Record<string, any>) {
    const whereCondition: Prisma.usersWhereInput =
      this.utilsService.buildWhereFromQuery(rawQuery);

    whereCondition.role = USER_ROLE.STUDENT;

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

  async findOne(id: string) {
    const student = await this.usersService.findUniqueUserByCondition({
      id,
      role: USER_ROLE.STUDENT,
    });
    if (!student) {
      throw new Error('Student not found');
    }
    const { password, ...dataFormat } = student;
    return dataFormat;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    const existingStudent = await this.usersService.findById(id);
    if (!existingStudent || existingStudent.role !== USER_ROLE.STUDENT) {
      throw new Error('Student not found');
    }

    const updatedData: Prisma.studentsUpdateInput =
      this.utilsService.cleanDto(updateStudentDto);

    return this.prisma.students.update({
      where: { user_id: id },
      data: updatedData,
    });
  }
}
