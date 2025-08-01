#!/usr/bin/env node
/*
 * Single‑file TRMNL plugin server
 *
 * For ease of use, this script contains all of the logic required to run
 * the “Who’s That Pokémon?” plugin.  Simply execute this file with Node.js
 * (`node who-is-that-pokemon.js`) and a small HTTP server will start.
 * The server exposes endpoints for plugin installation, settings
 * management and markup generation.  It embeds default settings and a
 * fallback image, so no external files are required.
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Embedded configuration.  If you wish to change these defaults
// without editing code, set environment variables: REVEAL_TIME,
// IMAGE_STYLE, TIMEZONE or POOL_SIZE when running this script.
const DEFAULT_CONFIG = {
  revealTime: parseFloat(process.env.REVEAL_TIME) || 10,
  imageStyle: process.env.IMAGE_STYLE || 'modern',
  timezone: process.env.TIMEZONE || 'America/New_York',
  poolSize: parseInt(process.env.POOL_SIZE, 10) || 151
};

// Placeholder image encoded as base64.  Used if we cannot reach
// external services or no artwork exists for the selected Pokémon.
const PLACEHOLDER_BASE64 =
  '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';

// Timezone helper
function nowInTimezone(tz) {
  try {
    const locale = new Date().toLocaleString('en-US', { timeZone: tz });
    return new Date(locale);
  } catch (err) {
    return new Date();
  }
}

// Hash the date string to select a Pokémon ID within the pool
function getPokemonIdForDate(dateStr, poolSize) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const chr = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash) % poolSize + 1;
}

// Fetch Pokémon data from PokéAPI
async function fetchPokemonData(id, style) {
  try {
    const apiUrl = `https://pokeapi.co/api/v2/pokemon/${id}`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('fetch failed');
    const data = await response.json();
    let imageUrl;
    if (style === 'gen1') {
      imageUrl = data.sprites.versions['generation-i']['red-blue'].front_default;
    } else if (style === 'simplified') {
      imageUrl = data.sprites.front_default;
    } else {
      imageUrl = data.sprites.other['official-artwork'].front_default;
    }
    if (!imageUrl) imageUrl = data.sprites.front_default;
    const name = data.name ? data.name.charAt(0).toUpperCase() + data.name.slice(1) : `#${id}`;
    return { id, name, imageUrl };
  } catch {
    return {
      id,
      name: `Pokémon #${id}`,
      imageUrl: `data:image/png;base64,${PLACEHOLDER_BASE64}`
    };
  }
}

/**
 * Build the markup for the Pokémon screen.
 * Shows the silhouette for the first half of the cycle and the coloured
 * image plus caption for the second half.  When `snippet` is true, returns
 * only the inner fragment without the <html>/<body> wrapper.
 */
