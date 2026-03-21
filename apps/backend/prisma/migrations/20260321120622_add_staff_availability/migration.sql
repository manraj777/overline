-- CreateTable
CREATE TABLE "staff_working_hours" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_off" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_time_off" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "is_full_day" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_time_off_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_working_hours_staff_id_idx" ON "staff_working_hours"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_working_hours_staff_id_day_of_week_key" ON "staff_working_hours"("staff_id", "day_of_week");

-- CreateIndex
CREATE INDEX "staff_time_off_staff_id_idx" ON "staff_time_off"("staff_id");

-- CreateIndex
CREATE INDEX "staff_time_off_staff_id_start_time_end_time_idx" ON "staff_time_off"("staff_id", "start_time", "end_time");

-- AddForeignKey
ALTER TABLE "staff_working_hours" ADD CONSTRAINT "staff_working_hours_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_time_off" ADD CONSTRAINT "staff_time_off_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
