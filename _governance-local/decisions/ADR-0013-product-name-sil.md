# ADR-0013 — The product is called "Sil"

- **Status:** Accepted
- **Date:** 2026-07-23
- **Issue:** #137

## Context

The app has carried the working title **"Wardrobe"** since the first commit. It is honest and descriptive, but it is also generic, unbrandable, and — now that the header is responsive (#133) and a burger menu shares the bar with the weather and theme controls — too long for the mobile banner line. The owner asked for a short name that fits any viewport and reads like a considered product rather than a folder.

Names considered:

- **Wardrobe** (status quo) — descriptive, but generic and long.
- **Clad** — a real word meaning *clothed*, punchy and literal; but it leans utilitarian, and carries armour connotations ("iron-clad"). It names the act of getting dressed rather than the craft of styling.
- **Drape**, **Worn**, **Atelier**, **Folio** — each pleasant, none as compact or as tightly connected to the app's own vocabulary.
- **Sil** — short for *silhouette*, and readable as an acronym for *Style In Loop*.

## Decision

The product is **Sil**, with the tagline **"style, in loop."**

- **It names something the app actually models.** *Silhouette* is already a first-class style facet in the catalogue (`a-line`, `shift`, `swing`, `sheath`, …), so the name points at a real concept in the domain rather than a decorative metaphor.
- **Three letters** fit the header at any width, which is exactly the constraint that prompted the rename.
- **"Style in Loop"** states the purpose: re-wearing and rotating pieces you already own. That is what wear-tracking measures (wear events, prior wears), so the tagline describes the app's actual behaviour, not an aspiration.

**Scope — the display name only:** the page `<title>`, the header wordmark, the mobile drawer title, and the sign-in page heading (where the tagline also appears). The navigation entry labelled **"Wardrobe" stays**: with the product called Sil, "Wardrobe" is correctly the name of the *section* holding the pieces.

**Deliberately not renamed:** the Vercel project and its `<your-project>.vercel.app` deployment domain, the source repository name, the Google Cloud project and its OAuth client, and the npm package name. These are **infrastructure identifiers, not branding**. Renaming them would change the deployment domain and so break the registered Google OAuth **redirect URI** (locking the owner out until re-registered), and would disturb the GitHub↔Vercel connection — all for no user-visible gain. A Google Cloud **project ID is immutable** regardless.

## Consequences

- Users see "Sil" everywhere the product names itself; nothing about deployment, auth, or source control changes.
- Should brand alignment be wanted later, the clean route is to **attach a custom domain** to the same Vercel project — never to rename the project. The Google **consent-screen app name** ("continue to …") is separately editable and cosmetic, safe to change at any time.
- The gap between the repo/infra name ("wardrobe") and the product name ("Sil") is accepted and recorded here, so it does not read as an inconsistency later.
- Prose in `README.md` and the spec sets still says "the wardrobe app"; it may be updated opportunistically, and is not part of this change.
