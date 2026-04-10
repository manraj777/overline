import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GooglePlaceResult {
  found: boolean;
  placeId?: string;
  rating?: number;
  reviewsCount?: number;
  formattedAddress?: string;
  location?: {
    lat: number;
    lng: number;
  };
  types?: string[];
  photos?: string[];
}

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('google.placesApiKey') || '';
    if (!this.apiKey) {
      this.logger.warn('Google Places API key not configured - shop verification will be disabled');
    }
  }

  /**
   * Search for a shop by name and address
   */
  async searchShop(
    shopName: string,
    address: string,
    city: string,
    phone?: string,
  ): Promise<GooglePlaceResult> {
    if (!this.apiKey) {
      this.logger.warn('Google Places API key not configured');
      return { found: false };
    }

    try {
      // Build search query
      const query = `${shopName} ${address}, ${city}`;

      // Use Find Place API first for more accurate results
      const findPlaceUrl = `${this.baseUrl}/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry,rating,user_ratings_total,types,photos&key=${this.apiKey}`;

      const response = await fetch(findPlaceUrl);
      const data: any = await response.json();

      if (data.status !== 'OK' || !data.candidates || data.candidates.length === 0) {
        this.logger.log(`Shop not found on Google: ${shopName}`);
        return { found: false };
      }

      const place = data.candidates[0];

      // If phone provided, verify with details
      if (phone && place.place_id) {
        const detailsUrl = `${this.baseUrl}/details/json?place_id=${place.place_id}&fields=formatted_phone_number,international_phone_number&key=${this.apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData: any = await detailsResponse.json();

        if (detailsData.status === 'OK' && detailsData.result) {
          const googlePhone =
            detailsData.result.formatted_phone_number ||
            detailsData.result.international_phone_number;
          const normalizedPhone = this.normalizePhone(phone);
          const normalizedGooglePhone = this.normalizePhone(googlePhone);

          // If phones don't match, it might be a different business
          if (
            normalizedPhone &&
            normalizedGooglePhone &&
            normalizedPhone !== normalizedGooglePhone
          ) {
            this.logger.warn(`Phone mismatch for ${shopName}: ${phone} vs ${googlePhone}`);
            // Still return the result but caller should check
          }
        }
      }

      const result: GooglePlaceResult = {
        found: true,
        placeId: place.place_id,
        rating: place.rating,
        reviewsCount: place.user_ratings_total || 0,
        formattedAddress: place.formatted_address,
        location: place.geometry?.location
          ? {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
            }
          : undefined,
        types: place.types,
        photos: place.photos
          ?.slice(0, 5)
          .map(
            (photo: any) =>
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${this.apiKey}`,
          ),
      };

      this.logger.log(`Shop found on Google: ${shopName} (${result.placeId})`);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error searching Google Places: ${message}`);
      return { found: false };
    }
  }

  /**
   * Normalize phone number for comparison
   */
  private normalizePhone(phone?: string): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '').slice(-10); // Keep last 10 digits
  }

  /**
   * Check if Google Places API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
