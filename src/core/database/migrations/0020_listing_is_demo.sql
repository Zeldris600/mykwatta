ALTER TABLE "listings" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;
CREATE INDEX "listings_is_demo_idx" ON "listings" USING btree ("is_demo");
