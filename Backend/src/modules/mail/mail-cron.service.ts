import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MailQueueService } from './mail-queue.service';

@Injectable()
export class MailCronService {
  private readonly logger = new Logger(MailCronService.name);

  constructor(private readonly mailQueueService: MailQueueService) {}

  /**
   * Process email queue every 10 seconds
   * This ensures emails are sent promptly after payment completion
   */
  @Cron('*/10 * * * * *') // Every 10 seconds
  async processEmailQueue() {
    try {
      const queueLength = await this.mailQueueService.getQueueLength();

      if (queueLength === 0) {
        return; // No jobs to process
      }

      this.logger.debug(
        `Processing email queue: ${queueLength} job(s) pending`,
      );

      // Process up to 5 jobs per cron run to avoid blocking
      const processed = await this.mailQueueService.processEmailQueueBatch(5);

      if (processed > 0) {
        this.logger.log(`Processed ${processed} email job(s) from queue`);
      }
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Error in email queue cron job: ${e.message}`, e.stack);
    }
  }
}
