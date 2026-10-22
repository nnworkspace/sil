ALTER TABLE "items" ADD COLUMN "archived_at" date;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "archive_reason" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "archive_note" text;--> statement-breakpoint
CREATE INDEX "items_archived_at_idx" ON "items" USING btree ("archived_at");