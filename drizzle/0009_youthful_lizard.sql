CREATE TABLE "look_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"look_id" uuid NOT NULL,
	"url" text NOT NULL,
	"path" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "look_photos" ADD CONSTRAINT "look_photos_look_id_looks_id_fk" FOREIGN KEY ("look_id") REFERENCES "public"."looks"("id") ON DELETE cascade ON UPDATE no action;