function buildMarkup(pokemon, reveal, snippet = false) {
  const safeImageUrl = pokemon.imageUrl.replace(/&/g, '&amp;');
  const safeName = pokemon.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const shadowStyle = reveal ? 'display:none;' : '';
  const coloredStyle = reveal ? '' : 'display:none;';
  const caption = reveal
    ? `<p style="margin-top:0.5rem;font-weight:bold;font-size:1.2rem;">It’s ${safeName}!</p>`
    : '';
  const core = `
    <style>
      html, body {
        margin: 0;
        padding: 0;
        font-family: sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
      }
      #container {
        position: relative;
        width: 256px;
        height: 256px;
      }
      #container img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    </style>
    <h1>Who’s That Pokémon?</h1>
    <div id="container">
      <img id="shadow" src="${safeImageUrl}" alt="Silhouette" style="${shadowStyle}">
      <img id="colored" src="${safeImageUrl}" alt="${safeName}" style="${coloredStyle}">
    </div>
    ${caption}
  `;
  const trimmed = core.trim();
  if (snippet) return trimmed;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Who’s That Pokémon?</title></head><body>${trimmed}</body></html>`;
}

// Cycle configuration.  Each cycle is 10 minutes: 5 minutes for the silhouette
// and 5 minutes for the coloured artwork.  After each cycle a new Pokémon is
// selected.  Values are in milliseconds.
const REVEAL_DURATION_MS = 5 * 60 * 1000;
const CYCLE_DURATION_MS = REVEAL_DURATION_MS * 2;

// Configuration persistence (unchanged)
const SETTINGS_FILE = path.join(__dirname, 'runtime_settings.json');
let runtimeConfig = {};
function loadRuntimeConfig() {
  try {
    runtimeConfig = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch {
    runtimeConfig = {};
  }
}
function saveRuntimeConfig() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(runtimeConfig, null, 2));
  } catch {}
}
loadRuntimeConfig();

function currentConfig() {
  return {
    revealTime: runtimeConfig.revealTime != null ? runtimeConfig.revealTime : DEFAULT_CONFIG.revealTime,
    imageStyle: runtimeConfig.imageStyle || DEFAULT_CONFIG.imageStyle,
    timezone: runtimeConfig.timezone || DEFAULT_CONFIG.timezone,
    poolSize: runtimeConfig.poolSize || DEFAULT_CONFIG.poolSize
  };
}

// HTTP server
const server = http.createServer(async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const cfg = currentConfig();
  try {
    if (pathname === '/' && req.method === 'GET') {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Who’s That Pokémon?</title></head><body><h1>Who’s That Pokémon?</h1><p>This server is running. Visit <a href="/markup">/markup</a> to see the current Pokémon. Manage settings at <a href="/manage">/manage</a>.</p></body></html>`;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }
    // Generate dynamic markup based on the 10-minute cycle
    if (pathname === '/markup' && req.method === 'GET') {
      const nowMs = Date.now();
      const cycleNumber = Math.floor(nowMs / CYCLE_DURATION_MS);
      const withinCycle = nowMs % CYCLE_DURATION_MS;
      const reveal = withinCycle >= REVEAL_DURATION_MS;
      // Use the cycle number as a seed to deterministically pick a Pokémon ID
      const id = getPokemonIdForDate(String(cycleNumber), cfg.poolSize);
      const pokemon = await fetchPokemonData(id, cfg.imageStyle);
      const snippetFlag = Object.prototype.hasOwnProperty.call(query, 'snippet');
      const html = buildMarkup(pokemon, reveal, snippetFlag);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }
    // Management and webhook endpoints remain unchanged...
    if (pathname === '/manage' && req.method === 'GET') {
      const escape = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const msg = query.msg ? `<div style="color: green;">${escape(query.msg)}</div>` : '';
      const page = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Manage Plugin</title></head><body><h1>Manage Who’s That Pokémon?</h1>${msg}<form method="POST" action="/manage"><label>Reveal time (seconds)<input type="number" name="revealTime" min="1" value="${escape(cfg.revealTime)}"></label><br><label>Artwork style<select name="imageStyle"><option value="gen1" ${cfg.imageStyle==='gen1'?'selected':''}>Gen I sprites</option><option value="modern" ${cfg.imageStyle==='modern'?'selected':''}>Modern artwork</option><option value="simplified" ${cfg.imageStyle==='simplified'?'selected':''}>Simplified</option></select></label><br><label>Time zone<input type="text" name="timezone" value="${escape(cfg.timezone)}"></label><br><label>Pool size<input type="number" name="poolSize" min="1" value="${escape(cfg.poolSize)}"></label><br><button type="submit">Save</button></form></body></html>`;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(page);
      return;
    }
    if (pathname === '/manage' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk.toString(); });
      req.on('end', () => {
        const form = body.split('&').reduce((acc, pair) => {
          const [k, v] = pair.split('=');
          const key = decodeURIComponent(k.replace(/\+/g, ' '));
          const val = decodeURIComponent((v || '').replace(/\+/g, ' '));
          acc[key] = val;
          return acc;
        }, {});
        if (form.revealTime) {
          const v = parseFloat(form.revealTime);
          if (!isNaN(v) && v > 0) runtimeConfig.revealTime = v;
        }
        if (form.imageStyle && ['gen1','modern','simplified'].includes(form.imageStyle)) runtimeConfig.imageStyle = form.imageStyle;
        if (form.timezone) runtimeConfig.timezone = form.timezone;
        if (form.poolSize) {
          const v = parseInt(form.poolSize, 10);
          if (!isNaN(v) && v > 0) runtimeConfig.poolSize = v;
        }
        saveRuntimeConfig();
        res.writeHead(302, { Location: '/manage?msg=Settings%20updated' });
        res.end();
      });
      return;
    }
    if (pathname === '/install' && req.method === 'GET') {
      const callback = query.installation_callback_url;
      if (callback) {
        res.writeHead(302, { Location: callback });
        res.end();
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Installation endpoint');
      }
      return;
    }
    if (pathname === '/install/success' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk.toString(); });
      req.on('end', () => { console.log('Install success:', body); res.writeHead(204); res.end(); });
      return;
    }
    if (pathname === '/uninstall' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk.toString(); });
      req.on('end', () => { console.log('Uninstall:', body); res.writeHead(204); res.end(); });
      return;
    }
    // Not found
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Who’s That Pokémon? server running on http://localhost:${PORT}`);
});
