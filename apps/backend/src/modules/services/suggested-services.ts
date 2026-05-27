export interface SuggestedService {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  category: string;
}

export const SUGGESTED_SERVICES: Record<string, SuggestedService[]> = {
  SALON_MENS: [
    { name: 'Classic Haircut', description: 'Professional haircut tailored to your face shape, includes hair wash and styling.', durationMinutes: 30, price: 150, category: 'Haircut & Styling' },
    { name: 'Beard Styling & Shave', description: 'Precision beard trimming, grooming with hot towel and oil treatment.', durationMinutes: 20, price: 100, category: 'Shave & Beard' },
    { name: 'Hair Color (Men)', description: 'Premium ammonia-free color for a natural look.', durationMinutes: 45, price: 400, category: 'Hair Coloring' },
    { name: 'Head Massage', description: 'Relaxing head massage with premium herbal oils to relieve stress.', durationMinutes: 15, price: 120, category: 'Massage' },
    { name: 'Face Scrub & Clean Up', description: 'Deep cleansing face scrub to remove tan, dirt and blackheads.', durationMinutes: 20, price: 200, category: 'Facial & Grooming' },
  ],
  SALON_WOMENS: [
    { name: 'Hair Styling & Haircut', description: 'Trendy haircut, wash, deep conditioning, and blow dry styling.', durationMinutes: 60, price: 500, category: 'Haircut & Styling' },
    { name: 'Hair Spa', description: 'Revitalizing hair spa treatment for nourishment and shine.', durationMinutes: 60, price: 800, category: 'Hair Treatment' },
    { name: 'Facial & Cleanup', description: 'Deep cleansing facial treatment with premium fruit extracts.', durationMinutes: 45, price: 600, category: 'Skin Care' },
    { name: 'Waxing & Threading', description: 'Full arms, full legs waxing and eyebrow shaping.', durationMinutes: 30, price: 350, category: 'Waxing & Threading' },
    { name: 'Pedicure & Manicure', description: 'Relaxing hand and foot treatment with scrub, massage, and nail grooming.', durationMinutes: 45, price: 500, category: 'Nail Care' },
  ],
  SALON_UNISEX: [
    { name: 'Unisex Haircut & Wash', description: 'Professional haircut suited for any style, includes shampoo and conditioning.', durationMinutes: 45, price: 350, category: 'Haircut' },
    { name: 'Deep Conditioning Treatment', description: 'Intense moisture therapy for dry or damaged hair.', durationMinutes: 40, price: 700, category: 'Hair Treatment' },
    { name: 'Standard Facial', description: 'Custom facial to rejuvenate skin and remove impurities.', durationMinutes: 50, price: 800, category: 'Facials' },
    { name: 'Full Body Massage', description: 'Therapeutic body massage to relieve stress and muscle tension.', durationMinutes: 60, price: 1200, category: 'Wellness' },
  ],
  CLINIC: [
    { name: 'General Doctor Consultation', description: 'Primary health checkup, diagnosis and custom treatment prescription.', durationMinutes: 15, price: 300, category: 'Consultation' },
    { name: 'Specialist Consultation', description: 'Expert review by a specialist doctor for chronic or complex conditions.', durationMinutes: 20, price: 500, category: 'Consultation' },
    { name: 'Follow-up Consultation', description: 'Routine checkup to review diagnostic tests, progress and adjust dosage.', durationMinutes: 10, price: 150, category: 'Consultation' },
    { name: 'Dental Clean-up & Polish', description: 'Professional scaling and polishing for healthy teeth and gums.', durationMinutes: 30, price: 800, category: 'Dental Care' },
    { name: 'Physiotherapy Session', description: 'Rehabilitation therapy for pain relief and physical recovery.', durationMinutes: 45, price: 400, category: 'Therapy' },
  ],
  SPA: [
    { name: 'Aromatherapy Massage', description: 'Swedish massage using high-grade essential oils to soothe body and mind.', durationMinutes: 60, price: 1500, category: 'Massage' },
    { name: 'Deep Tissue Massage', description: 'Therapeutic massage targeting deep muscle layers for chronic tension relief.', durationMinutes: 75, price: 1800, category: 'Massage' },
    { name: 'Body Polish & Scrub', description: 'Exfoliating body treatment followed by skin hydration.', durationMinutes: 45, price: 1200, category: 'Body Treatment' },
  ],
  GYM: [
    { name: 'Personal Training Session', description: 'One-on-one fitness training with a certified personal trainer.', durationMinutes: 60, price: 500, category: 'Training' },
    { name: 'Diet & Nutrition Consultation', description: 'Custom meal planning and dietary recommendations based on body goals.', durationMinutes: 30, price: 400, category: 'Nutrition' },
  ]
};
