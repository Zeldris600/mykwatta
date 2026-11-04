CREATE TYPE "public"."currency_code" AS ENUM('XAF', 'USD', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('RENT', 'SALE');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('APARTMENT', 'HOUSE', 'STUDIO', 'DUPLEX', 'LAND', 'COMMERCIAL', 'OTHER');--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "listing_status" DEFAULT 'DRAFT' NOT NULL,
	"listing_type" "listing_type" NOT NULL,
	"property_type" "property_type" NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" "currency_code" DEFAULT 'XAF' NOT NULL,
	"city" text NOT NULL,
	"neighborhood" text,
	"address_line" text,
	"country_code" text DEFAULT 'CM' NOT NULL,
	"bedrooms" integer,
	"bathrooms" integer,
	"area_sqm" integer,
	"owner_user_id" text NOT NULL,
	"organisation_id" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_city_idx" ON "listings" USING btree ("city");--> statement-breakpoint
CREATE INDEX "listings_owner_idx" ON "listings" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "listings_org_idx" ON "listings" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "listings_type_idx" ON "listings" USING btree ("listing_type");