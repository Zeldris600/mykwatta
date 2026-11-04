CREATE TYPE "public"."escrow_status" AS ENUM('HELD', 'RELEASED_TO_OWNER', 'REFUNDED_TO_PAYER');--> statement-breakpoint
CREATE TYPE "public"."inquiry_message_channel" AS ENUM('IN_APP', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."listing_report_status" AS ENUM('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."listing_verification_status" AS ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');--> statement-breakpoint
ALTER TYPE "public"."payment_purpose" ADD VALUE 'VIEWING_FEE';--> statement-breakpoint
ALTER TYPE "public"."payment_purpose" ADD VALUE 'APPLICATION_FEE';--> statement-breakpoint
ALTER TYPE "public"."payment_purpose" ADD VALUE 'PLATFORM_FEE';--> statement-breakpoint
CREATE TABLE "escrow_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"listing_id" text,
	"payer_user_id" text NOT NULL,
	"beneficiary_user_id" text,
	"amount_minor" integer NOT NULL,
	"currency" "currency_code" NOT NULL,
	"status" "escrow_status" DEFAULT 'HELD' NOT NULL,
	"held_at" timestamp DEFAULT now() NOT NULL,
	"released_at" timestamp,
	"refunded_at" timestamp,
	"release_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_cities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_fr" text,
	"country_code" text DEFAULT 'CM' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_quartiers" (
	"id" text PRIMARY KEY NOT NULL,
	"city_id" text NOT NULL,
	"name" text NOT NULL,
	"name_fr" text,
	"slug" text NOT NULL,
	"center_latitude" double precision,
	"center_longitude" double precision,
	"boundary" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_inquiry_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"inquiry_id" text NOT NULL,
	"sender_user_id" text,
	"channel" "inquiry_message_channel" NOT NULL,
	"body" text NOT NULL,
	"external_message_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"reporter_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" "listing_report_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "preferred_locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "licence_document_url" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "nui_document_url" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "licence_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "verification_status" "listing_verification_status" DEFAULT 'UNVERIFIED' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "trust_frozen_at" timestamp;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "trust_frozen_reason" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "duplicate_of_listing_id" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "quartier_id" text;--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_payer_user_id_user_id_fk" FOREIGN KEY ("payer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_beneficiary_user_id_user_id_fk" FOREIGN KEY ("beneficiary_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_quartiers" ADD CONSTRAINT "geo_quartiers_city_id_geo_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."geo_cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_inquiry_messages" ADD CONSTRAINT "listing_inquiry_messages_inquiry_id_listing_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."listing_inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_inquiry_messages" ADD CONSTRAINT "listing_inquiry_messages_sender_user_id_user_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "escrow_ledger_payment_uidx" ON "escrow_ledger" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "escrow_ledger_payer_idx" ON "escrow_ledger" USING btree ("payer_user_id");--> statement-breakpoint
CREATE INDEX "escrow_ledger_beneficiary_idx" ON "escrow_ledger" USING btree ("beneficiary_user_id");--> statement-breakpoint
CREATE INDEX "escrow_ledger_listing_idx" ON "escrow_ledger" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "escrow_ledger_status_idx" ON "escrow_ledger" USING btree ("status");--> statement-breakpoint
CREATE INDEX "geo_quartiers_city_idx" ON "geo_quartiers" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "geo_quartiers_slug_idx" ON "geo_quartiers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "listing_inquiry_messages_inquiry_idx" ON "listing_inquiry_messages" USING btree ("inquiry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_inquiry_messages_external_uidx" ON "listing_inquiry_messages" USING btree ("external_message_id");--> statement-breakpoint
CREATE INDEX "listing_reports_listing_idx" ON "listing_reports" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_reports_reporter_idx" ON "listing_reports" USING btree ("reporter_user_id");--> statement-breakpoint
CREATE INDEX "listing_reports_status_idx" ON "listing_reports" USING btree ("status");--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_duplicate_of_listing_id_listings_id_fk" FOREIGN KEY ("duplicate_of_listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_quartier_id_geo_quartiers_id_fk" FOREIGN KEY ("quartier_id") REFERENCES "public"."geo_quartiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listings_verification_status_idx" ON "listings" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "listings_quartier_idx" ON "listings" USING btree ("quartier_id");--> statement-breakpoint
CREATE INDEX "listings_duplicate_of_idx" ON "listings" USING btree ("duplicate_of_listing_id");