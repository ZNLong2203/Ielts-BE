import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FileType, TEACHER_STATUS, USER_ROLE } from 'src/common/constants';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { UploadedFileType } from 'src/interface/file-type.interface';
import { FilesService } from 'src/modules/files/files.service';
import { UsersService } from 'src/modules/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UtilsService } from 'src/utils/utils.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import {
  UpdateAvailabilityDto,
  UpdateTeacherDto,
  UpdateTeacherStatusDto,
} from './dto/update-teacher.dto';

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);

  constructor(
    private readonly utilsService: UtilsService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly filesService: FilesService,
  ) {}
  create(createTeacherDto: CreateTeacherDto) {
    return 'This action adds a new teacher';
  }

  async findAll(query: PaginationQueryDto, rawQuery: Record<string, any>) {
    const whereCondition: Prisma.usersWhereInput =
      this.utilsService.buildWhereFromQuery(rawQuery);

    whereCondition.role = USER_ROLE.TEACHER;

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
        teachers: {
          select: {
            experience_years: true,
            ielts_band_score: true,
          },
        },
      },
      where: whereCondition,
    });
  }

  // find all new registered teachers
  async findNewTeachers(
    query: PaginationQueryDto,
    rawQuery: Record<string, any>,
  ) {
    const whereCondition: Prisma.usersWhereInput =
      this.utilsService.buildWhereFromQuery(rawQuery);

    whereCondition.role = USER_ROLE.TEACHER;

    // check status in table teachers is PENDING
    whereCondition.teachers = {
      status: TEACHER_STATUS.PENDING,
    };

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
        teachers: {
          select: {
            experience_years: true,
            ielts_band_score: true,
          },
        },
      },
      where: whereCondition,
    });
  }

  async findOne(id: string) {
    const teacher = await this.usersService.findUniqueUserByCondition({
      id,
      role: USER_ROLE.TEACHER,
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }
    const { password, ...dataFormat } = teacher;
    return dataFormat;
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto) {
    const existingTeacher = await this.usersService.findById(id);
    if (!existingTeacher || existingTeacher.role !== USER_ROLE.TEACHER) {
      throw new Error('Teacher not found');
    }

    const updatedData: Prisma.teachersUpdateInput =
      this.utilsService.cleanDto(updateTeacherDto);

    return this.prisma.teachers.update({
      where: { user_id: id },
      data: updatedData,
    });
  }

  async updateStatus(
    id: string,
    updateTeacherStatusDto: UpdateTeacherStatusDto,
  ) {
    const existingTeacher = await this.usersService.findById(id);
    if (!existingTeacher || existingTeacher.role !== USER_ROLE.TEACHER) {
      throw new Error('Teacher not found');
    }

    return this.prisma.teachers.update({
      where: { user_id: id },
      data: {
        status: updateTeacherStatusDto.status,
      },
    });
  }

  async updateCertificate(id: string, file: UploadedFileType) {
    const existingTeacher = await this.usersService.findById(id);
    if (!existingTeacher || existingTeacher.role !== USER_ROLE.TEACHER) {
      throw new NotFoundException('Teacher not found');
    }

    const fileData = await this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      FileType.TEACHER_CERTIFICATE,
    );

    return this.prisma.teachers.update({
      where: { user_id: id },
      data: {
        certificate_urls: {
          push: fileData.url,
        },
      },
    });
  }

  async scheduleAvailability(
    id: string,
    availabilityDto: UpdateAvailabilityDto,
  ) {
    const existingTeacher = await this.usersService.findById(id);
    if (!existingTeacher || existingTeacher.role !== USER_ROLE.TEACHER) {
      throw new NotFoundException('Teacher not found');
    }

    try {
      // Truy cập trực tiếp vào trường availability từ DTO
      const { availability } = availabilityDto;

      // Kiểm tra cấu trúc dữ liệu cơ bản
      if (!availability || typeof availability !== 'object') {
        throw new BadRequestException('Invalid availability schedule format');
      }

      // Thêm validation chi tiết
      this.validateAvailabilitySchedule(availability);

      return this.prisma.teachers.update({
        where: { user_id: id },
        data: {
          availability: availability as unknown as Prisma.InputJsonValue,
        },
        select: {
          id: true,
          availability: true,
          updated_at: true,
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to update availability schedule',
      );
    }
  }

  /**
   * Hàm kiểm tra tính hợp lệ của lịch làm việc
   * @param availability Dữ liệu lịch làm việc
   * @throws BadRequestException nếu dữ liệu không hợp lệ
   */
  private validateAvailabilitySchedule(
    availability: Record<string, Array<{ start: string; end: string }>>,
  ) {
    // Danh sách các ngày trong tuần hợp lệ
    const validDays = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    // Regex cho định dạng thời gian HH:MM
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

    // Kiểm tra từng key (ngày trong tuần)
    for (const day of Object.keys(availability)) {
      // Kiểm tra tên ngày hợp lệ
      if (!validDays.includes(day.toLowerCase())) {
        throw new BadRequestException(
          `Invalid day: "${day}". Valid days are: ${validDays.join(', ')}`,
        );
      }

      // Kiểm tra giá trị là mảng
      const slots = availability[day];
      if (!Array.isArray(slots)) {
        throw new BadRequestException(
          `Time slots for "${day}" must be an array`,
        );
      }

      // Kiểm tra từng khung giờ
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];

        // Kiểm tra định dạng slot
        if (!slot || typeof slot !== 'object') {
          throw new BadRequestException(
            `Invalid time slot format at "${day}[${i}]"`,
          );
        }

        // Kiểm tra start và end tồn tại
        if (!slot.start || !slot.end) {
          throw new BadRequestException(
            `Missing start or end time at "${day}[${i}]"`,
          );
        }

        // Kiểm tra định dạng start
        if (!timePattern.test(slot.start)) {
          throw new BadRequestException(
            `Invalid start time format at "${day}[${i}]". Must be HH:MM format.`,
          );
        }

        // Kiểm tra định dạng end
        if (!timePattern.test(slot.end)) {
          throw new BadRequestException(
            `Invalid end time format at "${day}[${i}]". Must be HH:MM format.`,
          );
        }

        // Kiểm tra thời gian kết thúc lớn hơn thời gian bắt đầu
        const [startHour, startMin] = slot.start.split(':').map(Number);
        const [endHour, endMin] = slot.end.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (endMinutes <= startMinutes) {
          throw new BadRequestException(
            `End time (${slot.end}) must be after start time (${slot.start}) at "${day}[${i}]"`,
          );
        }
      }

      // Kiểm tra các slot không chồng chéo
      this.validateNonOverlappingSlots(slots, day);
    }
  }

  /**
   * Kiểm tra các khoảng thời gian không chồng chéo lên nhau
   */
  private validateNonOverlappingSlots(
    slots: Array<{ start: string; end: string }>,
    day: string,
  ) {
    if (slots.length <= 1) return; // Không cần kiểm tra nếu chỉ có 0-1 slot

    // Sắp xếp theo thời gian bắt đầu
    slots.sort((a, b) => {
      const [aHour, aMin] = a.start.split(':').map(Number);
      const [bHour, bMin] = b.start.split(':').map(Number);

      const aMinutes = aHour * 60 + aMin;
      const bMinutes = bHour * 60 + bMin;

      return aMinutes - bMinutes;
    });

    // Kiểm tra từng cặp liền kề
    for (let i = 0; i < slots.length - 1; i++) {
      const currentSlot = slots[i];
      const nextSlot = slots[i + 1];

      const [currentEndHour, currentEndMin] = currentSlot.end
        .split(':')
        .map(Number);
      const [nextStartHour, nextStartMin] = nextSlot.start
        .split(':')
        .map(Number);

      const currentEndMinutes = currentEndHour * 60 + currentEndMin;
      const nextStartMinutes = nextStartHour * 60 + nextStartMin;

      // Nếu thời gian kết thúc của slot hiện tại >= thời gian bắt đầu của slot tiếp theo
      if (currentEndMinutes > nextStartMinutes) {
        throw new BadRequestException(
          `Overlapping time slots in "${day}": ${currentSlot.start}-${currentSlot.end} and ${nextSlot.start}-${nextSlot.end}`,
        );
      }
    }
  }
}
