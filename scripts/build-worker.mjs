import { copyFile, readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { build as bundle } from 'esbuild';
import 'dotenv/config';

const root = process.cwd();
const sourceDir = join(root, 'dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp'
};
const assets = {};

if (existsSync(join(root, '.env'))) {
  process.loadEnvFile(join(root, '.env'));
}

const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL?.trim());
const hasSupabasePublishableKey = Boolean(
  process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
);

console.log(`Supabase URL configured: ${hasSupabaseUrl ? 'YES' : 'NO'}`);
console.log(
  `Supabase publishable key configured: ${
    hasSupabasePublishableKey ? 'YES' : 'NO'
  }`
);

await bundle({
  entryPoints: [join(root, 'src/supabase-browser-client.js')],
  outfile: join(sourceDir, 'supabase-client.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  define: {
    __AQUAPOINT_SUPABASE_URL__: JSON.stringify(
      process.env.SUPABASE_URL?.trim() || ''
    ),
    __AQUAPOINT_SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(
      process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || ''
    )
  }
});