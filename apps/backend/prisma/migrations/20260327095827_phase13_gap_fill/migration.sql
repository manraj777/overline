-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "helpful_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "fcm_token" TEXT;

-- CreateTable
CREATE TABLE "helpful_votes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "helpful_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "helpful_votes_user_id_review_id_key" ON "helpful_votes"("user_id", "review_id");

-- CreateIndex
CREATE INDEX "bookings_shop_id_status_start_time_idx" ON "bookings"("shop_id", "status", "start_time");

-- CreateIndex
CREATE INDEX "bookings_user_id_status_idx" ON "bookings"("user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- AddForeignKey
ALTER TABLE "helpful_votes" ADD CONSTRAINT "helpful_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpful_votes" ADD CONSTRAINT "helpful_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
