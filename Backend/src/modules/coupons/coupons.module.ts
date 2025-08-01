import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UtilsModule } from 'src/utils/utils.module';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  imports: [PrismaModule, UtilsModule],
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
