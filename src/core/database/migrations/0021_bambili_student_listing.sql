ALTER TYPE "property_type" ADD VALUE IF NOT EXISTS 'CITE';
--> statement-breakpoint
CREATE TYPE "public"."rent_period" AS ENUM('MONTHLY', 'ANNUAL', 'ACADEMIC_YEAR');
--> statement-breakpoint
CREATE TYPE "public"."listing_audience" AS ENUM('STUDENT', 'GENERAL', 'BOTH');
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "rent_period" "rent_period" DEFAULT 'MONTHLY' NOT NULL;
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "audience" "listing_audience" DEFAULT 'GENERAL' NOT NULL;
--> statement-breakpoint
CREATE INDEX "listings_rent_period_idx" ON "listings" USING btree ("rent_period");
--> statement-breakpoint
CREATE INDEX "listings_audience_idx" ON "listings" USING btree ("audience");
