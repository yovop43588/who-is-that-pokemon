const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 3000;

function getRandomId(poolSize) {
  return Math.floor(Math.random() * poolSize) + 1;
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

function buildMarkup(pokemon) {
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
        img { width: 300px; cursor: pointer; }
        h1 { font-size: 2em; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="img-container">
        <img id="pokeImg" src="${pokemon.imageUrl}" />
        <h1 id="pokeName" style="display:none">${pokemon.name}</h1>
      </div>
      <script>
        let reveal = false;
        let currentId = ${pokemon.id};
        const pokeImg = document.getElementById('pokeImg');
        const pokeName = document.getElementById('pokeName');

        function toggle() {
          if (!reveal) {
            pokeImg.style.filter = '';
            pokeName.style.display = 'block';
            reveal = true;
          } else {
            fetch('/random').then(r => r.json()).then(data => {
              pokeImg.src = data.imageUrl;
              pokeImg.style.filter = 'brightness(0) saturate(100%)';
              pokeName.textContent = data.name;
              pokeName.style.display = 'none';
              reveal = false;
            });
          }
        }

        pokeImg.addEventListener('click', toggle);
        pokeImg.style.filter = 'brightness(0) saturate(100%)';
      </script>
    </body>
    </html>`;
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const settingsPath = path.join(__dirname, 'settings.json');

  let poolSize = 151;
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath));
    poolSize = settings.poolSize || poolSize;
  } catch {}

  if (pathname === '/markup') {
    const id = getRandomId(poolSize);
    fetchPokemonData(id, pokemon => {
      const html = buildMarkup(pokemon);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
  } else if (pathname === '/random') {
    const id = getRandomId(poolSize);
    fetchPokemonData(id, pokemon => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(pokemon));
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Who’s That Pokémon? Plugin');
  }
}).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
