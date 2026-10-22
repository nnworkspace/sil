CREATE TABLE "wear_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"worn_at" date NOT NULL,
	"occasion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wear_events" ADD CONSTRAINT "wear_events_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wear_events_item_id_idx" ON "wear_events" USING btree ("item_id");--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "wear_count";--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "last_worn_at";