/**
 * Which database failures are worth trying again (#308).
 *
 * On 2026-08-06 production served 500s on every page that reads `items`, with
 * `relation "items" does not exist` — while the table was present and readable
 * from `psql` throughout. The condition cleared by itself. #307 established
 * that the app cannot prevent it: the pooler ignores a client-side
 * `search_path`, Drizzle refuses to qualify to `public`, and the server default
 * was already correct.
 *
 * So the app cannot avoid a transient fault. It can survive one.
 *
 * **The list is deliberately short.** A retry that swallows a real error is
 * worse than a failure, because it turns a loud bug into an intermittent one —
 * and intermittent bugs are the expensive kind. Everything here is a fault of
 * the *connection or the server*, never of the query:
 *
 *   - `42P01` — the one that actually bit. A missing relation is normally a
 *     bug, and including it is the uncomfortable choice on this list. It earns
 *     its place because it was observed as a transient on a healthy database,
 *     and because a genuine missing table fails identically on the retry, one
 *     round-trip later, still loudly.
 *   - `57P01` / `57P02` / `57P03` — the server is shutting down, restarting, or
 *     not yet accepting connections. Precisely a pooled endpoint cycling.
 *   - `53300` / `53400` — out of connections or slots.
 *   - `08000` / `08003` / `08006` — the connection broke underneath us.
 *   - `40001` / `40P01` — serialisation failure and deadlock, which Postgres
 *     documents as *retry the transaction*.
 *
 * Notably absent: `23505` and every other constraint violation, syntax errors,
 * and permission errors. Those are answers, not accidents.
 */

const TRANSIENT_CODES = new Set([
  "42P01",
  "57P01",
  "57P02",
  "57P03",
  "53300",
  "53400",
  "08000",
  "08003",
  "08006",
  "40001",
  "40P01",
]);

/** Node socket errors carry a `code` too, and never reach Postgres at all. */
const TRANSIENT_SYSCALLS = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "ENOTFOUND"]);

/** The Postgres error code, wherever the driver hung it. postgres.js puts it on
 *  the error; Drizzle wraps and re-throws with the original as `cause`. */
function codeOf(error: unknown): string | undefined {
  const e = error as { code?: unknown; cause?: { code?: unknown } } | null;
  const own = typeof e?.code === "string" ? e.code : undefined;
  const caused = typeof e?.cause?.code === "string" ? e.cause.code : undefined;
  return own ?? caused;
}

export function isTransient(error: unknown): boolean {
  const code = codeOf(error);
  if (!code) return false;
  return TRANSIENT_CODES.has(code) || TRANSIENT_SYSCALLS.has(code);
}

/**
 * Run a read once more if the first attempt failed for a transient reason.
 *
 * **Reads only, by contract.** The caller decides what is safe to repeat; this
 * helper cannot know whether a write was idempotent, and a silently repeated
 * insert is a worse bug than the one being papered over.
 *
 * One retry, not a loop with backoff: the fault this exists for either clears
 * in milliseconds or is not transient at all, and a page that hangs for eight
 * seconds before failing is worse than one that fails at once.
 */
export async function withRetry<T>(read: () => Promise<T>, delayMs = 150): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!isTransient(error)) throw error;
    await new Promise((r) => setTimeout(r, delayMs));
    return read();
  }
}
