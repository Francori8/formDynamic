-- CreateTable
CREATE TABLE "form_link_emails" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "form_link_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_link_emails_linkId_email_key" ON "form_link_emails"("linkId", "email");

-- AddForeignKey
ALTER TABLE "form_link_emails" ADD CONSTRAINT "form_link_emails_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "form_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
