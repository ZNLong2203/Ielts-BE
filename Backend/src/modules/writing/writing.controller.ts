import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WritingService } from './writing.service';
import { CreateWritingDto } from './dto/create-writing.dto';
import { UpdateWritingDto } from './dto/update-writing.dto';
import { CreateWritingMockTestExerciseDto } from './dto/create-writing-mock-test.dto';
import { UpdateWritingMockTestExerciseDto } from './dto/update-writing-mock-test.dto';
import {
  SubmitWritingDto,
  WritingSubmissionResponse,
} from './dto/submit-writing.dto';
import {
  GradeWritingSubmissionDto,
  WritingGradeResponse,
} from './dto/grade-writing-submission.dto';
import { QueryWritingDto } from './dto/query-writing.dto';
import {
  GradeWritingDto,
  WritingGradeResponse as GeminiWritingGradeResponse,
} from './dto/grade-writing.dto';
import {
  SaveWritingAssessmentDto,
  WritingAssessmentResponse,
} from './dto/save-writing-assessment.dto';
import {
  Public,
  CurrentUser,
  SkipCheckPermission,
  MessageResponse,
} from 'src/decorator/customize';
import { MESSAGE } from 'src/common/message';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/casl/guards/permission.guard';
import { CheckPolicies } from 'src/decorator/customize';
import { Action } from 'src/casl/enums/action.enum';
import { Exercise } from 'src/casl/entities/exercise.entity';
import { IUser } from 'src/interface/users.interface';
import {
  canCreateWritingExercise,
  canUpdateWritingExercise,
  canSubmitWritingExercise,
  canGradeWritingSubmission,
  canViewWritingSubmissions,
} from 'src/casl/policies/writing.policies';

