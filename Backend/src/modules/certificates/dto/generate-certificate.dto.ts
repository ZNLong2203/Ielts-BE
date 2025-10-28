import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class GenerateCertificateDto {
  @ApiProperty({ description: 'Combo enrollment ID' })
  @IsUUID()
  @IsNotEmpty()
  combo_enrollment_id!: string;
}
