ALTER TABLE "documents" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "created_by_email" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "finalized_by" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "finalized_by_email" text;--> statement-breakpoint
CREATE INDEX "documents_finalized_by_idx" ON "documents" USING btree ("finalized_by");