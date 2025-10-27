import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UtilsModule } from 'src/utils/utils.module';
import { MockTestsController } from './mock-tests.controller';
import { MockTestsService } from './mock-tests.service';

@Module({
  imports: [PrismaModule, UtilsModule],
  controllers: [MockTestsController],
  providers: [MockTestsService],
  exports: [MockTestsService],
})
export class MockTestsModule {}
