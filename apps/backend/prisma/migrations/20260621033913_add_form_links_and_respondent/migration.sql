-- AlterTable
ALTER TABLE "responses" ADD COLUMN     "linkId" TEXT,
ADD COLUMN     "respondent" JSONB;

-- CreateTable
CREATE TABLE "form_links" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "maxResponses" INTEGER,
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_links_token_key" ON "form_links"("token");

-- AddForeignKey
ALTER TABLE "form_links" ADD CONSTRAINT "form_links_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "form_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
