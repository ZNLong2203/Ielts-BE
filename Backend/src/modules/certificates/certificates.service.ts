import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MinioService } from '../files/minio.service';
import { GenerateCertificateDto } from './dto/generate-certificate.dto';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  async generateCertificate(
    userId: string,
    generateDto: GenerateCertificateDto,
  ): Promise<string> {
    // Get user info
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get combo enrollment
    const comboEnrollment = await this.prisma.combo_enrollments.findFirst({
      where: {
        id: generateDto.combo_enrollment_id,
        user_id: userId,
      },
      include: {
        combo_courses: true,
        users: true,
      },
    });

    if (!comboEnrollment) {
      throw new NotFoundException('Combo enrollment not found');
    }

    if (!comboEnrollment.combo_courses) {
      throw new NotFoundException('Combo courses not found');
    }

    if (Number(comboEnrollment.overall_progress_percentage) < 100) {
      throw new Error('Combo must be 100% completed to generate certificate');
    }

    // Check if certificate already exists
    if (comboEnrollment.certificate_url) {
      return comboEnrollment.certificate_url;
    }

    this.logger.log(
      `Generating certificate for user ${userId} and combo ${comboEnrollment.combo_courses.name}`,
    );

    // Generate SVG certificate
    const svg = this.generateCertificateSVG(
      user.full_name || 'Student',
      comboEnrollment.combo_courses.name,
      new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    );

    // Upload as SVG first
    const filename = `certificate-${comboEnrollment.id}-${Date.now()}.svg`;
    const svgBuffer = Buffer.from(svg);

    // Upload to MinIO as document
    const uploadResult = await this.minioService.uploadDocument(
      svgBuffer,
      filename,
      'image/svg+xml',
    );

    // Update certificate_url in database
    await this.prisma.combo_enrollments.update({
      where: { id: comboEnrollment.id },
      data: { certificate_url: uploadResult.url },
    });

    this.logger.log(`Certificate generated and uploaded: ${uploadResult.url}`);
    return uploadResult.url;
  }

  async getCertificates(userId: string) {
    const comboEnrollments = await this.prisma.combo_enrollments.findMany({
      where: {
        user_id: userId,
        certificate_url: { not: null },
      },
      include: {
        combo_courses: true,
        users: {
          select: {
            full_name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    return comboEnrollments.map((enrollment) => ({
      id: enrollment.id,
      title: enrollment.combo_courses?.name || 'Unknown',
      description: enrollment.combo_courses?.description || '',
      certificate_url: enrollment.certificate_url,
      issued_at: enrollment.updated_at,
      progress: Number(enrollment.overall_progress_percentage),
      thumbnail: enrollment.combo_courses?.thumbnail || null,
    }));
  }

  private generateCertificateHTML(
    studentName: string,
    comboName: string,
    date: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px;
      height: 800px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
    }
    .cert-container {
      width: 1100px;
      height: 700px;
      background: white;
      padding: 40px;
      position: relative;
      overflow: hidden;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #667eea;
      letter-spacing: 2px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 48px;
      font-weight: bold;
      color: #2d3748;
      margin-bottom: 30px;
      text-decoration: underline;
      text-decoration-color: #667eea;
    }
    .body-text {
      text-align: center;
      font-size: 18px;
      color: #4a5568;
      line-height: 1.8;
      margin: 40px 0;
    }
    .student-name {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
      margin: 20px 0;
      text-transform: uppercase;
      text-align: center;
    }
    .combo-name {
      font-size: 24px;
      color: #764ba2;
      font-weight: 600;
      margin: 30px 0;
      font-style: italic;
      text-align: center;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
    }
    .signature {
      text-align: center;
    }
    .signature-line {
      width: 200px;
      height: 1px;
      background: #2d3748;
      margin: 50px auto 10px;
    }
    .date {
      color: #718096;
      font-size: 16px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="header">
      <div class="logo">TLL IELTS</div>
      <h1 class="title">Certificate of Completion</h1>
    </div>
    <div class="body-text">This is to certify that</div>
    <div class="student-name">${studentName}</div>
    <div class="body-text">has successfully completed the learning path</div>
    <div class="combo-name">${comboName}</div>
    <div class="body-text">demonstrating proficiency and dedication in mastering the IELTS curriculum.</div>
    <div class="footer">
      <div class="signature">
        <div class="signature-line"></div>
        <div>Head of Education</div>
      </div>
      <div class="signature">
        <div class="date">${date}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  private generateCertificateSVG(
    studentName: string,
    comboName: string,
    date: string,
  ): string {
    return `
<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="800" fill="url(#grad)"/>
  
  <!-- Certificate background -->
  <rect x="50" y="50" width="1100" height="700" fill="white" rx="5"/>
  
  <!-- Header -->
  <text x="600" y="130" font-family="Arial" font-size="24" font-weight="bold" fill="#667eea" text-anchor="middle">TLL IELTS</text>
  
  <text x="600" y="200" font-family="Arial" font-size="48" font-weight="bold" fill="#2d3748" text-anchor="middle">Certificate of Completion</text>
  
  <text x="600" y="280" font-family="Arial" font-size="18" fill="#4a5568" text-anchor="middle">This is to certify that</text>
  
  <text x="600" y="340" font-family="Arial" font-size="36" font-weight="bold" fill="#667eea" text-anchor="middle">${studentName}</text>
  
  <text x="600" y="390" font-family="Arial" font-size="18" fill="#4a5568" text-anchor="middle">has successfully completed the learning path</text>
  
  <text x="600" y="440" font-family="Arial" font-size="24" font-weight="600" font-style="italic" fill="#764ba2" text-anchor="middle">${comboName}</text>
  
  <text x="600" y="490" font-family="Arial" font-size="18" fill="#4a5568" text-anchor="middle">demonstrating proficiency and dedication in mastering the IELTS curriculum.</text>
  
  <!-- Footer -->
  <line x1="250" y1="620" x2="450" y2="620" stroke="#2d3748" stroke-width="2"/>
  <text x="350" y="660" font-family="Arial" font-size="14" fill="#718096" text-anchor="middle">Head of Education</text>
  
  <text x="850" y="640" font-family="Arial" font-size="16" fill="#718096" text-anchor="middle">${date}</text>
  
  <line x1="950" y1="620" x2="1150" y2="620" stroke="#2d3748" stroke-width="2"/>
  <text x="1050" y="660" font-family="Arial" font-size="14" fill="#718096" text-anchor="middle">Certificate No.</text>
</svg>
    `.trim();
  }
}
