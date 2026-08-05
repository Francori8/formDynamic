-- AlterTable
ALTER TABLE "otp_codes" ADD COLUMN     "formId" TEXT,
ALTER COLUMN "linkId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
