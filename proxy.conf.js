const fs = require('fs');
const path = require('path');

function readBackendPort() {
  const candidates = [
    '../backend-club-taekwondo/src/main/resources/application-local.properties',
    '../backend-club-taekwondo/src/main/resources/application.properties',
  ];

  for (const relative of candidates) {
    const file = path.resolve(__dirname, relative);
    try {
      const content = fs.readFileSync(file, 'utf8');
      const match = content.match(/^server\.port\s*=\s*(\d+)/m);
      if (match) {
        console.log(`[proxy] Port lu depuis ${path.basename(file)} : ${match[1]}`);
        return parseInt(match[1], 10);
      }
    } catch (_) {}
  }

  console.log('[proxy] Port introuvable dans les fichiers backend, fallback sur 8080');
  return 8080;
}

const target = `http://localhost:${readBackendPort()}`;

module.exports = {
  '/api': { target, secure: false, changeOrigin: true, logLevel: 'debug' },
  '/uploads': { target, secure: false, changeOrigin: true, logLevel: 'debug' }
};
