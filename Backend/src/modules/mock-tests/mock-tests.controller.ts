import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import {
  CurrentUser,
  MessageResponse,
  Public,
  SkipCheckPermission,
} from 'src/decorator/customize';
import { IUser } from 'src/interface/users.interface';
import {
  CreateMockTestDto,
  TestSectionSubmissionDto,
} from './dto/create-mock-test.dto';
import { UpdateMockTestDto } from './dto/update-mock-test.dto';
import { SubmitWritingGradingDto } from './dto/submit-writing-grading.dto';
import { SubmitSpeakingGradingDto } from './dto/submit-speaking-grading.dto';
import { MockTestsService } from './mock-tests.service';

@ApiTags('Mock Tests')
@Controller('mock-tests')
export class MockTestsController {
  constructor(private readonly mockTestsService: MockTestsService) {}

  /**
   * Create Mock Test
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
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @MessageResponse('Mock test created successfully')
  async create(
    @Body(new ValidationPipe({ transform: true })) createDto: CreateMockTestDto,
  ) {
    const mockTest = await this.mockTestsService.create(createDto);
    return {
      success: true,
      data: mockTest,
    };
  }

  /**
   * Get All Mock Tests
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
  @Public()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Mock tests retrieved successfully')
  async findAll(@Query() query: PaginationQueryDto, @Req() req: Request) {
    const result = await this.mockTestsService.findAll(query, req.query);
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get Mock Test by ID
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
  @Public()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Mock test retrieved successfully')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const mockTest = await this.mockTestsService.findOne(id);
    return {
      success: true,
      data: mockTest,
    };
  }

  /**
   * Update Mock Test
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
  @Public()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Mock test updated successfully')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true })) updateDto: UpdateMockTestDto,
  ) {
    const mockTest = await this.mockTestsService.update(id, updateDto);
    return {
      success: true,
      data: mockTest,
    };
  }

  /**
   * Delete Mock Test
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
  @Public()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Mock test deleted successfully')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.mockTestsService.remove(id);
    return {
      success: true,
    };
  }

  /**
   * Get Mock Test Statistics
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
  @Public()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Statistics retrieved successfully')
  async getStatistics() {
    const stats = await this.mockTestsService.getStatistics();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Start Mock Test
   */
  @Post(':id/start')
  @ApiOperation({
    summary: 'Start a mock test',
    description: 'Initializes a test session for the user',
  })
  @ApiParam({ name: 'id', description: 'Mock test UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test started successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Mock test not found',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Test started successfully')
  async startTest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: IUser,
  ) {
    return await this.mockTestsService.startTest(id, user.id);
  }

  /**
   * Submit Mock Test Answers each section (provides section id and mock test result id)
   */
  @Post('submit-section')
  @ApiOperation({
    summary: 'Submit answers for a test section',
    description: 'Submits answers for a specific section of a mock test',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Section answers submitted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Mock test or section not found',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Section answers submitted successfully')
  async submitSectionAnswers(
    @Body() submissionDto: TestSectionSubmissionDto,
    @CurrentUser() user: IUser,
  ) {
    return await this.mockTestsService.submitSectionAnswers(
      submissionDto,
      user.id,
    );
  }

  /**
   * Get Mock Test Result History
   */
  @Get('results/history')
  @ApiOperation({
    summary: 'Get mock test result history',
    description: 'Retrieves the history of mock test results for the user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test result history retrieved successfully',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Test result history retrieved successfully')
  async getTestResultHistory(
    @CurrentUser() user: IUser,
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ) {
    return await this.mockTestsService.getUserTestHistory(
      user.id,
      query,
      req.query,
    );
  }

  /**
   * Get Mock Test Result Review (with correct/incorrect answers mapped to questions)
   * NOTE: This route must be defined BEFORE 'results/:resultId' to avoid route conflict
   */
  @Get('results/:resultId/review')
  @ApiOperation({
    summary: 'Get detailed test result review',
    description:
      'Retrieves detailed test result with correct/incorrect answers mapped to questions for review',
  })
  @ApiParam({ name: 'resultId', description: 'Test result UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test result review retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Test result not found',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Test result review retrieved successfully')
  async getTestResultReview(
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @CurrentUser() user: IUser,
  ) {
    return await this.mockTestsService.getTestResultReview(resultId, user.id);
  }

  /**
   * Get Mock Test Result by ID
   */
  @Get('results/:resultId')
  @ApiOperation({
    summary: 'Get mock test result by ID',
    description: 'Retrieves detailed information about a specific test result',
  })
  @ApiParam({ name: 'resultId', description: 'Test result UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test result retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Test result not found',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Test result retrieved successfully')
  async getTestResultById(
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @CurrentUser() user: IUser,
  ) {
    return await this.mockTestsService.getTestResultById(resultId, user.id);
  }

  /**
   * Get pending writing submissions for teacher grading
   */
  @Get('writing/pending')
  @ApiOperation({
    summary: 'Get pending writing submissions for teacher grading',
    description:
      'Retrieves all writing section results that are pending teacher grading',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending writing submissions retrieved successfully',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Pending writing submissions retrieved successfully')
  async getPendingWritingSubmissions(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: IUser,
  ) {
    return await this.mockTestsService.getPendingWritingSubmissions(
      user.id,
      query,
    );
  }

  /**
   * Get graded writing submissions for teacher review
   */
  @Get('writing/graded')
  @ApiOperation({
    summary: 'Get graded writing submissions',
    description:
      'Retrieves all writing section results that have been graded by teachers',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Graded writing submissions retrieved successfully',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Graded writing submissions retrieved successfully')
  async getGradedWritingSubmissions(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: IUser,
  ) {
    return await this.mockTestsService.getGradedWritingSubmissions(
      user.id,
      query,
    );
  }

  /**
   * Get a specific writing submission for grading
   */
  @Get('writing/:sectionResultId')
  @ApiOperation({
    summary: 'Get writing submission details for grading',
    description:
      'Retrieves detailed information about a specific writing submission for teacher grading',
  })
  @ApiParam({ name: 'sectionResultId', description: 'Section result UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Writing submission retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Writing submission not found',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Writing submission retrieved successfully')
  async getWritingSubmissionForGrading(
    @Param('sectionResultId', ParseUUIDPipe) sectionResultId: string,
    @CurrentUser() user: IUser,
  ) {
    return await this.mockTestsService.getWritingSubmissionForGrading(
      sectionResultId,
      user.id,
    );
  }

  /**
   * Submit teacher grading for writing submission
   */
  @Post('writing/:sectionResultId/grade')
  @ApiOperation({
    summary: 'Submit teacher grading for writing submission',
    description:
      'Allows teacher to submit scores and feedback for a writing submission',
  })
  @ApiParam({ name: 'sectionResultId', description: 'Section result UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grading submitted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Writing submission not found',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Grading submitted successfully')
  async submitWritingGrading(
    @Param('sectionResultId', ParseUUIDPipe) sectionResultId: string,
    @Body() gradingDto: SubmitWritingGradingDto,
    @CurrentUser() user: IUser,
  ) {
    return await this.mockTestsService.submitWritingGrading(
      sectionResultId,
      gradingDto,
      user.id,
    );
  }

  /**
   * Get pending speaking submissions for teacher grading
   */
  @Get('speaking/pending')
  @ApiOperation({
    summary: 'Get pending speaking submissions for teacher grading',
    description:
      'Retrieves all speaking section results that are pending teacher grading',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending speaking submissions retrieved successfully',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Pending speaking submissions retrieved successfully')
  async getPendingSpeakingSubmissions(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: IUser,
  ) {
    return await this.mockTestsService.getPendingSpeakingSubmissions(
      user.id,
      query,
    );
  }

  /**
   * Get graded speaking submissions for teacher review
   */
  @Get('speaking/graded')
  @ApiOperation({
    summary: 'Get graded speaking submissions',
    description:
      'Retrieves all speaking section results that have been graded by teachers',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Graded speaking submissions retrieved successfully',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Graded speaking submissions retrieved successfully')
  async getGradedSpeakingSubmissions(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: IUser,
  ) {
    return await this.mockTestsService.getGradedSpeakingSubmissions(
      user.id,
      query,
    );
  }

  /**
   * Get a specific speaking submission for grading
   */
  @Get('speaking/:sectionResultId')
  @ApiOperation({
    summary: 'Get speaking submission details for grading',
    description:
      'Retrieves detailed information about a specific speaking submission for teacher grading',
  })
  @ApiParam({ name: 'sectionResultId', description: 'Section result UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Speaking submission retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Speaking submission not found',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Speaking submission retrieved successfully')
  async getSpeakingSubmissionForGrading(
    @Param('sectionResultId', ParseUUIDPipe) sectionResultId: string,
    @CurrentUser() user: IUser,
  ) {
    return await this.mockTestsService.getSpeakingSubmissionForGrading(
      sectionResultId,
      user.id,
    );
  }

  /**
   * Submit teacher grading for speaking submission
   */
  @Post('speaking/:sectionResultId/grade')
  @ApiOperation({
    summary: 'Submit teacher grading for speaking submission',
    description:
      'Allows teacher to submit scores and feedback for a speaking submission',
  })
  @ApiParam({ name: 'sectionResultId', description: 'Section result UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grading submitted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Speaking submission not found',
  })
  @SkipCheckPermission()
  @HttpCode(HttpStatus.OK)
  @MessageResponse('Grading submitted successfully')
  async submitSpeakingGrading(
    @Param('sectionResultId', ParseUUIDPipe) sectionResultId: string,
    @Body() gradingDto: SubmitSpeakingGradingDto,
    @CurrentUser() user: IUser,
  ) {
    return await this.mockTestsService.submitSpeakingGrading(
      sectionResultId,
      gradingDto,
      user.id,
    );
  }
}
