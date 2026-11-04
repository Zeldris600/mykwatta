CREATE TYPE "public"."maintenance_ticket_status" AS ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."rent_schedule_item_status" AS ENUM('PENDING', 'PAID', 'OVERDUE', 'WAIVED');--> statement-breakpoint
CREATE TYPE "public"."vendor_category" AS ENUM('PLUMBER', 'ELECTRICIAN', 'PAINTER', 'CLEANING', 'GENERAL');--> statement-breakpoint
CREATE TYPE "public"."vendor_lead_status" AS ENUM('REQUESTED', 'SENT', 'CLOSED');--> statement-breakpoint
ALTER TYPE "public"."payment_purpose" ADD VALUE 'RENT_PAYMENT';--> statement-breakpoint
ALTER TYPE "public"."payment_purpose" ADD VALUE 'VENDOR_LEAD_FEE';--> statement-breakpoint
ALTER TYPE "public"."payment_purpose" ADD VALUE 'DOCS_VERIFICATION';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'MAINTENANCE_TICKET_CREATED';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'MAINTENANCE_TICKET_ASSIGNED';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'MAINTENANCE_TICKET_STATUS_CHANGED';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'RENT_REMINDER';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'LEASE_RENEWAL_NOTICE';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'VENDOR_LEAD_SENT';--> statement-breakpoint
ALTER TYPE "public"."notification_entity_type" ADD VALUE 'MAINTENANCE_TICKET';--> statement-breakpoint
ALTER TYPE "public"."notification_entity_type" ADD VALUE 'VENDOR_LEAD';--> statement-breakpoint
ALTER TYPE "public"."notification_entity_type" ADD VALUE 'RENT_SCHEDULE';--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "documents_verified_by_mykwatta" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE "maintenance_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"assigned_to_user_id" text,
	"status" "maintenance_ticket_status" DEFAULT 'OPEN' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "rent_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"tenant_user_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" "currency_code" DEFAULT 'XAF' NOT NULL,
	"day_of_month" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "rent_schedule_items" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text NOT NULL,
	"due_at" timestamp NOT NULL,
	"amount_minor" integer NOT NULL,
	"status" "rent_schedule_item_status" DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp,
	"reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "vendor_category" NOT NULL,
	"city" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "vendor_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"requester_user_id" text NOT NULL,
	"listing_id" text,
	"maintenance_ticket_id" text,
	"status" "vendor_lead_status" DEFAULT 'REQUESTED' NOT NULL,
	"payment_id" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_schedules" ADD CONSTRAINT "rent_schedules_deal_id_listing_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."listing_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_schedules" ADD CONSTRAINT "rent_schedules_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_schedules" ADD CONSTRAINT "rent_schedules_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_schedules" ADD CONSTRAINT "rent_schedules_tenant_user_id_user_id_fk" FOREIGN KEY ("tenant_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_schedule_items" ADD CONSTRAINT "rent_schedule_items_schedule_id_rent_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."rent_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_leads" ADD CONSTRAINT "vendor_leads_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_leads" ADD CONSTRAINT "vendor_leads_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_leads" ADD CONSTRAINT "vendor_leads_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_leads" ADD CONSTRAINT "vendor_leads_maintenance_ticket_id_maintenance_tickets_id_fk" FOREIGN KEY ("maintenance_ticket_id") REFERENCES "public"."maintenance_tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_leads" ADD CONSTRAINT "vendor_leads_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maintenance_tickets_listing_idx" ON "maintenance_tickets" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "maintenance_tickets_created_by_idx" ON "maintenance_tickets" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "maintenance_tickets_assigned_to_idx" ON "maintenance_tickets" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "maintenance_tickets_status_idx" ON "maintenance_tickets" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "rent_schedules_deal_uidx" ON "rent_schedules" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "rent_schedules_listing_idx" ON "rent_schedules" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "rent_schedules_owner_idx" ON "rent_schedules" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "rent_schedules_tenant_idx" ON "rent_schedules" USING btree ("tenant_user_id");--> statement-breakpoint
CREATE INDEX "rent_schedule_items_schedule_idx" ON "rent_schedule_items" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "rent_schedule_items_due_at_idx" ON "rent_schedule_items" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "rent_schedule_items_status_idx" ON "rent_schedule_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rent_schedule_items_reminder_sent_idx" ON "rent_schedule_items" USING btree ("reminder_sent_at");--> statement-breakpoint
CREATE INDEX "vendors_category_idx" ON "vendors" USING btree ("category");--> statement-breakpoint
CREATE INDEX "vendors_city_idx" ON "vendors" USING btree ("city");--> statement-breakpoint
CREATE INDEX "vendors_active_idx" ON "vendors" USING btree ("active");--> statement-breakpoint
CREATE INDEX "vendor_leads_vendor_idx" ON "vendor_leads" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_leads_requester_idx" ON "vendor_leads" USING btree ("requester_user_id");--> statement-breakpoint
CREATE INDEX "vendor_leads_status_idx" ON "vendor_leads" USING btree ("status");
