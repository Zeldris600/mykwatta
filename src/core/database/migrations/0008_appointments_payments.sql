CREATE TYPE "public"."appointment_status" AS ENUM('REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."payment_channel" AS ENUM('MOBILE_MONEY', 'CARD');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('CONSOLE', 'FAPSHI', 'STRIPE');--> statement-breakpoint
CREATE TYPE "public"."payment_purpose" AS ENUM('LISTING_DEPOSIT');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "listing_appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"inquiry_id" text,
	"requester_user_id" text NOT NULL,
	"status" "appointment_status" DEFAULT 'REQUESTED' NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"location_note" text,
	"notes" text,
	"decline_reason" text,
	"confirmed_at" timestamp,
	"cancelled_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"listing_id" text,
	"appointment_id" text,
	"purpose" "payment_purpose" NOT NULL,
	"channel" "payment_channel" NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" "currency_code" DEFAULT 'XAF' NOT NULL,
	"provider_ref" text,
	"checkout_url" text,
	"failure_reason" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_appointments" ADD CONSTRAINT "listing_appointments_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_appointments" ADD CONSTRAINT "listing_appointments_inquiry_id_listing_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."listing_inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_appointments" ADD CONSTRAINT "listing_appointments_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_listing_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."listing_appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_appointments_listing_idx" ON "listing_appointments" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_appointments_inquiry_idx" ON "listing_appointments" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "listing_appointments_requester_idx" ON "listing_appointments" USING btree ("requester_user_id");--> statement-breakpoint
CREATE INDEX "listing_appointments_status_idx" ON "listing_appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listing_appointments_scheduled_idx" ON "listing_appointments" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_listing_idx" ON "payments" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_provider_ref_idx" ON "payments" USING btree ("provider_ref");