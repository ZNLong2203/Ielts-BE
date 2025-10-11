import { Module } from '@nestjs/common';
import { ListeningService } from './listening.service';
import { ListeningController } from './listening.controller';

@Module({
  controllers: [ListeningController],
  providers: [ListeningService],
})
export class ListeningModule {}
