import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SECTION_TYPE } from 'src/modules/mock-tests/constants';
import { CreateReadingExerciseDto } from 'src/modules/reading/dto/create-reading.dto';
import { UpdateReadingExerciseDto } from 'src/modules/reading/dto/update-reading.dto';
import { ReadingService } from 'src/modules/reading/reading.service';
import { SKILL_TYPE } from 'src/modules/reading/types/reading.types';
import { VideoService } from 'src/modules/video/video.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ListeningService {
  private readonly logger = new Logger(ListeningService.name);

  constructor(
    private readonly readingService: ReadingService,
    private readonly videoService: VideoService,
    private readonly prisma: PrismaService,
  ) {}

  async createExercise<T extends CreateReadingExerciseDto>(dto: T) {
    return this.readingService.createExercise(
      dto,
      SECTION_TYPE.LISTENING,
      SKILL_TYPE.LISTENING,
    );
  }

  async getExercisesByTestSection(testSectionId: string) {
    return this.readingService.getExercisesByTestSection(
      testSectionId,
      SECTION_TYPE.LISTENING,
      SKILL_TYPE.LISTENING,
    );
  }

  async updateExercise<T extends UpdateReadingExerciseDto>(
    id: string,
    updateDto: T,
  ) {
    return this.readingService.updateExercise(
      id,
      updateDto,
      SKILL_TYPE.LISTENING,
    );
  }

  async deleteExercise(id: string) {
    return this.readingService.deleteExercise(id, SKILL_TYPE.LISTENING);
  }

  async getMockTestsWithSections() {
    return this.readingService.getMockTestsWithSections(
      SECTION_TYPE.LISTENING,
      SKILL_TYPE.LISTENING,
    );
  }

  async getExerciseById(id: string) {
    return this.readingService.getExerciseById(id, SKILL_TYPE.LISTENING);
  }

  /**
   * Upload audio for listening exercise (do not implement yet)
   */
  async uploadExerciseAudio(id: string, file: Express.Multer.File) {
    try {
      const exercise = await this.prisma.exercises.findFirst({
        where: { id, deleted: false },
      });

      if (!exercise) {
        throw new NotFoundException('Exercise not found');
      }

      const uploadResult = await this.videoService.uploadVideo(
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      // Delete previous audio if exists
      if (exercise.audio_url) {
        await this.videoService.clearVideoData(exercise.audio_url);
      }

      return await this.prisma.exercises.update({
        where: { id },
        data: {
          audio_url: uploadResult.fileName,
          updated_at: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Error uploading exercise audio', error);
      throw new BadRequestException('Failed to upload audio');
    }
  }
}
