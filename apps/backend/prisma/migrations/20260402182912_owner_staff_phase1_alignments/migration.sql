-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
