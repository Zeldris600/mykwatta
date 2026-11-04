CREATE TYPE "public"."invite_status" AS ENUM('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "organisation_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"organisation_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "organisation_role" NOT NULL,
	"token" text NOT NULL,
	"status" "invite_status" DEFAULT 'PENDING' NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organisation_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "organisation_invites" ADD CONSTRAINT "organisation_invites_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_invites" ADD CONSTRAINT "organisation_invites_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organisation_invites_org_idx" ON "organisation_invites" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "organisation_invites_email_idx" ON "organisation_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "organisation_invites_token_idx" ON "organisation_invites" USING btree ("token");