-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "form_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
