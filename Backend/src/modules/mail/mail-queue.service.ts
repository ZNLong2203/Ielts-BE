import { Injectable, Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { RedisService } from 'src/redis/redis.service';

interface EmailJobData {
  orderId: string;
  orderCode: string;
  userEmail: string;
  userName: string;
  finalAmount: number;
  discountAmount?: number;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  combos: Array<{
    id: string;
    name: string;
    startLevel: number;
    endLevel: number;
  }>;
  retryCount?: number;
}

@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);
  private readonly EMAIL_QUEUE_NAME = 'email:payment-success';
  private readonly DEAD_LETTER_QUEUE_NAME = 'email:payment-success:failed';
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async processEmailQueue(): Promise<boolean> {
    try {
      const job = await this.redisService.popJob(this.EMAIL_QUEUE_NAME, 5);

      if (!job) {
        return false; // No job available
      }

      const jobData = job.data as EmailJobData;
      const retryCount = jobData.retryCount || 0;

      this.logger.log(
        `Processing payment success email for order ${jobData.orderCode} (attempt ${retryCount + 1}/${this.MAX_RETRIES + 1})`,
      );

      try {
        await this.mailService.sendPaymentSuccessEmail({
          to: jobData.userEmail,
          userName: jobData.userName,
          orderCode: jobData.orderCode,
          finalAmount: jobData.finalAmount,
          discountAmount: jobData.discountAmount,
          currency: jobData.currency,
          paymentMethod: jobData.paymentMethod,
          paymentDate: jobData.paymentDate,
          combos: jobData.combos,
        });

        this.logger.log(
          `Successfully processed email job for order ${jobData.orderCode}`,
        );
        return true;
      } catch (error) {
        const e = error as Error;
        this.logger.error(
          `Failed to send email for order ${jobData.orderCode}: ${e.message}`,
        );

        // Retry logic
        if (retryCount < this.MAX_RETRIES) {
          this.logger.warn(
            `Retrying email job for order ${jobData.orderCode} (${retryCount + 1}/${this.MAX_RETRIES})`,
          );

          // Push back to queue with incremented retry count
          await this.redisService.pushJob(this.EMAIL_QUEUE_NAME, {
            ...jobData,
            retryCount: retryCount + 1,
          });
        } else {
          // Move to dead letter queue after max retries
          this.logger.error(
            `Max retries reached for order ${jobData.orderCode}, moving to dead letter queue`,
          );
          await this.redisService.pushJob(this.DEAD_LETTER_QUEUE_NAME, {
            ...jobData,
            retryCount,
            failedAt: new Date().toISOString(),
            error: e.message,
          });
        }
        return false;
      }
    } catch (error) {
      const e = error as Error;
      this.logger.error(
        `Failed to process email queue job: ${e.message}`,
        e.stack,
      );
      return false;
    }
  }

  async processEmailQueueBatch(maxJobs = 10): Promise<number> {
    let processed = 0;
    let successCount = 0;

    for (let i = 0; i < maxJobs; i++) {
      try {
        const success = await this.processEmailQueue();
        processed++;
        if (success) {
          successCount++;
        }
        // Small delay between jobs to avoid overwhelming the system
        if (i < maxJobs - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        const e = error as Error;
        this.logger.error(`Error processing batch job ${i + 1}: ${e.message}`);
        // Continue processing other jobs even if one fails
      }
    }

    if (processed > 0) {
      this.logger.debug(
        `Batch processing completed: ${successCount}/${processed} successful`,
      );
    }

    return successCount;
  }

  async getQueueLength(): Promise<number> {
    return await this.redisService.getQueueLength(this.EMAIL_QUEUE_NAME);
  }

  async getDeadLetterQueueLength(): Promise<number> {
    return await this.redisService.getQueueLength(this.DEAD_LETTER_QUEUE_NAME);
  }
}
