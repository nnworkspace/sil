import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load env the same way Next.js does, so the CLI and the app agree.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
