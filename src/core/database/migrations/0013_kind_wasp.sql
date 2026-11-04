CREATE TYPE "public"."deal_status" AS ENUM('ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."deal_type" AS ENUM('LEASE', 'SALE_AGREEMENT');--> statement-breakpoint
ALTER TYPE "public"."listing_status" ADD VALUE 'UNDER_CONTRACT' BEFORE 'ARCHIVED';--> statement-breakpoint
CREATE TABLE "listing_deals" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"application_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"counterparty_user_id" text NOT NULL,
	"type" "deal_type" NOT NULL,
	"status" "deal_status" DEFAULT 'ACTIVE' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" "currency_code" DEFAULT 'XAF' NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"notes" text,
	"cancelled_reason" text,
	"activated_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "listing_deals" ADD CONSTRAINT "listing_deals_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_deals" ADD CONSTRAINT "listing_deals_application_id_listing_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."listing_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_deals" ADD CONSTRAINT "listing_deals_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_deals" ADD CONSTRAINT "listing_deals_counterparty_user_id_user_id_fk" FOREIGN KEY ("counterparty_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listing_deals_application_uidx" ON "listing_deals" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "listing_deals_listing_idx" ON "listing_deals" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_deals_owner_idx" ON "listing_deals" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "listing_deals_counterparty_idx" ON "listing_deals" USING btree ("counterparty_user_id");--> statement-breakpoint
CREATE INDEX "listing_deals_status_idx" ON "listing_deals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_price_idx" ON "listings" USING btree ("price_minor");--> statement-breakpoint
CREATE INDEX "listings_geo_idx" ON "listings" USING btree ("latitude","longitude");