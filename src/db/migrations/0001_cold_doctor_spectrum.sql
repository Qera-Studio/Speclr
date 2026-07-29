ALTER TABLE "clients" ADD COLUMN "address_parts" jsonb;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "address_parts" jsonb;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "pay_currency" text;