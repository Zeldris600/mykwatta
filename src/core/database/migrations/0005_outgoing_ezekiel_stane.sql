CREATE TYPE "public"."inquiry_status" AS ENUM('OPEN', 'RESPONDED', 'CLOSED');--> statement-breakpoint
CREATE TABLE "listing_inquiries" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"inquirer_user_id" text NOT NULL,
	"message" text NOT NULL,
	"contact_phone" text,
	"status" "inquiry_status" DEFAULT 'OPEN' NOT NULL,
	"response_message" text,
	"responded_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_inquiries" ADD CONSTRAINT "listing_inquiries_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_inquiries" ADD CONSTRAINT "listing_inquiries_inquirer_user_id_user_id_fk" FOREIGN KEY ("inquirer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_inquiries_listing_idx" ON "listing_inquiries" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_inquiries_inquirer_idx" ON "listing_inquiries" USING btree ("inquirer_user_id");--> statement-breakpoint
CREATE INDEX "listing_inquiries_status_idx" ON "listing_inquiries" USING btree ("status");