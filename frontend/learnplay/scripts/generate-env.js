const fs = require('fs');
const path = require('path');

const envDir = path.join(__dirname, '../src/environments');
const envFile = path.join(envDir, 'environment.ts');

const apiUrl = process.env['API_URL'] || process.env['apiUrl'];
const googleClientId = process.env['GOOGLE_CLIENT_ID'] || process.env['googleClientId'];

if (!apiUrl || !googleClientId) {
  if (fs.existsSync(envFile)) {
    console.log('✅ Environment files already exist, skipping generation.');
    process.exit(0);
  }
  if (!apiUrl) console.error('❌ API_URL environment variable is not set.');
  if (!googleClientId) console.error('❌ GOOGLE_CLIENT_ID environment variable is not set.');
  process.exit(1);
}

// Strip any accidental surrounding quotes from the value
const cleanApiUrl = apiUrl.replace(/^['"]|['"]$/g, '');
const cleanGoogleClientId = googleClientId.replace(/^['"]|['"]$/g, '');

if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

const content = (production) => `export const environment = {
  production: ${production},
  apiUrl: '${production ? '/api' : cleanApiUrl}',
  googleClientId: '${cleanGoogleClientId}',
  adminLoginPath: '${(process.env['ADMIN_LOGIN_PATH'] || process.env['adminLoginPath'] || 'admin-portal').replace(/^['"]|['"]$/g, '')}',
  posthogKey: '${(process.env['POSTHOG_KEY'] || process.env['posthogKey'] || '').replace(/^['"]|['"]$/g, '')}',
  posthogHost: '${(process.env['POSTHOG_HOST'] || process.env['posthogHost'] || 'https://us.i.posthog.com').replace(/^['"]|['"]$/g, '')}',
};
`;

fs.writeFileSync(path.join(envDir, 'environment.ts'), content(false));
fs.writeFileSync(path.join(envDir, 'environment.prod.ts'), content(true));

console.log(`✅ Environment files generated (apiUrl: ${cleanApiUrl})`);
