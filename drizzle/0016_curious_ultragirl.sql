CREATE TABLE "trip_item_days" (
	"trip_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "trip_item_days_trip_id_item_id_day_pk" PRIMARY KEY("trip_id","item_id","day")
);
--> statement-breakpoint
ALTER TABLE "trip_items" ADD COLUMN "every_day" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_item_days" ADD CONSTRAINT "trip_item_days_trip_id_item_id_trip_items_trip_id_item_id_fk" FOREIGN KEY ("trip_id","item_id") REFERENCES "public"."trip_items"("trip_id","item_id") ON DELETE cascade ON UPDATE no action;