-- Phase 9: Razorpay Route payout linkage fields on staff profiles
ALTER TABLE "staff_profiles"
  ADD COLUMN "razorpay_contact_id" TEXT,
  ADD COLUMN "fund_account_id" TEXT,
  ADD COLUMN "contact_metadata" JSONB,
  ADD COLUMN "upi_verification_status" TEXT,
  ADD COLUMN "bank_verification_status" TEXT,
  ADD COLUMN "payout_preference" TEXT;

CREATE INDEX "staff_profiles_razorpay_contact_id_idx" ON "staff_profiles"("razorpay_contact_id");
CREATE INDEX "staff_profiles_fund_account_id_idx" ON "staff_profiles"("fund_account_id");
