import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  Logger,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService, ShopRecommendation } from './ai.service';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Observable, from, map, catchError, of } from 'rxjs';

class ChatMessageDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

class ChatRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @IsOptional()
  @IsString()
  shopId?: string;
}

@ApiTags('ai')
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get AI-powered shop recommendations' })
  async getRecommendations(
    @Req() req: any,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.id;
    this.logger.log(`AI recommendations request for user ${userId}`);
    return this.aiService.getRecommendations(userId, lat, lng, limit || 10);
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'AI Chat — send messages and get a response' })
  async chat(@Body() dto: ChatRequestDto, @Req() req: any) {
    const userId = req.user?.id;
    this.logger.log(`AI chat request from user ${userId || 'anonymous'}`);

    const response = await this.aiService.chat(
      dto.messages as any[],
      userId,
      dto.shopId,
    );

    return { role: 'assistant', content: response };
  }

  @Post('chat/stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Sse()
  @ApiOperation({ summary: 'AI Chat — SSE streaming response' })
  chatStream(@Body() dto: ChatRequestDto, @Req() req: any): Observable<MessageEvent> {
    const userId = req.user?.id;
    this.logger.log(`AI chat stream request from user ${userId || 'anonymous'}`);

    return from(
      this.aiService.chat(dto.messages as any[], userId, dto.shopId),
    ).pipe(
      map((response) => {
        // Simulate streaming by chunking the response
        return { data: JSON.stringify({ role: 'assistant', content: response, done: true }) };
      }),
      catchError((err) => {
        this.logger.error(`AI chat stream error: ${err.message}`);
        return of({
          data: JSON.stringify({
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
            done: true,
          }),
        });
      }),
    );
  }
}
