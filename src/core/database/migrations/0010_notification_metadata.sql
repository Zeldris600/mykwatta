ALTER TABLE "notifications" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
UPDATE "notifications" SET "metadata" = '{"href":"/notifications"}'::jsonb WHERE "metadata" IS NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "metadata" SET NOT NULL;
