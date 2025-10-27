import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { CreateMockTestDto } from './dto/create-mock-test.dto';
import { UpdateMockTestDto } from './dto/update-mock-test.dto';
import { MockTestsService } from './mock-tests.service';

@ApiTags('🧪 Mock Tests')
@Controller('mock-tests')
export class MockTestsController {
  constructor(private readonly mockTestsService: MockTestsService) {}

  /**
   * 📝 Create Mock Test
   */
  @Post()
  @ApiOperation({
    summary: 'Create mock test with sections',
    description:
      'Creates a new mock test and optionally creates default sections',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Mock test created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Mock test with this title already exists',
  })
  async create(
    @Body(new ValidationPipe({ transform: true })) createDto: CreateMockTestDto,
  ) {
    const mockTest = await this.mockTestsService.create(createDto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Mock test created successfully',
      data: mockTest,
    };
  }

  /**
   * 📖 Get All Mock Tests
   */
  @Get()
  @ApiOperation({
    summary: 'Get all mock tests',
    description: 'Retrieves all mock tests with filtering and pagination',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'test_type', required: false, example: 'full_test' })
  @ApiQuery({ name: 'test_level', required: false, example: 'academic' })
  @ApiQuery({ name: 'is_active', required: false, example: true })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mock tests retrieved successfully',
  })
  async findAll(@Query() query: PaginationQueryDto, @Req() req: Request) {
    const result = await this.mockTestsService.findAll(query, req.query);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Mock tests retrieved successfully',
      ...result,
    };
  }

  /**
   * 🔍 Get Mock Test by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get mock test by ID',
    description:
      'Retrieves detailed information about a mock test including sections and exercises',
  })
  @ApiParam({ name: 'id', description: 'Mock test UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mock test retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Mock test not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const mockTest = await this.mockTestsService.findOne(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Mock test retrieved successfully',
      data: mockTest,
    };
  }

  /**
   * ✏️ Update Mock Test
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update mock test',
    description: 'Updates mock test information',
  })
  @ApiParam({ name: 'id', description: 'Mock test UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mock test updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Mock test not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Mock test with this title already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true })) updateDto: UpdateMockTestDto,
  ) {
    const mockTest = await this.mockTestsService.update(id, updateDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Mock test updated successfully',
      data: mockTest,
    };
  }

  /**
   * 🗑️ Delete Mock Test
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete mock test',
    description:
      'Soft deletes a mock test and all its sections, exercises, and questions',
  })
  @ApiParam({ name: 'id', description: 'Mock test UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mock test deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Mock test not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.mockTestsService.remove(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Mock test deleted successfully',
    };
  }

  /**
   * 📊 Get Mock Test Statistics
   */
  @Get('statistics/overview')
  @ApiOperation({
    summary: 'Get mock test statistics',
    description: 'Retrieves statistics about mock tests',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics() {
    const stats = await this.mockTestsService.getStatistics();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Statistics retrieved successfully',
      data: stats,
    };
  }
}
