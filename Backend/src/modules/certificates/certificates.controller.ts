import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, MessageResponse, Public } from 'src/decorator/customize';
import { MESSAGE } from 'src/common/message';
import { IUser } from 'src/interface/users.interface';
import { CertificatesService } from './certificates.service';
import { GenerateCertificateDto } from './dto/generate-certificate.dto';

@ApiTags('certificates')
@Controller('certificates')
@ApiBearerAuth()
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all certificates for current user' })
  async getCertificates(@CurrentUser() user: IUser) {
    return this.certificatesService.getCertificates(user.id);
  }

  @Post('generate')
  @Public()
  @MessageResponse(MESSAGE.CERTIFICATE.CERTIFICATE_GENERATED)
  @ApiOperation({ summary: 'Generate a certificate for a completed combo' })
  async generateCertificate(
    @CurrentUser() user: IUser,
    @Body() generateDto: GenerateCertificateDto,
  ) {
    return this.certificatesService.generateCertificate(user.id, generateDto);
  }
}