@ApiTags('Writing')
@Controller('writing')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WritingController {
  constructor(private readonly writingService: WritingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a writing exercise' })
  @ApiBearerAuth()
  @CheckPolicies(canCreateWritingExercise)
  @MessageResponse(MESSAGE.WRITING.CREATE_SUCCESS)
  async create(@Body() createWritingDto: CreateWritingDto) {
    return this.writingService.create(createWritingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all writing exercises' })
  @CheckPolicies((ability) => ability.can(Action.Read, Exercise))
  @MessageResponse(MESSAGE.WRITING.RETRIEVE_ALL_SUCCESS)
  async findAll(@Query() queryDto: QueryWritingDto) {
    return this.writingService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a writing exercise by ID' })
  @CheckPolicies((ability) => ability.can(Action.Read, Exercise))
  @MessageResponse(MESSAGE.WRITING.RETRIEVE_SUCCESS)
  async findOne(@Param('id') id: string) {
    return this.writingService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a writing exercise' })
  @ApiBearerAuth()
  @CheckPolicies(canUpdateWritingExercise)
  @MessageResponse(MESSAGE.WRITING.UPDATE_SUCCESS)
  async update(
    @Param('id') id: string,
    @Body() updateWritingDto: UpdateWritingDto,
  ) {
    return this.writingService.update(id, updateWritingDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a writing exercise' })
  @ApiBearerAuth()
  @CheckPolicies((ability) => ability.can(Action.Delete, Exercise))
  @MessageResponse(MESSAGE.WRITING.DELETE_SUCCESS)
  async remove(@Param('id') id: string) {
    await this.writingService.remove(id);
    return { message: MESSAGE.WRITING.DELETE_SUCCESS };
  }

  // Student Submission APIs
  @Post('submit')
  @ApiOperation({ summary: 'Submit a writing exercise' })
  @ApiBearerAuth()
  @CheckPolicies(canSubmitWritingExercise)
  @MessageResponse(MESSAGE.WRITING.SUBMIT_SUCCESS)
  async submitWriting(
    @CurrentUser() user: IUser,
    @Body() submitDto: SubmitWritingDto,
  ): Promise<WritingSubmissionResponse> {
    return this.writingService.submitWriting(user.id, submitDto);
  }

  @Get('my-submissions')
  @ApiOperation({ summary: 'Get my writing submissions' })
  @ApiBearerAuth()
  @SkipCheckPermission()
  @MessageResponse(MESSAGE.WRITING.SUBMISSIONS_RETRIEVE_SUCCESS)
  async getMySubmissions(@CurrentUser() user: IUser) {
    return this.writingService.getSubmissionsByUser(user.id);
  }

  // Teacher Grading APIs
  @Post('grade-submission')
  @ApiOperation({ summary: 'Grade a writing submission' })
  @ApiBearerAuth()
  @CheckPolicies(canGradeWritingSubmission)
  @MessageResponse(MESSAGE.WRITING.GRADE_SUCCESS)
  async gradeSubmission(
    @CurrentUser() user: IUser,
    @Body() gradeDto: GradeWritingSubmissionDto,
  ): Promise<WritingGradeResponse> {
    return this.writingService.gradeWritingSubmission(user.id, gradeDto);
  }

  @Get(':exerciseId/submissions')
  @ApiOperation({ summary: 'Get all submissions for a writing exercise' })
  @ApiBearerAuth()
  @CheckPolicies(canViewWritingSubmissions)
  @MessageResponse(MESSAGE.WRITING.EXERCISE_SUBMISSIONS_RETRIEVE_SUCCESS)
  async getSubmissionsByExercise(@Param('exerciseId') exerciseId: string) {
    return this.writingService.getSubmissionsByExercise(exerciseId);
  }

  // AI Grading API
  @Post('grade')
  @ApiOperation({ summary: 'Grade writing using AI (Gemini)' })
  @Public()
  @MessageResponse(MESSAGE.WRITING.GRADE_AI_SUCCESS)
  async gradeWritingByGemini(
    @Body() gradeWritingDto: GradeWritingDto,
  ): Promise<GeminiWritingGradeResponse> {
    return this.writingService.gradeWritingByGemini(gradeWritingDto);
  }

  // Save writing assessment
  @Post('save-assessment')
  @ApiOperation({ summary: 'Save writing assessment to database' })
  @ApiBearerAuth()
  @SkipCheckPermission()
  @MessageResponse(MESSAGE.WRITING.CREATE_SUCCESS)
  async saveWritingAssessment(
    @CurrentUser() user: IUser,
    @Body() saveDto: SaveWritingAssessmentDto,
  ): Promise<WritingAssessmentResponse> {
    return this.writingService.saveWritingAssessment(user.id, saveDto);
  }

  // Get my writing assessments
  @Get('my-assessments')
  @ApiOperation({ summary: 'Get my writing assessments' })
  @ApiBearerAuth()
  @SkipCheckPermission()
  @MessageResponse('Retrieved assessments successfully')
  async getMyAssessments(
    @CurrentUser() user: IUser,
    @Query('exerciseId') exerciseId?: string,
    @Query('taskType') taskType?: string,
  ): Promise<WritingAssessmentResponse[]> {
    return this.writingService.getWritingAssessmentsByUser(
      user.id,
      exerciseId,
      taskType,
    );
  }

  // Get writing assessment by ID
  @Get('assessment/:id')
  @ApiOperation({ summary: 'Get writing assessment by ID' })
  @ApiBearerAuth()
  @SkipCheckPermission()
  @MessageResponse('Retrieved assessment successfully')
  async getWritingAssessment(
    @Param('id') id: string,
  ): Promise<WritingAssessmentResponse | null> {
    return this.writingService.getWritingAssessmentById(id);
  }

  // Mock Test Exercise Endpoints
  @Post('mock-test')
  @ApiOperation({
    summary: 'Create writing exercise for mock test',
    description: 'Create a new writing exercise in a mock test section',
  })
  @ApiBearerAuth()
  @Public()
  @MessageResponse('Writing exercise created successfully')
  async createMockTestExercise(
    @Body() createDto: CreateWritingMockTestExerciseDto,
  ) {
    return this.writingService.createExerciseForMockTest(createDto);
  }

  @Get('test-section/:testSectionId')
  @ApiOperation({
    summary: 'Get writing exercises by test section',
    description: 'Retrieve all writing exercises in a specific test section',
  })
  @ApiBearerAuth()
  @Public()
  @MessageResponse('Writing exercises retrieved successfully')
  async getWritingExercisesByTestSection(
    @Param('testSectionId') testSectionId: string,
  ) {
    return this.writingService.getExercisesByTestSectionForMockTest(
      testSectionId,
    );
  }

  @Get('mock-test/:id')
  @ApiOperation({
    summary: 'Get writing exercise by ID (mock test)',
    description: 'Retrieve detailed information of a writing exercise',
  })
  @ApiBearerAuth()
  @Public()
  @MessageResponse('Writing exercise retrieved successfully')
  async getMockTestExerciseById(@Param('id') id: string) {
    return this.writingService.getExerciseByIdForMockTest(id);
  }

  @Put('mock-test/:id')
  @ApiOperation({
    summary: 'Update writing exercise (mock test)',
    description: 'Update writing exercise information',
  })
  @ApiBearerAuth()
  @Public()
  @MessageResponse('Writing exercise updated successfully')
  async updateMockTestExercise(
    @Param('id') id: string,
    @Body() updateDto: UpdateWritingMockTestExerciseDto,
  ) {
    return this.writingService.updateExerciseForMockTest(id, updateDto);
  }

  @Delete('mock-test/:id')
  @ApiOperation({
    summary: 'Delete writing exercise (mock test)',
    description: 'Soft delete a writing exercise',
  })
  @ApiBearerAuth()
  @Public()
  @MessageResponse('Writing exercise deleted successfully')
  async deleteMockTestExercise(@Param('id') id: string) {
    await this.writingService.deleteExerciseForMockTest(id);
    return { success: true };
  }

  @Get('mock-tests')
  @ApiOperation({
    summary: 'Get all mock tests with writing sections',
    description:
      'Retrieve all mock tests that contain writing sections and their exercises',
  })
  @ApiBearerAuth()
  @Public()
  @MessageResponse('Mock tests with writing sections retrieved successfully')
  async getMockTestsWithWritingSections() {
    return this.writingService.getMockTestsWithSections();
  }
}
