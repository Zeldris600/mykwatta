CREATE TYPE "public"."listing_title_status" AS ENUM('TITRE_FONCIER', 'ACTE_DE_VENTE', 'EN_COURS', 'INDIVISION', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."listing_media_kind" AS ENUM('PHOTO', 'FLOOR_PLAN');--> statement-breakpoint
CREATE TYPE "public"."appointment_modality" AS ENUM('IN_PERSON', 'VIRTUAL');--> statement-breakpoint
CREATE TYPE "public"."title_document_type" AS ENUM('TITRE_FONCIER', 'ACTE_DE_VENTE', 'PLAN_DE_BORNAGE', 'CERTIFICAT_DE_PROPRIETE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."title_document_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."professional_kind" AS ENUM('NOTAIRE', 'LAWYER');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'SAVED_SEARCH_MATCH';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'LEAD_SLA_BREACH';--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "title_status" "listing_title_status" DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "is_premium" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_media" ADD COLUMN "kind" "listing_media_kind" DEFAULT 'PHOTO' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_media" ADD COLUMN "quality_score" integer;--> statement-breakpoint
ALTER TABLE "listing_inquiries" ADD COLUMN "assignee_user_id" text;--> statement-breakpoint
ALTER TABLE "listing_inquiries" ADD COLUMN "assigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "listing_inquiries" ADD COLUMN "sla_due_at" timestamp;--> statement-breakpoint
ALTER TABLE "listing_inquiries" ADD COLUMN "first_responded_at" timestamp;--> statement-breakpoint
ALTER TABLE "listing_inquiries" ADD COLUMN "sla_breach_notified_at" timestamp;--> statement-breakpoint
ALTER TABLE "listing_appointments" ADD COLUMN "modality" "appointment_modality" DEFAULT 'IN_PERSON' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_appointments" ADD COLUMN "meeting_url" text;--> statement-breakpoint
ALTER TABLE "listing_deals" ADD COLUMN "commission_bps" integer;--> statement-breakpoint
CREATE TABLE "amenity_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_fr" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "landmark_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_fr" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "listing_amenities" (
	"listing_id" text NOT NULL,
	"amenity_id" text NOT NULL,
	CONSTRAINT "listing_amenities_listing_id_amenity_id_pk" PRIMARY KEY("listing_id","amenity_id")
);--> statement-breakpoint
CREATE TABLE "listing_landmarks" (
	"listing_id" text NOT NULL,
	"landmark_id" text NOT NULL,
	CONSTRAINT "listing_landmarks_listing_id_landmark_id_pk" PRIMARY KEY("listing_id","landmark_id")
);--> statement-breakpoint
CREATE TABLE "listing_title_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"document_type" "title_document_type" NOT NULL,
	"storage_key" text NOT NULL,
	"status" "title_document_status" DEFAULT 'PENDING' NOT NULL,
	"uploaded_by" text NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "directory_professionals" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "professional_kind" NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"phone" text,
	"email" text,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "saved_search_matches" (
	"id" text PRIMARY KEY NOT NULL,
	"saved_search_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "listing_inquiries" ADD CONSTRAINT "listing_inquiries_assignee_user_id_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_amenities" ADD CONSTRAINT "listing_amenities_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_amenities" ADD CONSTRAINT "listing_amenities_amenity_id_amenity_catalog_id_fk" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenity_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_landmarks" ADD CONSTRAINT "listing_landmarks_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_landmarks" ADD CONSTRAINT "listing_landmarks_landmark_id_landmark_catalog_id_fk" FOREIGN KEY ("landmark_id") REFERENCES "public"."landmark_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_title_documents" ADD CONSTRAINT "listing_title_documents_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_title_documents" ADD CONSTRAINT "listing_title_documents_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_search_matches" ADD CONSTRAINT "saved_search_matches_saved_search_id_saved_searches_id_fk" FOREIGN KEY ("saved_search_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_search_matches" ADD CONSTRAINT "saved_search_matches_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listings_title_status_idx" ON "listings" USING btree ("title_status");--> statement-breakpoint
CREATE INDEX "listings_is_premium_idx" ON "listings" USING btree ("is_premium");--> statement-breakpoint
CREATE INDEX "listing_inquiries_assignee_idx" ON "listing_inquiries" USING btree ("assignee_user_id");--> statement-breakpoint
CREATE INDEX "listing_inquiries_sla_due_idx" ON "listing_inquiries" USING btree ("sla_due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "amenity_catalog_slug_uidx" ON "amenity_catalog" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "landmark_catalog_slug_uidx" ON "landmark_catalog" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "listing_amenities_amenity_idx" ON "listing_amenities" USING btree ("amenity_id");--> statement-breakpoint
CREATE INDEX "listing_landmarks_landmark_idx" ON "listing_landmarks" USING btree ("landmark_id");--> statement-breakpoint
CREATE INDEX "listing_title_documents_listing_idx" ON "listing_title_documents" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_title_documents_status_idx" ON "listing_title_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listing_title_documents_uploader_idx" ON "listing_title_documents" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "directory_professionals_city_idx" ON "directory_professionals" USING btree ("city");--> statement-breakpoint
CREATE INDEX "directory_professionals_kind_idx" ON "directory_professionals" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "directory_professionals_verified_idx" ON "directory_professionals" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "saved_searches_user_idx" ON "saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_search_matches_search_listing_uidx" ON "saved_search_matches" USING btree ("saved_search_id","listing_id");--> statement-breakpoint
CREATE INDEX "saved_search_matches_listing_idx" ON "saved_search_matches" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "saved_search_matches_created_idx" ON "saved_search_matches" USING btree ("created_at");--> statement-breakpoint
INSERT INTO "amenity_catalog" ("id", "slug", "name_en", "name_fr", "category") VALUES
	('amenity_generator', 'generator', 'Generator', 'Groupe électrogène', 'UTILITY'),
	('amenity_inverter', 'inverter', 'Inverter', 'Onduleur', 'UTILITY'),
	('amenity_borehole', 'borehole', 'Borehole', 'Forage', 'UTILITY'),
	('amenity_camwater', 'camwater', 'Camwater', 'Camwater', 'UTILITY'),
	('amenity_furnished', 'furnished', 'Furnished', 'Meublé', 'FURNISHING'),
	('amenity_parking', 'parking', 'Parking', 'Parking', 'ACCESS'),
	('amenity_standing', 'standing', 'Standing', 'Standing', 'FINISH')
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "landmark_catalog" ("id", "slug", "name_en", "name_fr", "category") VALUES
	('landmark_school', 'school', 'School', 'École', 'EDUCATION'),
	('landmark_marche', 'marche', 'Market', 'Marché', 'COMMERCE'),
	('landmark_embassy_corridor', 'embassy_corridor', 'Embassy corridor', 'Corridor des ambassades', 'DIPLOMATIC')
ON CONFLICT ("slug") DO NOTHING;