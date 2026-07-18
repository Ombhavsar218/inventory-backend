-- AlterTable: Add shopId, drop customerName
-- First add shopId as nullable for existing data
ALTER TABLE "Bill" ADD COLUMN "shopId" INTEGER;

-- Update existing bills to use the first shop (fallback)
UPDATE "Bill" SET "shopId" = (SELECT MIN(id) FROM "Shop") WHERE "shopId" IS NULL;

-- Make shopId NOT NULL
ALTER TABLE "Bill" ALTER COLUMN "shopId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old customerName column
ALTER TABLE "Bill" DROP COLUMN "customerName";
