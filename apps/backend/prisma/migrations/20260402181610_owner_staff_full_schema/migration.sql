-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'ONLINE', 'UPI', 'CARD', 'RAZORPAY', 'STRIPE', 'WALLET');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "BookingStatus" ADD VALUE 'WAITLISTED';
ALTER TYPE "BookingStatus" ADD VALUE 'IN_SERVICE';
ALTER TYPE "BookingStatus" ADD VALUE 'SKIPPED';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "amount" INTEGER,
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "call_ahead_reply" TEXT,
ADD COLUMN     "call_ahead_sent_at" TIMESTAMP(3),
ADD COLUMN     "location_shared_at" TIMESTAMP(3),
ADD COLUMN     "payment_id" TEXT,
ADD COLUMN     "payment_method" "PaymentMethod",
ADD COLUMN     "platform_fee" INTEGER,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "service_id" TEXT,
ADD COLUMN     "slot_date" DATE,
ADD COLUMN     "slot_end_time" TEXT,
ADD COLUMN     "slot_time" TEXT,
ADD COLUMN     "staff_earning" INTEGER,
ADD COLUMN     "staff_profile_id" TEXT,
ADD COLUMN     "token_number" TEXT,
ADD COLUMN     "user_lat" DOUBLE PRECISION,
ADD COLUMN     "user_lng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "read_at" TIMESTAMP(3),
ADD COLUMN     "sender_role" TEXT,
ADD COLUMN     "session_id" TEXT;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "helpful" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "owner_reply" TEXT,
ADD COLUMN     "staff_profile_id" TEXT,
ADD COLUMN     "staff_reply" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "category" TEXT,
ADD COLUMN     "max_clients_per_hour" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "staff_profile_id" TEXT,
ADD COLUMN     "videos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "owner_id" TEXT;

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "avatar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspend_reason" TEXT,
    "upi_id" TEXT,
    "bank_account_no" TEXT,
    "bank_ifsc" TEXT,
    "upi_verified" BOOLEAN NOT NULL DEFAULT false,
    "notif_reminder_mins" INTEGER NOT NULL DEFAULT 30,
    "notif_call_ahead_mins" INTEGER NOT NULL DEFAULT 15,
    "notif_new_booking" BOOLEAN NOT NULL DEFAULT true,
    "notif_location_share" BOOLEAN NOT NULL DEFAULT true,
    "notif_review" BOOLEAN NOT NULL DEFAULT true,
    "notif_no_show" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_schedules" (
    "id" TEXT NOT NULL,
    "staff_profile_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_working" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_breaks" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "staff_breaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earnings" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "staff_profile_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "platform_fee" INTEGER NOT NULL,
    "net_amount" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),
    "razorpay_transfer_id" TEXT,

    CONSTRAINT "earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "staff_profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_user_id_key" ON "staff_profiles"("user_id");

-- CreateIndex
CREATE INDEX "staff_profiles_shop_id_idx" ON "staff_profiles"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_schedules_staff_profile_id_day_of_week_key" ON "staff_schedules"("staff_profile_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "earnings_booking_id_key" ON "earnings"("booking_id");

-- CreateIndex
CREATE INDEX "earnings_staff_profile_id_earned_at_idx" ON "earnings"("staff_profile_id", "earned_at");

-- CreateIndex
CREATE INDEX "earnings_shop_id_earned_at_idx" ON "earnings"("shop_id", "earned_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_sessions_booking_id_key" ON "chat_sessions"("booking_id");

-- CreateIndex
CREATE INDEX "chat_sessions_staff_profile_id_idx" ON "chat_sessions"("staff_profile_id");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "bookings_staff_profile_id_idx" ON "bookings"("staff_profile_id");

-- CreateIndex
CREATE INDEX "bookings_service_id_idx" ON "bookings"("service_id");

-- CreateIndex
CREATE INDEX "bookings_shop_id_slot_date_slot_time_idx" ON "bookings"("shop_id", "slot_date", "slot_time");

-- CreateIndex
CREATE INDEX "bookings_staff_profile_id_slot_date_idx" ON "bookings"("staff_profile_id", "slot_date");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_staff_profile_id_created_at_idx" ON "reviews"("staff_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_shop_id_created_at_idx" ON "reviews"("shop_id", "created_at");

-- CreateIndex
CREATE INDEX "services_shop_id_staff_profile_id_idx" ON "services"("shop_id", "staff_profile_id");

-- CreateIndex
CREATE INDEX "shops_owner_id_idx" ON "shops"("owner_id");

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_breaks" ADD CONSTRAINT "staff_breaks_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "staff_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
