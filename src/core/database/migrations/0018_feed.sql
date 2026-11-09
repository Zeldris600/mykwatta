ALTER TYPE "public"."listing_media_kind" ADD VALUE 'VIDEO';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'FEED_COMMENT_ON_YOUR_LISTING';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'FEED_COMMENT_REPLY';--> statement-breakpoint
CREATE TYPE "public"."feed_post_status" AS ENUM('ACTIVE', 'HIDDEN');--> statement-breakpoint
CREATE TYPE "public"."feed_comment_status" AS ENUM('ACTIVE', 'HIDDEN');--> statement-breakpoint
CREATE TABLE "feed_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"video_media_id" text NOT NULL,
	"status" "feed_post_status" DEFAULT 'ACTIVE' NOT NULL,
	"published_at" timestamp NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "feed_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"feed_post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "feed_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"feed_post_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"parent_comment_id" text,
	"body" text NOT NULL,
	"status" "feed_comment_status" DEFAULT 'ACTIVE' NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "feed_comment_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "feed_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"feed_post_id" text NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_video_media_id_listing_media_id_fk" FOREIGN KEY ("video_media_id") REFERENCES "public"."listing_media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_feed_post_id_feed_posts_id_fk" FOREIGN KEY ("feed_post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_feed_post_id_feed_posts_id_fk" FOREIGN KEY ("feed_post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_parent_comment_id_feed_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."feed_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comment_likes" ADD CONSTRAINT "feed_comment_likes_comment_id_feed_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."feed_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comment_likes" ADD CONSTRAINT "feed_comment_likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_shares" ADD CONSTRAINT "feed_shares_feed_post_id_feed_posts_id_fk" FOREIGN KEY ("feed_post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_shares" ADD CONSTRAINT "feed_shares_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feed_posts_listing_uidx" ON "feed_posts" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "feed_posts_status_published_idx" ON "feed_posts" USING btree ("status","published_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "feed_likes_post_user_uidx" ON "feed_likes" USING btree ("feed_post_id","user_id");--> statement-breakpoint
CREATE INDEX "feed_likes_user_idx" ON "feed_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feed_comments_post_created_idx" ON "feed_comments" USING btree ("feed_post_id","created_at");--> statement-breakpoint
CREATE INDEX "feed_comments_parent_created_idx" ON "feed_comments" USING btree ("parent_comment_id","created_at");--> statement-breakpoint
CREATE INDEX "feed_comments_author_idx" ON "feed_comments" USING btree ("author_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feed_comment_likes_comment_user_uidx" ON "feed_comment_likes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "feed_comment_likes_user_idx" ON "feed_comment_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feed_shares_post_idx" ON "feed_shares" USING btree ("feed_post_id");--> statement-breakpoint
CREATE INDEX "feed_shares_user_idx" ON "feed_shares" USING btree ("user_id");
