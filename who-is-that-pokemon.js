const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 3000;

function nowInTimezone(tz) {
  return new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
}

function getPokemonId(seed, poolSize) {
  return (seed * 2654435761 % 2**32) % poolSize + 1;
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

function buildMarkup(pokemon, showRealImage, nextSeed, nextRevealState) {
  const imgStyle = showRealImage
    ? ''
    : 'filter: brightness(0) saturate(100%);';

  const toggleUrl = `/markup?seed=${nextSeed}&reveal=${nextRevealState}`;

  return `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: sans-serif; margin: 0; height: 100vh; display: flex;
               flex-direction: column; align-items: center; justify-content: center; position: relative; }
        .img-container {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          text-align: center;
        }
        img { width: 300px; ${imgStyle}; cursor: pointer; }
        h1 { font-size: 2em; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="img-container">
        <a href="${toggleUrl}">
          <img src="${pokemon.imageUrl}" alt="Who's that Pokémon?" />
        </a>
        ${showRealImage ? `<h1>${pokemon.name}</h1>` : ''}
      </div>
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

  if (pathname === '/markup') {
    const seed = parseInt(url.searchParams.get('seed')) || Math.floor(Date.now() / (30 * 60 * 1000));
    const reveal = url.searchParams.get('reveal') === 'true';

    const id = getPokemonId(seed, poolSize);

    // Toggle logic
    const nextSeed = reveal ? seed + 1 : seed;
    const nextReveal = !reveal;

    fetchPokemonData(id, pokemon => {
      const html = buildMarkup(pokemon, reveal, nextSeed, nextReveal);
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
