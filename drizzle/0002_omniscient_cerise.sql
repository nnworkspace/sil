ALTER TABLE "wear_events" ADD COLUMN "note" text;--> statement-breakpoint
-- Preserve existing free-text occasions as notes; occasion now holds a tag only.
UPDATE "wear_events" SET "note" = "occasion" WHERE "occasion" IS NOT NULL;--> statement-breakpoint
UPDATE "wear_events" SET "occasion" = NULL;