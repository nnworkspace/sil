ALTER TABLE "looks" ADD COLUMN "archived_at" date;--> statement-breakpoint
ALTER TABLE "looks" ADD COLUMN "archive_reason" text;--> statement-breakpoint
ALTER TABLE "looks" ADD COLUMN "archive_note" text;--> statement-breakpoint
CREATE INDEX "looks_archived_at_idx" ON "looks" USING btree ("archived_at");