CREATE TABLE "client_inputs" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"category" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exclusions" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"category" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"schedule_key" text NOT NULL,
	"sort_order" integer NOT NULL,
	"content" jsonb NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "services_schedule_key_idx" ON "services" USING btree ("schedule_key");