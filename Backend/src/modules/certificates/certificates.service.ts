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

  async getCertificateSVG(userId: string, comboEnrollmentId: string) {
    // Get combo enrollment
    const comboEnrollment = await this.prisma.combo_enrollments.findFirst({
      where: {
        id: comboEnrollmentId,
        user_id: userId,
        certificate_url: { not: null },
      },
      include: {
        combo_courses: true,
        users: true,
      },
    });

    if (!comboEnrollment) {
      throw new NotFoundException('Certificate not found');
    }

    if (!comboEnrollment.combo_courses || !comboEnrollment.users) {
      throw new NotFoundException('Certificate data incomplete');
    }

    // Generate SVG on-the-fly
    const svg = this.generateCertificateSVG(
      comboEnrollment.users.full_name || 'Student',
      comboEnrollment.combo_courses.name,
      comboEnrollment.updated_at
        ? new Date(comboEnrollment.updated_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
    );

    return svg;
  }

  private generateCertificateSVG(
    studentName: string,
    comboName: string,
    date: string,
  ): string {
    const certificateId = `cert-${Date.now()}`;
    return `
<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#f6d365;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#fda085;stop-opacity:1" />
    </linearGradient>
    <pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="1" fill="#ffffff" opacity="0.1"/>
    </pattern>
  </defs>
  
  <!-- Background with gradient -->
  <rect width="1200" height="800" fill="url(#bgGrad)"/>
  <rect width="1200" height="800" fill="url(#pattern)"/>
  
  <!-- Decorative border -->
  <rect x="30" y="30" width="1140" height="740" fill="none" stroke="#ffffff" stroke-width="3" rx="10" opacity="0.3"/>
  <rect x="40" y="40" width="1120" height="720" fill="none" stroke="#ffffff" stroke-width="2" rx="8" opacity="0.2"/>
  
  <!-- Certificate background with shadow effect -->
  <rect x="50" y="50" width="1100" height="700" fill="white" rx="10"/>
  <rect x="60" y="60" width="1100" height="700" fill="none" stroke="#e2e8f0" stroke-width="1" rx="10"/>
  
  <!-- Decorative corner elements -->
  <path d="M 80 80 L 120 80 L 80 120 Z" fill="url(#goldGrad)" opacity="0.3"/>
  <path d="M 1120 80 L 1080 80 L 1120 120 Z" fill="url(#goldGrad)" opacity="0.3"/>
  <path d="M 80 720 L 120 720 L 80 680 Z" fill="url(#goldGrad)" opacity="0.3"/>
  <path d="M 1120 720 L 1080 720 L 1120 680 Z" fill="url(#goldGrad)" opacity="0.3"/>
  
  <!-- Decorative lines -->
  <line x1="150" y1="120" x2="1050" y2="120" stroke="url(#goldGrad)" stroke-width="2" opacity="0.4"/>
  <line x1="150" y1="680" x2="1050" y2="680" stroke="url(#goldGrad)" stroke-width="2" opacity="0.4"/>
  
  <!-- Logo/Header Section -->
  <circle cx="600" cy="150" r="35" fill="url(#goldGrad)"/>
  <text x="600" y="160" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#667eea" text-anchor="middle">IELTS</text>
  
  <!-- Main Title -->
  <text x="600" y="220" font-family="Georgia, serif" font-size="52" font-weight="bold" fill="#1a202c" text-anchor="middle" letter-spacing="2">Certificate of Completion</text>
  
  <!-- Subtitle -->
  <text x="600" y="260" font-family="Arial, sans-serif" font-size="16" fill="#718096" text-anchor="middle" font-style="italic">This is to certify that</text>
  
  <!-- Student Name with decorative underline -->
  <text x="600" y="330" font-family="Georgia, serif" font-size="42" font-weight="bold" fill="#667eea" text-anchor="middle" letter-spacing="1">${this.escapeXml(studentName)}</text>
  <line x1="400" y1="350" x2="800" y2="350" stroke="url(#goldGrad)" stroke-width="3" opacity="0.6"/>
  
  <!-- Achievement Text -->
  <text x="600" y="400" font-family="Arial, sans-serif" font-size="20" fill="#4a5568" text-anchor="middle">has successfully completed the learning path</text>
  
  <!-- Combo Name with decorative box -->
  <rect x="350" y="430" width="500" height="60" fill="none" stroke="url(#goldGrad)" stroke-width="2" rx="5" opacity="0.5"/>
  <text x="600" y="470" font-family="Georgia, serif" font-size="32" font-weight="600" fill="#764ba2" text-anchor="middle" font-style="italic">${this.escapeXml(comboName)}</text>
  
  <!-- Description -->
  <text x="600" y="540" font-family="Arial, sans-serif" font-size="18" fill="#718096" text-anchor="middle">demonstrating proficiency and dedication</text>
  <text x="600" y="570" font-family="Arial, sans-serif" font-size="18" fill="#718096" text-anchor="middle">in mastering the IELTS curriculum</text>
  
  <!-- Footer with signatures -->
  <g transform="translate(0, 620)">
    <!-- Left signature -->
    <line x1="200" y1="0" x2="350" y2="0" stroke="#2d3748" stroke-width="2"/>
    <text x="275" y="25" font-family="Arial, sans-serif" font-size="14" fill="#4a5568" text-anchor="middle" font-weight="600">Head of Education</text>
    <text x="275" y="45" font-family="Arial, sans-serif" font-size="12" fill="#718096" text-anchor="middle">IELTS Academy</text>
    
    <!-- Center date -->
    <text x="600" y="20" font-family="Arial, sans-serif" font-size="16" fill="#718096" text-anchor="middle" font-weight="600">Date: ${this.escapeXml(date)}</text>
    
    <!-- Right certificate number -->
    <line x1="850" y1="0" x2="1000" y2="0" stroke="#2d3748" stroke-width="2"/>
    <text x="925" y="25" font-family="Arial, sans-serif" font-size="14" fill="#4a5568" text-anchor="middle" font-weight="600">Certificate ID</text>
    <text x="925" y="45" font-family="Arial, sans-serif" font-size="12" fill="#718096" text-anchor="middle">${certificateId}</text>
  </g>
  
  <!-- Decorative seal/badge -->
  <circle cx="600" cy="500" r="80" fill="none" stroke="url(#goldGrad)" stroke-width="3" opacity="0.3"/>
  <circle cx="600" cy="500" r="60" fill="none" stroke="url(#goldGrad)" stroke-width="2" opacity="0.2"/>
  <text x="600" y="510" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="url(#goldGrad)" text-anchor="middle">✓</text>
</svg>
    `.trim();
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
