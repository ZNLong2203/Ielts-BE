import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, users } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  FileType,
  TEACHER_STATUS,
  USER_ROLE,
  USER_STATUS,
} from 'src/common/constants';
import { UploadedFileType } from 'src/interface/file-type.interface';
import { FilesService } from 'src/modules/files/files.service';
import {
  RegisterStudentDto,
  RegisterTeacherDto,
} from 'src/modules/users/dto/create-user.dto';
import {
  ResetTeacherPasswordDto,
  UpdateStatusDto,
  UpdateUserDto,
} from 'src/modules/users/dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { UtilsService } from 'src/utils/utils.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private utilsService: UtilsService,
    private filesService: FilesService,
  ) {}
  getHashPassword(password: string) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }

  isValidPassword(user: users, password: string) {
    return bcrypt.compareSync(password, user.password);
  }

  async registerStudent(dto: RegisterStudentDto) {
    try {
      // Kiểm tra email đã tồn tại chưa
      const existing = await this.prisma.users.findUnique({
        where: { email: dto.email, status: USER_STATUS.ACTIVE },
      });
      if (existing) throw new BadRequestException('Email already exists');

      // Hash password
      const hashedPassword = this.getHashPassword(dto.password);

      // generate email verification token unique, if exists, generate again
      let token = uuidv4();
      let existingToken = await this.prisma.users.findFirst({
        where: { email_verification_token: token },
      });
      while (existingToken) {
        token = uuidv4();
        existingToken = await this.prisma.users.findFirst({
          where: { email_verification_token: token },
        });
      }

      const result = await this.prisma.$transaction(async (tx) => {
        // Thực hiện các thao tác database bên trong transaction
        // Tạo user
        const userData: Prisma.usersCreateInput = {
          email: dto.email,
          password: hashedPassword,
          full_name: dto.full_name,
          email_verification_token: token,
          email_verified: false,
          role: USER_ROLE.STUDENT,
          status: USER_STATUS.INACTIVE,
        };
        if (dto.date_of_birth) {
          userData.date_of_birth = dto.date_of_birth;
        }
        if (dto.gender) {
          userData.gender = dto.gender;
        }
        if (dto.country) {
          userData.country = dto.country;
        }
        if (dto.city) {
          userData.city = dto.city;
        }
        const user = await tx.users.create({
          data: userData,
        });

        // Tạo student
        const studentData: Prisma.studentsCreateInput = {
          users: {
            connect: {
              id: user.id,
            },
          },
          learning_goals: [],
        };
        if (dto.english_level) {
          studentData.current_level = dto.english_level;
        }
        if (dto.target_band_score) {
          studentData.target_ielts_score = dto.target_band_score;
        }
        const student = await tx.students.create({
          data: studentData,
        });

        return {
          user,
          student,
          token,
        };
      });

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // Ném lại lỗi nếu là BadRequestException
      }
      throw new BadRequestException('Registration failed');
    }
  }

  async registerTeacher(dto: RegisterTeacherDto, file: UploadedFileType) {
    try {
      // Kiểm tra email đã tồn tại chưa
      const existing = await this.prisma.users.findUnique({
        where: { email: dto.email, status: USER_STATUS.ACTIVE },
      });
      if (existing) throw new BadRequestException('Email already exists');

      const { ielts_band_score, experience_years } = dto;

      // validate ielts_band_score can transform to number, and is between 0 and 9
      if (ielts_band_score && isNaN(Number(ielts_band_score))) {
        throw new BadRequestException('Invalid IELTS band score');
      }
      if (
        ielts_band_score &&
        (Number(ielts_band_score) < 0 || Number(ielts_band_score) > 9)
      ) {
        throw new BadRequestException(
          'IELTS band score must be between 0 and 9',
        );
      }

      // validate experience_years can transform to number, and is positive
      if (experience_years && isNaN(Number(experience_years))) {
        throw new BadRequestException('Invalid experience years');
      }
      if (experience_years && Number(experience_years) < 0) {
        throw new BadRequestException('Experience years must be positive');
      }

      // Hash password
      const hashedPassword = this.getHashPassword(dto.password);

      // generate email verification token unique, if exists, generate again
      let token = uuidv4();
      let existingToken = await this.prisma.users.findFirst({
        where: { email_verification_token: token },
      });
      while (existingToken) {
        token = uuidv4();
        existingToken = await this.prisma.users.findFirst({
          where: { email_verification_token: token },
        });
      }

      // Kiểm tra file upload
      if (!file || !file.buffer || !file.originalname) {
        throw new BadRequestException(
          'File is required for teacher registration',
        );
      }

      // Lưu file lên Cloudinary
      const fileData = await this.filesService.uploadFile(
        file.buffer,
        file.originalname,
        FileType.TEACHER_CERTIFICATE,
      );

      const result = await this.prisma.$transaction(async (tx) => {
        // Thực hiện các thao tác database bên trong transaction
        // Tạo user
        const user = await tx.users.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            full_name: dto.full_name,
            phone: dto.phone,
            date_of_birth: dto.date_of_birth,
            gender: dto.gender,
            country: dto.country,
            city: dto.city,
            email_verification_token: null,
            email_verified: false,
            password_reset_token: token,
            password_reset_expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            role: USER_ROLE.TEACHER,
            status: USER_STATUS.INACTIVE,
          },
        });

        // Tạo teacher profile
        const teacher = await tx.teachers.create({
          data: {
            user_id: user.id,
            qualification: dto.qualification,
            experience_years: Number(experience_years),
            ielts_band_score: Number(ielts_band_score),
            certificate_urls: [fileData.url],
            specializations: dto.specializations,
          },
        });

        return {
          user,
          teacher,
          token,
        };
      });

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error);
      }
      console.error('Error during teacher registration:', error);
      throw new BadRequestException('Registration failed');
    }
  }

  async verifyEmail(token: string) {
    // Tìm user theo token
    const user = await this.prisma.users.findFirst({
      where: { email_verification_token: token },
    });

    if (!user) throw new BadRequestException('Invalid verification token');

    // Cập nhật trạng thái đã xác thực
    return await this.prisma.users.update({
      where: { id: user.id },
      data: {
        email_verified: true,
        email_verification_token: null, // Xoá token sau khi xác thực
        status: USER_STATUS.ACTIVE, // Cập nhật trạng thái thành ACTIVE
      },
    });
  }

  async resetTeacherPassword(token: string, dto: ResetTeacherPasswordDto) {
    // Tìm user theo token
    const user = await this.prisma.users.findFirst({
      where: { password_reset_token: token },
    });

    if (!user) throw new BadRequestException('Invalid reset token');
    if (
      user.password_reset_expires &&
      user.password_reset_expires < new Date()
    ) {
      throw new BadRequestException('Reset token has expired');
    }

    // Kiểm tra mật khẩu mới có hợp lệ không
    if (dto.new_password !== dto.confirm_password) {
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }

    // Cập nhật mật khẩu
    const hashedPassword = this.getHashPassword(dto.new_password);
    return await this.prisma.$transaction(async (tx) => {
      // Thực hiện các thao tác database bên trong transaction
      // Cập nhật mật khẩu và xoá token
      const userUpdate = await tx.users.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          password_reset_token: null, // Xoá token sau khi đặt lại mật khẩu
          password_reset_expires: null, // Xoá thời gian hết hạn token
          status: USER_STATUS.ACTIVE, // Cập nhật trạng thái thành ACTIVE
          email_verification_token: null, // Xoá token xác thực email nếu có
          email_verified: true, // Đánh dấu email đã được xác thực
        },
      });

      const teacher = await tx.teachers.update({
        where: { user_id: user.id },
        data: {
          status: TEACHER_STATUS.APPROVED,
        },
      });

      return {
        userUpdate,
        teacher,
      };
    });
  }

  async findUniqueUserByCondition(
    whereCondition: Prisma.usersWhereUniqueInput,
  ) {
    const user = await this.prisma.users.findUnique({
      where: whereCondition,
      include: {
        // Chỉ include students nếu role là STUDENT
        students: {
          where: {
            users: {
              role: USER_ROLE.STUDENT,
            },
          },
        },
        // Chỉ include teachers nếu role là TEACHER
        teachers: {
          where: {
            users: {
              role: USER_ROLE.TEACHER,
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    switch (user.role) {
      case USER_ROLE.STUDENT: {
        // Nếu là STUDENT, loại bỏ teachers
        const { teachers, ...studentUser } = user;
        return studentUser;
      }

      case USER_ROLE.TEACHER: {
        // Nếu là TEACHER, loại bỏ students
        const { students, ...teacherUser } = user;
        return teacherUser;
      }

      default: {
        // Trường hợp khác (ADMIN, v.v.), loại bỏ cả hai
        const { students, teachers, ...otherUser } = user;
        return otherUser;
      }
    }
  }

  async findByEmail(email: string) {
    return await this.findUniqueUserByCondition({ email });
  }

  async findById(id: string) {
    return await this.findUniqueUserByCondition({ id });
  }

  async findByRefreshToken(refreshToken: string) {
    const userId = await this.redisService.get(`refresh_token:${refreshToken}`);
    if (userId) {
      return await this.findUniqueUserByCondition({ id: userId });
    }
    return null;
  }

  async updateUser(id: string, data: Partial<users>) {
    return await this.prisma.users.update({
      where: { id },
      data,
    });
  }

  async updateProfile(id: string, updateProfileDto: UpdateUserDto) {
    // Kiểm tra xem người dùng có tồn tại không
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }
    const updateData: Partial<users> =
      this.utilsService.cleanDto(updateProfileDto);
    return await this.updateUser(id, updateData);
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    const { status } = dto;
    // Kiểm tra xem người dùng có tồn tại không
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }
    const validStatuses = Object.values(USER_STATUS);
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    return await this.updateUser(id, { status });
  }

  async updateAvatar(id: string, file: UploadedFileType) {
    // Kiểm tra xem người dùng có tồn tại không
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    // Kiểm tra file upload
    if (!file || !file.buffer || !file.originalname) {
      throw new BadRequestException('File is required for avatar upload');
    }

    // Lưu file lên Cloudinary
    const fileData = await this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      FileType.USER_AVATAR,
    );

    // Cập nhật avatar URL trong cơ sở dữ liệu
    return await this.updateUser(id, { avatar: fileData.url });
  }
}
