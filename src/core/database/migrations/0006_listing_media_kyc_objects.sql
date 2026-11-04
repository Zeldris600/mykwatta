CREATE TABLE "listing_media" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"caption" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_kyc" ADD COLUMN "document_content_type" text;--> statement-breakpoint
UPDATE "user_kyc" SET "document_content_type" = 'application/octet-stream' WHERE "document_content_type" IS NULL;--> statement-breakpoint
ALTER TABLE "user_kyc" ALTER COLUMN "document_content_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listing_media_object_key_uidx" ON "listing_media" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "listing_media_listing_idx" ON "listing_media" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_media_listing_sort_idx" ON "listing_media" USING btree ("listing_id","sort_order");