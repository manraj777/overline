-- Add verification audit fields and OTP counters for one-time phone verification flow
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "phone_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "phone_verification_channel" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsapp_otp_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sms_otp_attempts" INTEGER NOT NULL DEFAULT 0;
