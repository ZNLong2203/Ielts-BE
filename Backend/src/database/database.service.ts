import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { USER_ROLE } from 'src/common/constants';
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
        role: 'ADMIN', // ensure this is a valid enum in your schema
        status: 'active',
        email_verified: true,
      },
    });

    this.logger.log(`Created admin user: ${email}`);
    return admin;
  }

  async seedSampleData() {
    this.logger.log('Start seeding sample data...');

    await this.seedTeachers();
    await this.seedStudents();

    this.logger.log('Sample data seeding completed!');
  }

  // Seed dữ liệu giáo viên
  private async seedTeachers() {
    const teacherData = [
      {
        email: 'john.smith@example.com',
        password: 'Password123#',
        full_name: 'John Smith',
        phone: '0901234567',
        date_of_birth: new Date('1985-06-15'),
        gender: 'male',
        country: 'United Kingdom',
        city: 'London',
        qualification: 'PhD in English Literature from Oxford University',
        experience_years: 10,
        specializations: ['reading', 'writing'],
        ielts_band_score: 8.5,
        certificate_urls: [
          'https://example.com/certificates/cert1.pdf',
          'https://example.com/certificates/cert2.pdf',
        ],
        teaching_style: 'Interactive and student-centered approach',
        hourly_rate: 50.0,
      },
      {
        email: 'emily.johnson@example.com',
        password: 'Password123#',
        full_name: 'Emily Johnson',
        phone: '0901234568',
        date_of_birth: new Date('1988-03-22'),
        gender: 'female',
        country: 'United States',
        city: 'New York',
        qualification: 'Masters in TESOL from Columbia University',
        experience_years: 7,
        specializations: ['speaking', 'listening'],
        ielts_band_score: 8.0,
        certificate_urls: ['https://example.com/certificates/cert3.pdf'],
        teaching_style: 'Communicative language teaching',
        hourly_rate: 45.0,
      },
      {
        email: 'michael.brown@example.com',
        password: 'password123',
        full_name: 'Michael Brown',
        phone: '0901234569',
        date_of_birth: new Date('1985-11-30'),
        gender: 'male',
        country: 'Canada',
        city: 'Toronto',
        qualification: 'PhD in Linguistics from University of Toronto',
        experience_years: 12,
        specializations: ['grammar', 'pronunciation'],
        ielts_band_score: 8.7,
        certificate_urls: [
          'https://example.com/certificates/cert4.pdf',
          'https://example.com/certificates/cert5.pdf',
        ],
        teaching_style: 'Task-based language teaching',
        hourly_rate: 55.0,
      },
      {
        email: 'sophia.wilson@example.com',
        password: 'password123',
        full_name: 'Sophia Wilson',
        phone: '0901234570',
        date_of_birth: new Date('1990-02-14'),
        gender: 'female',
        country: 'Australia',
        city: 'Sydney',
        qualification:
          'Masters in Applied Linguistics from University of Sydney',
        experience_years: 5,
        specializations: ['writing', 'reading'],
        ielts_band_score: 8.2,
        certificate_urls: ['https://example.com/certificates/cert6.pdf'],
        teaching_style: 'Content-based instruction',
        hourly_rate: 48.0,
      },
      {
        email: 'david.jones@example.com',
        password: 'password123',
        full_name: 'David Jones',
        phone: '0901234571',
        date_of_birth: new Date('1992-07-19'),
        gender: 'male',
        country: 'United Kingdom',
        city: 'Manchester',
        qualification: 'CELTA from Cambridge University',
        experience_years: 4,
        specializations: ['business English', 'negotiation skills'],
        ielts_band_score: 7.5,
        certificate_urls: ['https://example.com/certificates/cert7.pdf'],
        teaching_style: 'Communicative approach',
        hourly_rate: 42.0,
      },
      {
        email: 'olivia.martinez@example.com',
        password: 'password123',
        full_name: 'Olivia Martinez',
        phone: '0901234572',
        date_of_birth: new Date('1989-09-25'),
        gender: 'female',
        country: 'Spain',
        city: 'Madrid',
        qualification:
          'Masters in Education from Universidad Complutense de Madrid',
        experience_years: 6,
        specializations: ['test preparation', 'academic writing'],
        ielts_band_score: 8.0,
        certificate_urls: ['https://example.com/certificates/cert8.pdf'],
        teaching_style: 'Project-based learning',
        hourly_rate: 46.0,
      },
      {
        email: 'james.taylor@example.com',
        password: 'password123',
        full_name: 'James Taylor',
        phone: '0901234573',
        date_of_birth: new Date('1987-12-05'),
        gender: 'male',
        country: 'New Zealand',
        city: 'Auckland',
        qualification: 'PhD in Education from University of Auckland',
        experience_years: 9,
        specializations: ['curriculum design', 'teacher training'],
        ielts_band_score: 8.8,
        certificate_urls: ['https://example.com/certificates/cert9.pdf'],
        teaching_style: 'Inquiry-based learning',
        hourly_rate: 52.0,
      },
      {
        email: 'isabella.anderson@example.com',
        password: 'password123',
        full_name: 'Isabella Anderson',
        phone: '0901234574',
        date_of_birth: new Date('1995-04-10'),
        gender: 'female',
        country: 'Italy',
        city: 'Rome',
        qualification: 'CELTA from International House Rome',
        experience_years: 3,
        specializations: ['young learners', 'creative writing'],
        ielts_band_score: 7.0,
        certificate_urls: ['https://example.com/certificates/cert10.pdf'],
        teaching_style: 'Play-based learning',
        hourly_rate: 40.0,
      },
    ];

    for (const teacher of teacherData) {
      const existing = await this.prisma.users.findUnique({
        where: { email: teacher.email },
      });

      if (existing) {
        this.logger.log(`Teacher already exists: ${teacher.email}`);
        continue;
      }

      try {
        await this.prisma.$transaction(async (tx) => {
          // Tạo user cho teacher
          const user = await tx.users.create({
            data: {
              email: teacher.email,
              password: this.usersService.getHashPassword(teacher.password),
              full_name: teacher.full_name,
              phone: teacher.phone,
              date_of_birth: teacher.date_of_birth,
              gender: teacher.gender,
              country: teacher.country,
              city: teacher.city,
              role: USER_ROLE.TEACHER,
              status: 'active',
              email_verified: true,
            },
          });

          // Tạo teacher profile
          await tx.teachers.create({
            data: {
              user_id: user.id,
              qualification: teacher.qualification,
              experience_years: teacher.experience_years,
              specializations: teacher.specializations,
              ielts_band_score: new Decimal(teacher.ielts_band_score),
              certificate_urls: teacher.certificate_urls,
              teaching_style: teacher.teaching_style,
              hourly_rate: new Decimal(teacher.hourly_rate),
              availability: {
                monday: ['9:00-12:00', '13:00-17:00'],
                wednesday: ['13:00-17:00'],
                friday: ['9:00-12:00'],
              },
              status: 'approved',
            },
          });
        });

        this.logger.log(`Created teacher: ${teacher.email}`);
      } catch (error) {
        this.logger.error(
          `Failed to create teacher ${teacher.email}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  // Seed dữ liệu học sinh
  private async seedStudents() {
    const studentData = [
      {
        email: 'nguyen.van.a@example.com',
        password: 'password123',
        full_name: 'Nguyễn Văn A',
        phone: '0912345671',
        date_of_birth: new Date('2000-01-15'),
        gender: 'male',
        country: 'Vietnam',
        city: 'Ho Chi Minh City',
        bio: 'I am a third-year university student majoring in International Business. I need IELTS for my exchange program.',
        target_ielts_score: 7.0,
        current_level: 5.5,
        learning_goals: [
          'Improve speaking fluency',
          'Enhance academic writing',
        ],
        timezone: 'Asia/Ho_Chi_Minh',
        language_preference: 'vi',
      },
      {
        email: 'tran.thi.b@example.com',
        password: 'password123',
        full_name: 'Trần Thị B',
        phone: '0912345672',
        date_of_birth: new Date('2001-03-22'),
        gender: 'female',
        country: 'Vietnam',
        city: 'Hanoi',
        bio: 'Preparing for graduate studies abroad. Currently working as an accountant.',
        target_ielts_score: 7.5,
        current_level: 6.0,
        learning_goals: [
          'Academic reading',
          'Academic writing',
          'Speaking confidence',
        ],
        timezone: 'Asia/Ho_Chi_Minh',
        language_preference: 'en',
      },
      {
        email: 'le.quoc.c@example.com',
        password: 'password123',
        full_name: 'Lê Quốc C',
        phone: '0912345673',
        date_of_birth: new Date('1998-05-10'),
        gender: 'male',
        country: 'Vietnam',
        city: 'Da Nang',
        bio: 'A software engineer aiming to work overseas.',
        target_ielts_score: 8.0,
        current_level: 6.5,
        learning_goals: ['Perfect writing skills', 'Expand vocabulary'],
        timezone: 'Asia/Ho_Chi_Minh',
        language_preference: 'en',
      },
      {
        email: 'pham.thanh.d@example.com',
        password: 'password123',
        full_name: 'Phạm Thanh D',
        phone: '0912345674',
        date_of_birth: new Date('2003-11-02'),
        gender: 'female',
        country: 'Vietnam',
        city: 'Hue',
        bio: 'First-year college student with a goal to study abroad.',
        target_ielts_score: 6.5,
        current_level: 4.5,
        learning_goals: ['Grammar improvement', 'Listening skills'],
        timezone: 'Asia/Ho_Chi_Minh',
        language_preference: 'vi',
      },
      {
        email: 'hoang.minh.e@example.com',
        password: 'password123',
        full_name: 'Hoàng Minh E',
        phone: '0912345675',
        date_of_birth: new Date('1999-08-19'),
        gender: 'male',
        country: 'Vietnam',
        city: 'Can Tho',
        bio: 'Business graduate looking to take IELTS for immigration.',
        target_ielts_score: 7.0,
        current_level: 5.0,
        learning_goals: ['Speaking fluency', 'Listening for accents'],
        timezone: 'Asia/Ho_Chi_Minh',
        language_preference: 'vi',
      },
      {
        email: 'ngo.thi.f@example.com',
        password: 'password123',
        full_name: 'Ngô Thị F',
        phone: '0912345676',
        date_of_birth: new Date('1997-12-30'),
        gender: 'female',
        country: 'Vietnam',
        city: 'Hai Phong',
        bio: 'English teacher wanting to improve for certification.',
        target_ielts_score: 8.0,
        current_level: 7.0,
        learning_goals: ['Native-like pronunciation', 'Essay writing'],
        timezone: 'Asia/Ho_Chi_Minh',
        language_preference: 'en',
      },
      {
        email: 'do.hoang.g@example.com',
        password: 'password123',
        full_name: 'Đỗ Hoàng G',
        phone: '0912345677',
        date_of_birth: new Date('2002-06-25'),
        gender: 'non-binary',
        country: 'Vietnam',
        city: 'Nha Trang',
        bio: 'High school graduate preparing for university abroad.',
        target_ielts_score: 6.5,
        current_level: 5.0,
        learning_goals: ['Writing tasks 1 & 2', 'Reading strategies'],
        timezone: 'Asia/Ho_Chi_Minh',
        language_preference: 'vi',
      },
      {
        email: 'vu.anh.h@example.com',
        password: 'password123',
        full_name: 'Vũ Anh H',
        phone: '0912345678',
        date_of_birth: new Date('2000-09-09'),
        gender: 'female',
        country: 'Vietnam',
        city: 'Vung Tau',
        bio: 'Marketing specialist aiming for 7.5 in IELTS.',
        target_ielts_score: 7.5,
        current_level: 6.0,
        learning_goals: ['Fluent communication', 'Academic writing'],
        timezone: 'Asia/Ho_Chi_Minh',
        language_preference: 'en',
      },
      {
        email: 'nguyen.phuc.i@example.com',
        password: 'password123',
        full_name: 'Nguyễn Phúc I',
        phone: '0912345679',
        date_of_birth: new Date('1996-04-05'),
        gender: 'male',
        country: 'Vietnam',
        city: 'Bien Hoa',
        bio: 'Working professional taking IELTS for work relocation.',
        target_ielts_score: 7.0,
        current_level: 5.5,
        learning_goals: ['Improve speaking', 'Email writing'],
        timezone: 'Asia/Ho_Chi_Minh',
        language_preference: 'en',
      },
      {
        email: 'truong.lan.j@example.com',
        password: 'password123',
        full_name: 'Trương Lan J',
        phone: '0912345680',
        date_of_birth: new Date('2004-02-17'),
        gender: 'female',
        country: 'Vietnam',
        city: 'Quy Nhon',
        bio: 'High school student aiming to get IELTS 6.5.',
        target_ielts_score: 6.5,
        current_level: 4.0,
        learning_goals: ['Basic grammar', 'Listening practice'],
        timezone: 'Asia/Ho_Chi_Minh',
        language_preference: 'vi',
      },
    ];

    for (const student of studentData) {
      const existing = await this.prisma.users.findUnique({
        where: { email: student.email },
      });

      if (existing) {
        this.logger.log(`Student already exists: ${student.email}`);
        continue;
      }

      try {
        await this.prisma.$transaction(async (tx) => {
          // Tạo user cho student
          const user = await tx.users.create({
            data: {
              email: student.email,
              password: this.usersService.getHashPassword(student.password),
              full_name: student.full_name,
              phone: student.phone,
              date_of_birth: student.date_of_birth,
              gender: student.gender,
              country: student.country,
              city: student.city,
              role: USER_ROLE.STUDENT,
              status: 'active',
              email_verified: true,
            },
          });

          // Tạo student profile
          await tx.students.create({
            data: {
              user_id: user.id,
              bio: student.bio,
              target_ielts_score: new Decimal(student.target_ielts_score),
              current_level: new Decimal(student.current_level),
              learning_goals: student.learning_goals,
              timezone: student.timezone,
              language_preference: student.language_preference,
            },
          });
        });

        this.logger.log(`Created student: ${student.email}`);
      } catch (error) {
        this.logger.error(
          `Failed to create student ${student.email}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
