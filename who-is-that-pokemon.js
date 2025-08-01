const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 3000;

// 🧠 Global state (shared across all users, including TRMNL)
let currentPokemon = null;
let revealState = false;
const POOL_SIZE = 151;

// 🔄 Fetch a new random Pokémon
function getRandomId() {
  return Math.floor(Math.random() * POOL_SIZE) + 1;
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
      } catch {
        cb({ id, name: `MissingNo (${id})`, imageUrl: '' });
      }
    });
  }).on('error', () => {
    cb({ id, name: `MissingNo (${id})`, imageUrl: '' });
  });
}

// 📄 Build HTML based on shared state
function buildMarkup(pokemon, reveal) {
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
        img { width: 300px; cursor: pointer; ${reveal ? '' : 'filter: brightness(0) saturate(100%);'} }
        h1 { font-size: 2em; margin-top: 20px; display: ${reveal ? 'block' : 'none'}; }
      </style>
    </head>
    <body>
      <div class="img-container">
        <form method="POST" action="/toggle">
          <button type="submit" style="all: unset; cursor: pointer;">
            <img src="${pokemon.imageUrl}" alt="Who's That Pokémon?" />
          </button>
        </form>
        <h1>${pokemon.name}</h1>
      </div>
      <form method="POST" action="/next" style="position: absolute; bottom: 10px;">
        <button type="submit">Next Pokémon</button>
      </form>
    </body>
    </html>`;
}

// 🔄 Initialize on server start
function setNewPokemon(cb) {
  const id = getRandomId();
  fetchPokemonData(id, data => {
    currentPokemon = data;
    revealState = false;
    cb?.();
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (!currentPokemon) {
    return setNewPokemon(() => {
      res.writeHead(302, { Location: '/markup' });
      res.end();
    });
  }

  if (url.pathname === '/markup') {
    const html = buildMarkup(currentPokemon, revealState);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (url.pathname === '/toggle' && req.method === 'POST') {
    revealState = !revealState;
    res.writeHead(302, { Location: '/markup' });
    res.end();
  } else if (url.pathname === '/next' && req.method === 'POST') {
    setNewPokemon(() => {
      res.writeHead(302, { Location: '/markup' });
      res.end();
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Who’s That Pokémon? Server');
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
