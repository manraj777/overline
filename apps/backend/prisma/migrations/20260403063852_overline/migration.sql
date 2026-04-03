-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'PAY_AT_SHOP';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPERADMIN';

-- AlterTable
ALTER TABLE "staff_profiles" ADD COLUMN     "staff_role" "StaffRole" NOT NULL DEFAULT 'TECHNICIAN';

-- CreateIndex
CREATE INDEX "staff_profiles_shop_id_staff_role_idx" ON "staff_profiles"("shop_id", "staff_role");
