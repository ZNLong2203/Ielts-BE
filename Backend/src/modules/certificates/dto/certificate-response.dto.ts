import { ApiProperty } from '@nestjs/swagger';

export class CertificateResponseDto {
  @ApiProperty({ description: 'Certificate ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  user_id!: string;

  @ApiProperty({ description: 'Combo enrollment ID' })
  combo_enrollment_id!: string;

  @ApiProperty({ description: 'Certificate URL' })
  certificate_url!: string;

  @ApiProperty({ description: 'Issue date' })
  issued_at!: Date;

  @ApiProperty({ description: 'Created at' })
  created_at!: Date;
}
