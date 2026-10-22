/**
 * Commitlint configuration — enforces Conventional Commits.
 * See _governance-local/decisions/ADR-0005-commit-conventions.md
 *
 * Format: <type>(<scope>): <subject>
 *
 *   <body — optional, free-flowing prose>
 *
 *   Refs: #N        (or Closes: #N)
 *
 * Examples:
 *   feat(catalog): add clothing item grid
 *
 *     Refs: #7
 *   chore(deps): bump next to 16.2
 *
 *     Refs: #2
 *
 * Scope is mandatory; issue-reference footer is mandatory (colon form). Trivial
 * commits reference a standing housekeeping umbrella issue (#2 in the original
 * tracker; substitute your own).
 */

/** Rejects the bare-hash footer form (e.g. "Closes #5"); git-cliff drops it. */
const footerFormatPlugin = {
  rules: {
    'footer-format': (parsed) => {
      const text = `${parsed.body || ''}\n${parsed.footer || ''}`;
      const m = text.match(/^(Refs|Closes|Fixes|Resolves)\s+#\d+/m);
      if (m) {
        return [
          false,
          `footer "${m[0]}" uses bare-hash form (no colon); use the colon form ` +
            `("${m[1]}: #N") or git-cliff drops the link from release notes.`,
        ];
      }
      return [true];
    },
  },
};

/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ['@commitlint/config-conventional'],
  plugins: [footerFormatPlugin],
  rules: {
    // A small, deliberate type vocabulary. `tech` is the umbrella for
    // build/CI/perf/dependency work so there is never a hard choice. `test`
    // (ADR-0014) is the one carve-out, and its rule is mechanical: use it only
    // when the commit changes nothing but tests, fixtures or test config — a
    // fix that ships with its regression test stays a `fix`.
    'type-enum': [
      2,
      'always',
      ['chore', 'enhance', 'feat', 'fix', 'refactor', 'revert', 'style', 'tech', 'test'],
    ],
    // Scope is mandatory, from this repository's area vocabulary.
    'scope-empty': [2, 'never'],
    'scope-enum': [
      2,
      'always',
      ['catalog', 'looks', 'trips', 'ui', 'db', 'infra', 'governance', 'deps', 'release'],
    ],
    // Every commit references an issue (Refs:/Closes:), in colon form.
    'references-empty': [2, 'never'],
    'footer-format': [2, 'always'],
    // Bodies and footers are free-flowing prose; no hard-wrap cap.
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
    'header-max-length': [2, 'always', 120],
  },
};

export default config;
