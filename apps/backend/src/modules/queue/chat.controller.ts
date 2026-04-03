import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueTrackingService } from './queue-tracking.service';

class SendChatMessageDto {
  @IsString()
  content!: string;
}

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(private readonly queueTrackingService: QueueTrackingService) {}

  @Get(':sessionId/messages')
  @ApiOperation({ summary: 'Chat messages by session' })
  async getMessages(@Param('sessionId') sessionId: string) {
    return this.queueTrackingService.getMessagesBySessionId(sessionId);
  }

  @Post(':sessionId/messages')
  @ApiOperation({ summary: 'Send chat message by session' })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendChatMessageDto,
    @CurrentUser('id') senderId: string,
    @CurrentUser('role') senderRole: string,
  ) {
    const senderType: 'USER' | 'SHOP' = senderRole === 'USER' ? 'USER' : 'SHOP';
    return this.queueTrackingService.createMessageBySessionId(
      sessionId,
      senderId,
      senderType,
      dto.content,
    );
  }
}
