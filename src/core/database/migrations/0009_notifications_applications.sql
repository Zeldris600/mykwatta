CREATE TYPE "public"."application_status" AS ENUM('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."application_type" AS ENUM('RENTAL_APPLICATION', 'PURCHASE_OFFER');--> statement-breakpoint
CREATE TYPE "public"."notification_entity_type" AS ENUM('LISTING', 'INQUIRY', 'APPOINTMENT', 'PAYMENT', 'APPLICATION');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('INQUIRY_CREATED', 'INQUIRY_RESPONDED', 'APPOINTMENT_REQUESTED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_DECLINED', 'APPOINTMENT_CANCELLED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'APPLICATION_SUBMITTED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED');--> statement-breakpoint
CREATE TABLE "listing_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"applicant_user_id" text NOT NULL,
	"payment_id" text NOT NULL,
	"type" "application_type" NOT NULL,
	"status" "application_status" DEFAULT 'SUBMITTED' NOT NULL,
	"message" text NOT NULL,
	"offer_amount_minor" integer,
	"currency" "currency_code" DEFAULT 'XAF' NOT NULL,
	"proposed_move_in_at" timestamp,
	"decision_reason" text,
	"decided_by_user_id" text,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"entity_type" "notification_entity_type",
	"entity_id" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_applications" ADD CONSTRAINT "listing_applications_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_applications" ADD CONSTRAINT "listing_applications_applicant_user_id_user_id_fk" FOREIGN KEY ("applicant_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_applications" ADD CONSTRAINT "listing_applications_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_applications" ADD CONSTRAINT "listing_applications_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listing_applications_payment_uidx" ON "listing_applications" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "listing_applications_listing_idx" ON "listing_applications" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_applications_applicant_idx" ON "listing_applications" USING btree ("applicant_user_id");--> statement-breakpoint
CREATE INDEX "listing_applications_status_idx" ON "listing_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_created_idx" ON "notifications" USING btree ("created_at");