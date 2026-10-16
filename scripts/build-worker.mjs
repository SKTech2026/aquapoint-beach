import { copyFile, readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { build as bundle } from 'esbuild';
import 'dotenv/config';


const root = process.cwd();
const sourceDir = join(root, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp' };
const assets = {};

if (existsSync(join(root, '.env'))) process.loadEnvFile(join(root, '.env'));

await bundle({
  entryPoints: [join(root, 'src/supabase-browser-client.js')],
  outfile: join(sourceDir, 'supabase-client.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  define: {
    __AQUAPOINT_SUPABASE_URL__: JSON.stringify(process.env.SUPABASE_URL || ''),
    __AQUAPOINT_SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(process.env.SUPABASE_PUBLISHABLE_KEY || '')
  }
});
await copyFile(join(root, 'src/admin-auth.js'), join(sourceDir, 'admin-auth.js'));

async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (dir === sourceDir && entry.name === 'server') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.isFile()) {
      // Video stays a separate static file; never inline it into Worker source.
      if (['.mp4', '.webm'].includes(extname(path))) continue;
      const key = '/' + relative(sourceDir, path).split(sep).join('/');
      let content = await readFile(path);
      if (extname(path) === '.html') {
        const html = content.toString('utf8');
        content = Buffer.from(html.replace(
          '<script type="module" src="/app.js"></script>',
          '<script type="module">import "/supabase-client.js"; import "/admin-auth.js"; import "/app.js";</script>'
        ));
      }
      assets[key] = { type: types[extname(path)] || 'application/octet-stream', base64: content.toString('base64') };
    }
  }
}
await collect(sourceDir);
const rooms = JSON.parse(await readFile(join(sourceDir, 'rooms.json'), 'utf8'));
let worker = await readFile(join(root, 'worker', 'index.js'), 'utf8');
worker = worker.replace('__AQUAPOINT_ASSETS__', JSON.stringify(assets)).replace('__AQUAPOINT_ROOMS__', JSON.stringify(rooms));
await mkdir(join(sourceDir, 'server'), { recursive: true });
await writeFile(join(sourceDir, 'server', 'index.js'), worker);
console.log(`Built Worker with ${Object.keys(assets).length} static assets and ${rooms.length} rooms.`);
