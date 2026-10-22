CREATE TABLE "item_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"url" text NOT NULL,
	"path" text NOT NULL,
	"kind" text DEFAULT 'own' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"brand" text,
	"product_code" text,
	"color" text,
	"size" text,
	"product_url" text,
	"list_price_cents" integer,
	"price_paid_cents" integer,
	"currency" text DEFAULT 'EUR',
	"purchased_at" date,
	"purchase_channel" text,
	"return_by" date,
	"return_policy" text,
	"favorite" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"description" text,
	"material" text,
	"care" text,
	"details" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"wear_count" integer DEFAULT 0 NOT NULL,
	"last_worn_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_items" (
	"trip_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"packed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "trip_items_trip_id_item_id_pk" PRIMARY KEY("trip_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'business' NOT NULL,
	"destination" text,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_photos" ADD CONSTRAINT "item_photos_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_items" ADD CONSTRAINT "trip_items_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_items" ADD CONSTRAINT "trip_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;