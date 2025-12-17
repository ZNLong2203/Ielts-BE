import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { MESSAGE } from 'src/common/message';
import {
  CurrentUser,
  MessageResponse,
  SkipCheckPermission,
} from 'src/decorator/customize';
import { IUser } from 'src/interface/users.interface';
import { CertificatesService } from './certificates.service';
import { GenerateCertificateDto } from './dto/generate-certificate.dto';

@ApiTags('Certificates')
@Controller('certificates')
@ApiBearerAuth()
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get(':comboEnrollmentId/view')
  @SkipCheckPermission()
  @ApiOperation({
    summary: 'Get certificate SVG content',
    description: 'Retrieve the SVG content of a certificate for viewing',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate SVG retrieved successfully',
    content: {
      'image/svg+xml': {
        schema: {
          type: 'string',
        },
      },
    },
  })
  async getCertificateView(
    @CurrentUser() user: IUser,
    @Param('comboEnrollmentId') comboEnrollmentId: string,
    @Res() res: Response,
  ) {
    if (!user || !user.id) {
      throw new UnauthorizedException('User authentication required');
    }
    const svg = await this.certificatesService.getCertificateSVG(
      user.id,
      comboEnrollmentId,
    );
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  }

  @Get()
  @SkipCheckPermission()
  @ApiOperation({
    summary: 'Get all certificates for current user',
    description:
      'Retrieve all certificates that the authenticated user has earned by completing combo courses. Only certificates for completed combos (100% progress) are returned.',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Certificates retrieved successfully',
        },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/CertificateResponseDto' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @MessageResponse(MESSAGE.CERTIFICATE.CERTIFICATE_RETRIEVED)
  async getCertificates(@CurrentUser() user: IUser) {
    if (!user || !user.id) {
      throw new UnauthorizedException('User authentication required');
    }
    return this.certificatesService.getCertificates(user.id);
  }

  @Post('generate')
  @SkipCheckPermission()
  @ApiOperation({
    summary: 'Generate a certificate for a completed combo',
    description:
      'Generate a certificate SVG file for a successfully completed combo course. The combo must be 100% completed to generate a certificate. If a certificate already exists, the existing certificate URL is returned.',
  })
  @ApiBody({
    type: GenerateCertificateDto,
    description: 'Combo enrollment ID to generate certificate for',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Certificate generated successfully',
        },
        data: {
          type: 'string',
          description: 'Certificate URL',
          example:
            'https://minio.example.com/certificates/certificate-123-1234567890.svg',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Combo enrollment or related data not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Combo enrollment not found' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Combo is not 100% completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Combo must be 100% completed to generate certificate',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @MessageResponse(MESSAGE.CERTIFICATE.CERTIFICATE_GENERATED)
  async generateCertificate(
    @CurrentUser() user: IUser,
    @Body() generateDto: GenerateCertificateDto,
  ) {
    if (!user || !user.id) {
      throw new UnauthorizedException('User authentication required');
    }
    return this.certificatesService.generateCertificate(user.id, generateDto);
  }
}
