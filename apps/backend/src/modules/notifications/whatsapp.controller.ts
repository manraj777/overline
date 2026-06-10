import { Controller, Get, Post, Body, Query, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Webhook controller for Official Meta WhatsApp Business API
 * Endpoint: /api/v1/whatsapp/webhook
 */
@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);
  private readonly DEFAULT_SHOP_LINK = 'https://overline.in/shop/demo-booking';
  
  // You can set your custom verify token in .env, or use a default one
  private readonly VERIFY_TOKEN = 'overline_whatsapp_webhook_secret_2026';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Handle Webhook Verification (GET)
   * Meta requires this endpoint to verify the webhook URL.
   */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === this.VERIFY_TOKEN) {
      this.logger.log('WhatsApp Webhook verified successfully!');
      return res.status(200).send(challenge);
    } else {
      this.logger.warn('Failed to verify WhatsApp Webhook');
      return res.sendStatus(403);
    }
  }

  /**
   * Handle Incoming Messages (POST)
   * Meta sends JSON payload when a user messages the number.
   */
  @Post('webhook')
  async handleIncomingMessage(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // 1. Meta expects a 200 OK immediately to acknowledge receipt
    res.status(200).send('EVENT_RECEIVED');

    try {
      // 2. Parse incoming message (Meta Format)
      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;

        if (messages && messages.length > 0) {
          const msg = messages[0];
          
          // Only handle text messages for now
          if (msg.type === 'text') {
            const incomingMsg = msg.text?.body?.trim()?.toLowerCase() || '';
            const fromNumber = msg.from; // e.g., "919876543210"

            this.logger.log(`Received message from ${fromNumber}: ${incomingMsg}`);

            // 3. Logic: If user sends "hey", "hi", "book", "appointment"
            const triggerWords = ['hey', 'hi', 'hello', 'book', 'appointment'];
            const shouldReply = triggerWords.some(word => incomingMsg.includes(word));

            if (shouldReply) {
              this.logger.log(`Trigger word matched. Sending auto-reply to ${fromNumber}`);
              await this.sendMetaWhatsAppMessage(fromNumber);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error handling WhatsApp webhook', error);
    }
  }

  /**
   * Send a reply using the Meta Graph API
   */
  private async sendMetaWhatsAppMessage(to: string) {
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      this.logger.error('Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in env. Cannot send auto-reply.');
      return;
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            preview_url: false,
            body: `Welcome to Overline! 🚀\n\nBook your exact slot instantly right here:\n${this.DEFAULT_SHOP_LINK}`
          }
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      this.logger.log(`Successfully sent auto-reply to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp message to ${to}: ${error?.response?.data ? JSON.stringify(error.response.data) : error?.message}`);
    }
  }
}
