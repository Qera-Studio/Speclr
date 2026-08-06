CREATE TABLE "studio_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"info" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "company_name" text;