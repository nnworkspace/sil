CREATE TABLE "look_items" (
	"look_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	CONSTRAINT "look_items_look_id_item_id_pk" PRIMARY KEY("look_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "looks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'look' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "look_items" ADD CONSTRAINT "look_items_look_id_looks_id_fk" FOREIGN KEY ("look_id") REFERENCES "public"."looks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "look_items" ADD CONSTRAINT "look_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;