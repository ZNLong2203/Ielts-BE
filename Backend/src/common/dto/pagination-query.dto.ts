import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sort?: string; // field:asc or field:desc

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  all?: boolean; // if true, return all records without pagination
}
