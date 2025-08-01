const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 3000;

function nowInTimezone(tz) {
  return new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
}

function getCurrentPokemonIdAndRevealState(poolSize, timezone, offset = 0) {
  const now = nowInTimezone(timezone);
  const cycleMinutes = 30;
  const msInCycle = cycleMinutes * 60 * 1000;

  const timestamp = Math.floor((now.getTime() + offset) / msInCycle);
  const inRevealPhase = ((now.getTime() + offset) / 1000 / 60) % 30 >= 15;

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
  const filterStyles = `
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
      <filter id="silhouette">
        <feColorMatrix type="matrix"
          values="0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0 0
                  1 1 1 1 1" />
      </filter>
    </svg>
  `;

  const imgStyle = showRealImage
    ? ''
    : 'filter: url(#silhouette);';

  return `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column;
               align-items: center; justify-content: center; height: 100vh; margin: 0; }
        img { width: 300px; ${imgStyle}; cursor: pointer; }
        h1 { font-size: 2em; margin-top: 20px; }
        button { display: none; }
      </style>
    </head>
    <body>
      ${filterStyles}
      <img src="${pokemon.imageUrl}" alt="Who's that Pokémon?" onclick="window.location.href='/markup?offset=' + Date.now()" />
      ${showRealImage ? `<h1>${pokemon.name}</h1>` : ''}
    </body>
    </html>`;
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const settingsPath = path.join(__dirname, 'settings.json');

  // Read pool size and timezone
  let poolSize = 151;
  let timezone = 'UTC';
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath));
    poolSize = settings.poolSize || poolSize;
    timezone = settings.timezone || timezone;
  } catch {}

  // Optional ?offset=X to force timestamp-based cycle override
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const { id, inRevealPhase } = getCurrentPokemonIdAndRevealState(poolSize, timezone, offset);

  if (pathname === '/markup') {
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
