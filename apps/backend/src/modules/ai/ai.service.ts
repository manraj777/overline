import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

export interface ShopRecommendation {
  shopId: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  rating: number;
  reviewsCount: number;
  distance?: number;
  reasoning: string;
  matchScore: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openaiApiKey: string | undefined;
  private readonly geminiApiKey: string | undefined;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.geminiApiKey = this.configService.get<string>('GOOGLE_GEMINI_API_KEY');

    if (this.openaiApiKey && this.openaiApiKey !== 'REPLACE_ME') {
      this.logger.log('AI Service configured with OpenAI');
    } else if (this.geminiApiKey && this.geminiApiKey !== 'REPLACE_ME') {
      this.logger.log('AI Service configured with Google Gemini');
    } else {
      this.logger.warn('AI Service: No API key configured — using fallback heuristic ranking');
    }
  }

  /**
   * Get personalized shop recommendations for a user
   */
  async getRecommendations(
    userId: string,
    lat?: number,
    lng?: number,
    limit = 10,
  ): Promise<ShopRecommendation[]> {
    // Check Redis cache
    const cacheKey = `ai:reco:${userId}:${lat || 0}:${lng || 0}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`AI recommendations cache hit for user ${userId}`);
      return JSON.parse(cached);
    }

    // 1. Fetch nearby shops
    const shops = await this.prisma.shop.findMany({
      where: { isActive: true },
      include: {
        services: { where: { isActive: true }, select: { name: true, price: true } },
        reviews: {
          select: { rating: true },
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
        tenant: { select: { type: true } },
      },
      take: 20,
    });

    // 2. Fetch user's booking history
    const userBookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        shop: { select: { id: true, name: true } },
        services: { select: { serviceName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 3. Calculate shop scores with heuristics
    const shopScores = shops.map((shop) => {
      const avgRating =
        shop.reviews.length > 0
          ? shop.reviews.reduce((sum, r) => sum + r.rating, 0) / shop.reviews.length
          : 0;
      const reviewsCount = shop.reviews.length;

      // Calculate distance if coordinates provided
      let distance: number | undefined;
      if (lat && lng && shop.latitude && shop.longitude) {
        distance = this.haversineDistance(
          lat,
          lng,
          Number(shop.latitude),
          Number(shop.longitude),
        );
      }

      // Check if user has previously booked at this shop's category
      const shopCategory = shop.tenant?.type || 'OTHER';
      const categoryBooked = userBookings.some(
        (b) => b.shop?.id === shop.id,
      );
      const visitedBefore = userBookings.some((b) => b.shop?.id === shop.id);

      // Heuristic score: rating, review count, distance, repeat visits
      let matchScore = avgRating * 20; // 0-100 from rating
      matchScore += Math.min(reviewsCount, 20) * 1.5; // Up to 30 from reviews
      if (distance !== undefined) {
        matchScore += Math.max(0, 30 - distance * 3); // Up to 30 from proximity (10km range)
      }
      if (categoryBooked) matchScore += 10; // Category preference
      if (visitedBefore) matchScore += 15; // Repeat customer boost

      // Generate reasoning
      const reasons: string[] = [];
      if (avgRating >= 4.5) reasons.push(`Highly rated (${avgRating.toFixed(1)}⭐)`);
      else if (avgRating >= 4.0) reasons.push(`Well-rated (${avgRating.toFixed(1)}⭐)`);
      if (reviewsCount >= 10) reasons.push(`${reviewsCount} verified reviews`);
      if (distance !== undefined && distance < 3)
        reasons.push(`Only ${distance.toFixed(1)}km away`);
      if (visitedBefore) reasons.push("You've visited before");
      if (shop.services.length > 3)
        reasons.push(`${shop.services.length} services available`);

      const reasoning =
        reasons.length > 0
          ? reasons.join(' · ')
          : `${shopCategory} shop in ${shop.city}`;

      return {
        shopId: shop.id,
        name: shop.name,
        slug: shop.slug,
        address: shop.address,
        city: shop.city,
        rating: Math.round(avgRating * 10) / 10,
        reviewsCount,
        distance: distance ? Math.round(distance * 10) / 10 : undefined,
        reasoning,
        matchScore: Math.round(matchScore),
      };
    });

    // If AI is configured, enhance with LLM reasoning
    if (this.isAiConfigured()) {
      try {
        const enhanced = await this.enhanceWithAI(shopScores, userBookings);
        if (enhanced) {
          const result = enhanced.slice(0, limit);
          await this.redis.set(cacheKey, JSON.stringify(result), 600); // Cache 10 min
          return result;
        }
      } catch (err) {
        this.logger.warn(`AI enhancement failed, falling back to heuristic: ${err}`);
      }
    }

    // Sort by matchScore descending
    const result = shopScores
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    await this.redis.set(cacheKey, JSON.stringify(result), 600);
    return result;
  }

  /**
   * AI Chat — Process chat messages and return a response
   */
  async chat(
    messages: ChatMessage[],
    userId?: string,
    shopId?: string,
  ): Promise<string> {
    // Build context
    let userContext = '';
    if (userId) {
      const upcomingBookings = await this.prisma.booking.count({
        where: {
          userId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startTime: { gte: new Date() },
        },
      });
      userContext = `User has ${upcomingBookings} upcoming booking(s). `;
    }

    let shopContext = '';
    if (shopId) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          name: true,
          address: true,
          services: { where: { isActive: true }, select: { name: true, price: true, durationMinutes: true } },
          queueStats: true,
        },
      });
      if (shop) {
        shopContext = `Current shop: ${shop.name} at ${shop.address}. `;
        shopContext += `Services: ${shop.services.map((s) => `${s.name} (₹${s.price}, ${s.durationMinutes}min)`).join(', ')}. `;
        if (shop.queueStats) {
          shopContext += `Queue: ${shop.queueStats.currentWaitingCount} waiting, ~${shop.queueStats.estimatedWaitMinutes}min wait. `;
        }
      }
    }

    const systemPrompt = `You are Overline Assistant, a helpful AI for booking salon, clinic, and service appointments. 
Be concise and friendly. Current time: ${new Date().toISOString()}. 
${userContext}${shopContext}
Help users find services, understand wait times, manage bookings, and discover nearby shops.
If a user wants to book, suggest they use the booking flow in the app.
Keep responses under 200 words.`;

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // Try OpenAI first, then Gemini
    if (this.openaiApiKey && this.openaiApiKey !== 'REPLACE_ME') {
      return this.chatWithOpenAI(fullMessages);
    }

    if (this.geminiApiKey && this.geminiApiKey !== 'REPLACE_ME') {
      return this.chatWithGemini(fullMessages);
    }

    // Fallback: simple keyword-based response
    return this.fallbackChat(messages[messages.length - 1]?.content || '');
  }

  // ─── Private helpers ────────────────────────────────────────────

  private isAiConfigured(): boolean {
    return (
      (!!this.openaiApiKey && this.openaiApiKey !== 'REPLACE_ME') ||
      (!!this.geminiApiKey && this.geminiApiKey !== 'REPLACE_ME')
    );
  }

  private async enhanceWithAI(
    shops: ShopRecommendation[],
    _userBookings: any[],
  ): Promise<ShopRecommendation[] | null> {
    const top5 = shops.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
    const prompt = `Given these shops with scores, provide ONE short personalized reason (max 15 words) for each. 
Respond as JSON array: [{"shopId":"...","reasoning":"..."}]
Shops: ${JSON.stringify(top5.map((s) => ({ shopId: s.shopId, name: s.name, score: s.matchScore, rating: s.rating })))}`;

    try {
      const response = await this.chatWithAI([
        { role: 'system', content: 'You are a concise recommendation engine. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt },
      ]);

      const enhanced = JSON.parse(response);
      if (Array.isArray(enhanced)) {
        for (const e of enhanced) {
          const shop = shops.find((s) => s.shopId === e.shopId);
          if (shop && e.reasoning) {
            shop.reasoning = e.reasoning;
          }
        }
      }
    } catch {
      // Keep heuristic reasoning
    }

    return shops.sort((a, b) => b.matchScore - a.matchScore);
  }

  private async chatWithAI(messages: ChatMessage[]): Promise<string> {
    if (this.openaiApiKey && this.openaiApiKey !== 'REPLACE_ME') {
      return this.chatWithOpenAI(messages);
    }
    if (this.geminiApiKey && this.geminiApiKey !== 'REPLACE_ME') {
      return this.chatWithGemini(messages);
    }
    return '';
  }

  private async chatWithOpenAI(messages: ChatMessage[]): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || 'I could not generate a response.';
  }

  private async chatWithGemini(messages: ChatMessage[]): Promise<string> {
    const systemMsg = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');

    const contents = userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemMsg
            ? { parts: [{ text: systemMsg.content }] }
            : undefined,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'I could not generate a response.'
    );
  }

  private fallbackChat(userMessage: string): string {
    const lower = userMessage.toLowerCase();

    if (lower.includes('book') || lower.includes('appointment')) {
      return "I'd love to help you book! You can browse shops on the home page or use the search to find services near you. Once you find a shop, tap 'Book Now' to select a service and time slot. 📅";
    }
    if (lower.includes('cancel')) {
      return 'To cancel a booking, go to "My Bookings" in your profile, find the booking, and tap "Cancel". Free cancellation is available up to 1 hour before your appointment. ❌';
    }
    if (lower.includes('wait') || lower.includes('queue')) {
      return "You can check real-time wait times on any shop's detail page. The queue widget shows how many people are ahead of you and the estimated wait time. ⏱️";
    }
    if (lower.includes('review') || lower.includes('rating')) {
      return "After your appointment is completed, you'll receive a notification to leave a review. You can also find past bookings in 'My Bookings' and review them there. ⭐";
    }
    if (lower.includes('payment') || lower.includes('pay')) {
      return 'We support online payment (Razorpay), wallet balance, and pay-at-shop options. Choose your preferred method during checkout! 💳';
    }
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return "Hey there! 👋 I'm Overline Assistant. I can help you find shops, book appointments, check wait times, or answer questions about your bookings. What would you like to do?";
    }

    return "I'm here to help! You can ask me about booking appointments, finding shops near you, wait times, cancellations, or payments. What would you like to know? 🤔";
  }

  /**
   * Haversine distance between two coordinates in km
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
