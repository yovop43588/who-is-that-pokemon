# Who’s That Pokémon? – TRMNL User Plugin

This repository contains a complete example of a **TRMNL user plugin**.  The goal
of the plugin is simple: every day a silhouette of a randomly chosen
Pokémon is shown on your TRMNL device.  After a configurable delay the
full‑colour image and name are revealed, letting you test your Pokémon
knowledge or simply enjoy a fun bit of nostalgia.

## 📦 Contents

```text
who-is-that-pokemon/
├── who-is-that-pokemon.js   # Single‑file Node.js application – core plugin logic
├── assets/                 # Icon and other optional assets (contains a 128×128 PNG icon)
├── manifest.json           # TRMNL plugin metadata
└── README.md               # This file
```

> **Note**
> This plugin uses the official [PokéAPI](https://pokeapi.co/) to retrieve
> Pokémon information and artwork.  It does **not** bundle any copyrighted
> Pokémon images in this repository.  See the attributions section below for
> legal considerations.

## 🚀 Getting Started

The plugin is implemented as a lightweight Node.js web server bundled into a
**single file**.  It has no external dependencies, so you only need
Node v18 or newer installed.

1. **Clone or download** this repository.

2. **Run the server:**

   ```bash
   node who-is-that-pokemon/who-is-that-pokemon.js
   ```

   By default the server listens on port `3000`.  You can override this by
   setting the `PORT` environment variable:

   ```bash
   PORT=8080 node who-is-that-pokemon/who-is-that-pokemon.js
   ```

3. Open `http://localhost:3000/` in a browser to see the landing page and
   confirm that the plugin is running.

## ⚙️ Configuration

User‑tunable settings are stored in a small JSON file (`runtime_settings.json`)
that is automatically created when you adjust values via the management page.
You can configure the plugin in two ways:

- **Environment variables** – set `REVEAL_TIME`, `IMAGE_STYLE`, `TIMEZONE` or
  `POOL_SIZE` before starting the server to override the defaults.  For
  example:

  ```bash
  REVEAL_TIME=30 IMAGE_STYLE=gen1 TIMEZONE=Europe/London node who-is-that-pokemon/who-is-that-pokemon.js
  ```

- **Management page** – after the plugin is running, visit `/manage` in your
  browser to adjust settings via a simple form.  The values you save are
  persisted in `runtime_settings.json`, so they survive restarts.

The following settings are available:

| Key         | Type    | Description |
|-------------|---------|-------------|
| `revealTime`| number  | Time (in **seconds**) to wait before the silhouette automatically reveals the Pokémon. |
| `imageStyle`| string  | Artwork style used for the coloured reveal. Supported values are `"gen1"` (8‑bit Game Boy sprite), `"modern"` (official high‑resolution artwork) and `"simplified"` (uses the default sprite). |
| `timezone`  | string  | IANA time‑zone identifier (for example `"America/New_York"`). Determines when the daily Pokémon resets. |
| `poolSize`  | number  | Number of Pokémon in the pool. Defaults to `151` for the original Kanto Pokédex, but you can increase it for later generations. |

All of these values can also be adjusted via the `/manage` endpoint.  If
you run the plugin on multiple machines, each host will maintain its own
settings file.

### How the Daily Pokémon is chosen

Each morning at midnight in your configured time zone, the plugin derives
a pseudo‑random Pokémon ID from the current date.  A simple hash function
turns the `YYYY‑MM‑DD` string into a number between 1 and the configured
`poolSize`.  The result is deterministic: everyone using the plugin will
see the same Pokémon on the same day, and the selection changes when the
date changes.

## 🔌 Using with TRMNL

TRMNL public plugins use an OAuth‑style workflow.  During plugin creation
you must supply a handful of URLs that TRMNL will call during the
installation and runtime lifecycle.  The TRMNL documentation lists these
required fields: a **name**, **description**, **icon**, an
`installation_url`, an `installation_success_webhook_url`, a
`plugin_management_url`, a `plugin_markup_url` and an
`uninstallation_webhook_url`【907184805140283†L66-L85】.  TRMNL will ping
your `installation_url` when a user begins installing your plugin and
will later fetch markup from your `plugin_markup_url` to render on
the e‑ink display【900356941885510†L60-L87】.  The included
`manifest.json` provides placeholders for these values – update them to
match your deployment.

### Installation URL

When a user clicks “Install” in the TRMNL marketplace, TRMNL sends a
`GET` request to your `installation_url` along with a temporary OAuth
token and a callback URL【900356941885510†L60-L87】.  The sample
implementation in `who-is-that-pokemon.js` simply displays a confirmation page and
redirects back to the provided callback.  In a production plugin you
would exchange the code for an access token, as explained in the
documentation【900356941885510†L65-L79】.

### Markup URL

TRMNL periodically calls your `plugin_markup_url` to generate the
on‑device screen.  In this plugin the `/markup` endpoint determines
which Pokémon should appear that day based on the configured time zone
and generates a minimal HTML page.  CSS filters convert the coloured
artwork into a black silhouette.  JavaScript then reveals the coloured
image after the configured delay.  If you tap the “Reveal” button the
coloured artwork appears immediately.

### Management URL

The `/manage` endpoint is a simple settings page that lets end users
override the defaults via a form.  Values are persisted in
`runtime_settings.json` on disk for demonstration purposes.  In a real
plugin you would store per‑user settings in a database keyed by the
TRMNL user’s UUID, which is provided to your management page as a query
parameter【900356941885510†L114-L118】.

## 🛡️ Attributions and Legal Notice

- **PokéAPI** – Data and artwork are fetched live from
  [https://pokeapi.co/](https://pokeapi.co/).  No images are bundled in
  this repository.  Pokémon and related names are trademarks of
  Nintendo, Creatures Inc., and GAME FREAK Inc.  This project is for
  educational and non‑commercial use only.
- **TRMNL API Documentation** – Information about the plugin creation and
  installation workflows comes from the official TRMNL API docs【907184805140283†L66-L85】【900356941885510†L60-L87】.

## 📄 License

This example plugin is distributed under the MIT licence.  See
`LICENSE` for details.