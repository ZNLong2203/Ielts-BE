import { ConfigService } from '@nestjs/config';

export const geminiConfig = (ConfigService: ConfigService) => ({
  apiKey: ConfigService.get<string>('GEMINI_API_KEY'),
  model: ConfigService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash',
});
