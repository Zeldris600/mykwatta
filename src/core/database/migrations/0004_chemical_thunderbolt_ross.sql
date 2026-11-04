CREATE TYPE "public"."kyc_document_type" AS ENUM('NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE', 'BUSINESS_REGISTRATION');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('UNDER_REVIEW', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('ACTIVE', 'HIDDEN');--> statement-breakpoint
ALTER TYPE "public"."persona" ADD VALUE 'PLATFORM_ADMIN';--> statement-breakpoint
CREATE TABLE "user_kyc" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" "kyc_status" DEFAULT 'UNDER_REVIEW' NOT NULL,
	"document_type" "kyc_document_type" NOT NULL,
	"document_number" text NOT NULL,
	"document_url" text NOT NULL,
	"full_name" text NOT NULL,
	"rejection_reason" text,
	"reviewed_by_user_id" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"status" "review_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_kyc" ADD CONSTRAINT "user_kyc_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_kyc" ADD CONSTRAINT "user_kyc_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reviews" ADD CONSTRAINT "listing_reviews_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reviews" ADD CONSTRAINT "listing_reviews_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_kyc_user_uidx" ON "user_kyc" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_kyc_status_idx" ON "user_kyc" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_reviews_listing_author_uidx" ON "listing_reviews" USING btree ("listing_id","author_user_id");--> statement-breakpoint
CREATE INDEX "listing_reviews_listing_idx" ON "listing_reviews" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_reviews_author_idx" ON "listing_reviews" USING btree ("author_user_id");