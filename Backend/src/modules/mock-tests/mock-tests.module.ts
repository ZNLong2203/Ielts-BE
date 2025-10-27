import { Module } from '@nestjs/common';
import { MockTestsService } from './mock-tests.service';
import { MockTestsController } from './mock-tests.controller';

@Module({
  controllers: [MockTestsController],
  providers: [MockTestsService],
})
export class MockTestsModule {}
