ALTER TABLE "items" ALTER COLUMN "prior_wears" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "prior_wears" DROP NOT NULL;--> statement-breakpoint
-- Backfill (#191, option a). Every existing 0 was written by the NOT NULL
-- default, not by the owner saying "never worn" — so as data it means "nothing
-- was said". Reading it as a recorded zero would bake that ambiguity in
-- permanently; NULL states the truth, and the genuine zeroes are re-recorded
-- as they are confirmed.
UPDATE "items" SET "prior_wears" = NULL WHERE "prior_wears" = 0;
