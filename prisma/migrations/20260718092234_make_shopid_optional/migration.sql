-- DropForeignKey
ALTER TABLE "Stock" DROP CONSTRAINT "Stock_shopId_fkey";

-- AlterTable
ALTER TABLE "Stock" ALTER COLUMN "shopId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
