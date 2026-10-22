ALTER TABLE "look_items" ADD COLUMN "sort" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Backfill a deterministic initial order for existing members (by piece name),
-- so current Looks keep a stable sequence until the owner rearranges them (#100).
UPDATE "look_items" li
SET "sort" = ranked.rn
FROM (
  SELECT li2."look_id", li2."item_id",
         (ROW_NUMBER() OVER (PARTITION BY li2."look_id" ORDER BY i."name", li2."item_id") - 1) AS rn
  FROM "look_items" li2
  JOIN "items" i ON i."id" = li2."item_id"
) ranked
WHERE li."look_id" = ranked."look_id" AND li."item_id" = ranked."item_id";