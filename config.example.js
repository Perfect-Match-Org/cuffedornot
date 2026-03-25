// ─── SPOTIFY CONFIG ──────────────────────────
// Copy this file to config.js and fill in your Client ID
// config.js is gitignored — never commit credentials
const CONFIG = {
    clientId: 'YOUR_SPOTIFY_CLIENT_ID',
    redirectUri: window.location.origin + '/callback',
    scopes: 'user-top-read user-read-recently-played',
    authUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    apiBase: 'https://api.spotify.com/v1',
};
