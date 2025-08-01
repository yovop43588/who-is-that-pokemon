const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 3000;

function nowInTimezone(tz) {
  return new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
}

function getCurrentCycleParams(poolSize, timezone) {
  const now = nowInTimezone(timezone);
  const cycleMinutes = 30;
  const minutes = now.getMinutes();
  const inRevealPhase = (minutes % 30) >= 15;

  const timestamp = Math.floor(now.getTime() / (cycleMinutes * 60 * 1000));
  const id = (timestamp * 2654435761 % 2**32) % poolSize + 1;
  return { id, inRevealPhase };
}

function fetchPokemonData(id, cb) {
  https.get(`https://pokeapi.co/api/v2/pokemon/${id}`, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const name = json.name.charAt(0).toUpperCase() + json.name.slice(1);
        const imageUrl = json.sprites.other['official-artwork'].front_default;
        cb({ id, name, imageUrl });
      } catch (e) {
        cb({ id, name: `MissingNo (${id})`, imageUrl: '' });
      }
    });
  }).on('error', err => {
    cb({ id, name: `MissingNo (${id})`, imageUrl: '' });
  });
}

function buildMarkup(pokemon, showRealImage) {
  const imgStyle = showRealImage
    ? ''
    : 'filter: brightness(0) saturate(100%);';

  const toggleUrl = `/markup?force=true&id=${pokemon.id}&reveal=${!showRealImage}`;

  return `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column;
               align-items: center; justify-content: center; height: 100vh; margin: 0; }
        img { width: 300px; ${imgStyle}; cursor: pointer; }
        h1 { font-size: 2em; margin-top: 20px; }
      </style>
    </head>
    <body>
      <img src="${pokemon.imageUrl}" alt="Who's that Pokémon?" onclick="window.location.href='${toggleUrl}'" />
      ${showRealImage ? `<h1>${pokemon.name}</h1>` : ''}
    </body>
    </html>`;
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const settingsPath = path.join(__dirname, 'settings.json');

  let poolSize = 151;
  let timezone = 'UTC';
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath));
    poolSize = settings.poolSize || poolSize;
    timezone = settings.timezone || timezone;
  } catch {}

  const force = url.searchParams.get('force') === 'true';
  const forcedId = parseInt(url.searchParams.get('id'));
  const forcedReveal = url.searchParams.get('reveal') === 'true';

  if (pathname === '/markup') {
    const { id, inRevealPhase } = force
      ? { id: forcedId || 1, inRevealPhase: forcedReveal }
      : getCurrentCycleParams(poolSize, timezone);

    fetchPokemonData(id, pokemon => {
      const html = buildMarkup(pokemon, inRevealPhase);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Who’s That Pokémon? Plugin');
  }
}).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
