# Watch List

A shared movie watch-list for two people. Search movies via TMDB, tag them
(e.g. `October`, `Horror`), filter by tag, and check them off once watched.

- **Frontend**: static HTML/CSS/JS (no build step)
- **API**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite)

## One-time setup

### 1. Install dependencies

```sh
npm install
```

### 2. Get a free TMDB API key

Sign up at https://www.themoviedb.org/settings/api and grab your **API Key
(v3 auth)**. Then create a local env file:

```sh
cp .dev.vars.example .dev.vars
# edit .dev.vars and paste your key in
```

`.dev.vars` is gitignored — it's only for local development.

### 3. Create a free Cloudflare account

Sign up at https://dash.cloudflare.com/sign-up. No credit card required for
the free tier used here.

### 4. Log in with Wrangler

```sh
npx wrangler login
```

This opens a browser to authorize the CLI against your Cloudflare account.

### 5. Create the D1 database

```sh
npx wrangler d1 create watch-list
```

This prints a `database_id`. Copy it into `wrangler.toml`, replacing
`REPLACE_WITH_YOUR_DATABASE_ID`.

### 6. Apply the schema

```sh
npm run db:migrate:local    # for local dev
npm run db:migrate:remote   # for the live database
```

### 7. Connect the GitHub repo to Cloudflare Pages

In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to
Git** → select this repository. Leave the build command empty and set the
build output directory to `public` (Wrangler's config already specifies
this, but the dashboard may ask again).

Then, in the new Pages project's settings:

- **Settings → Functions → D1 database bindings**: add a binding named `DB`
  pointing at the `watch-list` database.
- **Settings → Environment variables**: add `TMDB_API_KEY` with your TMDB
  key, for both Production and Preview.

From now on, every push to `main` automatically redeploys the site and API.

## Local development

```sh
npm run dev
```

Visit the printed local URL (typically `http://localhost:8788`).

## Deploying manually

Normally you just `git push` — Cloudflare Pages redeploys automatically.
To deploy by hand instead:

```sh
npm run deploy
```
