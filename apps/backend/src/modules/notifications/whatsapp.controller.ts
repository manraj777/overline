import { Controller, Post, Body, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Webhook controller for WhatsApp Business API / Twilio Auto-responder
 * Endpoint: POST /api/v1/whatsapp/webhook
 */
@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  // Hardcoded for demo/architecture purposes. In production, look up shop by phone number.
  private readonly DEFAULT_SHOP_LINK = 'https://overline.in/shop/demo-booking';

  @Post('webhook')
  async handleIncomingMessage(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log(`Received WhatsApp Webhook: ${JSON.stringify(body)}`);

    try {
      // 1. Parse incoming message (Twilio Format)
      const incomingMsg = body.Body?.trim()?.toLowerCase() || '';
      const fromNumber = body.From || ''; // e.g., "whatsapp:+919876543210"

      // 2. Logic: If user sends "hey", "hi", "book", "appointment"
      const triggerWords = ['hey', 'hi', 'hello', 'book', 'appointment'];
      const shouldReply = triggerWords.some(word => incomingMsg.includes(word));

      if (shouldReply) {
        this.logger.log(`Trigger word matched. Sending auto-reply to ${fromNumber}`);

        // In a real Twilio integration, we use Twilio SDK:
        // twilioClient.messages.create({
        //   from: 'whatsapp:+14155238886',
        //   body: `Welcome to Overline! 🚀\n\nBook your slot instantly here:\n${this.DEFAULT_SHOP_LINK}`,
        //   to: fromNumber
        // })

        // For Meta Graph API (Official WhatsApp Business):
        // axios.post('https://graph.facebook.com/v17.0/PHONE_ID/messages', { ... })
        
        // We simulate the response here (TwiML format for Twilio auto-response)
        res.setHeader('Content-Type', 'text/xml');
        return res.status(200).send(`
          <Response>
            <Message>Welcome to Overline! 🚀&#10;&#10;Book your exact slot instantly right here:&#10;${this.DEFAULT_SHOP_LINK}</Message>
          </Response>
        `);
      }

      // If no trigger word, just acknowledge receipt
      return res.status(200).send('<Response></Response>');

    } catch (error) {
      this.logger.error('Error handling WhatsApp webhook', error);
      return res.status(500).send('Internal Server Error');
    }
  }
}
