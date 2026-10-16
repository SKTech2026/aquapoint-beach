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

/*
 * Load local environment variables when .env exists.
 * On Render, environment variables come from Render itself.
 */
if (existsSync(join(root, '.env'))) {
  process.loadEnvFile(join(root, '.env'));
}

/*
 * Safe diagnostics.
 * These only say whether variables exist.
 * They never print the actual credentials.
 */
const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || '';

console.log(
  `Supabase URL configured: ${supabaseUrl ? 'YES' : 'NO'}`
);

console.log(
  `Supabase publishable key configured: ${
    supabasePublishableKey ? 'YES' : 'NO'
  }`
);

/*
 * Build browser Supabase client.
 *
 * IMPORTANT:
 * Only use the browser-safe publishable key here.
 * Never use the service_role key.
 */
await bundle({
  entryPoints: [
    join(root, 'src/supabase-browser-client.js')
  ],

  outfile: join(
    sourceDir,
    'supabase-client.js'
  ),

  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,

  define: {
    __AQUAPOINT_SUPABASE_URL__:
      JSON.stringify(supabaseUrl),

    __AQUAPOINT_SUPABASE_PUBLISHABLE_KEY__:
      JSON.stringify(supabasePublishableKey)
  }
});

/*
 * Copy admin authentication module into dist/.
 */
await copyFile(
  join(root, 'src/admin-auth.js'),
  join(sourceDir, 'admin-auth.js')
);

/*
 * Collect static files.
 */
async function collect(dir) {
  for (
    const entry of await readdir(dir, {
      withFileTypes: true
    })
  ) {
    /*
     * Avoid recursively collecting generated Worker files.
     */
    if (
      dir === sourceDir &&
      entry.name === 'server'
    ) {
      continue;
    }

    const path = join(
      dir,
      entry.name
    );

    if (entry.isDirectory()) {
      await collect(path);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    /*
     * Keep large video files outside the embedded Worker assets.
     */
    if (
      ['.mp4', '.webm'].includes(
        extname(path)
      )
    ) {
      continue;
    }

    const key =
      '/' +
      relative(sourceDir, path)
        .split(sep)
        .join('/');

    let content = await readFile(path);

    /*
     * Render publishes dist/ directly.
     *
     * Therefore we must BOTH:
     *
     * 1. Modify the HTML used by the Worker.
     * 2. Write the modified HTML back into dist/.
     *
     * Supabase and admin-auth must finish loading before app.js.
     */
    if (extname(path) === '.html') {
      const html = content.toString('utf8');
      const loader = `<script type="module">import "/supabase-client.js"; import "/admin-auth.js"; import "/app.js";</script>`;

      let updatedHtml = html;

      /*
       * Replace the normal app.js module script.
       *
       * Regex is used so whitespace differences don't break
       * the production build.
       */
      const appScriptPattern =
        /<script\s+type=["']module["']\s+src=["']\/app\.js["']\s*><\/script>/i;

      if (appScriptPattern.test(html)) {
        updatedHtml = html.replace(
          appScriptPattern,
          loader
        );
      }

      /*
       * Fail the build instead of silently deploying broken
       * admin authentication.
       */
      if (
        !updatedHtml.includes('/supabase-client.js') ||
        !updatedHtml.includes('/admin-auth.js')
      ) {
        throw new Error(
          `Failed to inject admin authentication modules into ${key}`
        );
      }

      /*
       * This is the critical fix for Render Static Site.
       *
       * Previously we only changed the in-memory Worker asset.
       * Render continued serving the original dist/index.html.
       */
      await writeFile(
        path,
        updatedHtml,
        'utf8'
      );

      content = Buffer.from(
        updatedHtml,
        'utf8'
      );
    }

    assets[key] = {
      type:
        types[extname(path)] ||
        'application/octet-stream',

      base64:
        content.toString('base64')
    };
  }
}

/*
 * Process dist/.
 */
await collect(sourceDir);

/*
 * Load trusted room data.
 */
const rooms = JSON.parse(
  await readFile(
    join(sourceDir, 'rooms.json'),
    'utf8'
  )
);

/*
 * Generate Worker build.
 */
let worker = await readFile(
  join(root, 'worker', 'index.js'),
  'utf8'
);

worker = worker
  .replace(
    '__AQUAPOINT_ASSETS__',
    JSON.stringify(assets)
  )
  .replace(
    '__AQUAPOINT_ROOMS__',
    JSON.stringify(rooms)
  );

/*
 * Ensure server output directory exists.
 */
await mkdir(
  join(sourceDir, 'server'),
  {
    recursive: true
  }
);

/*
 * Write generated Worker.
 */
await writeFile(
  join(
    sourceDir,
    'server',
    'index.js'
  ),
  worker
);

console.log(
  `Built Worker with ${Object.keys(assets).length} static assets and ${rooms.length} rooms.`
);