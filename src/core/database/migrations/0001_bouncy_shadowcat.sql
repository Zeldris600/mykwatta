CREATE TYPE "public"."persona" AS ENUM('RENTER', 'BUYER', 'LANDLORD', 'AGENT', 'CARETAKER', 'CONSTRUCTION_CLIENT', 'DEVELOPER', 'INVESTOR');--> statement-breakpoint
CREATE TABLE "user_personas" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"persona" "persona" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_personas" ADD CONSTRAINT "user_personas_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_personas_user_persona_uidx" ON "user_personas" USING btree ("user_id","persona");--> statement-breakpoint
CREATE INDEX "user_personas_user_idx" ON "user_personas" USING btree ("user_id");