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
 * Local development:
 * Load the project's .env file when it exists.
 *
 * Production:
 * Render supplies these values through process.env.
 */
if (existsSync(join(root, '.env'))) {
  process.loadEnvFile(join(root, '.env'));
}

/*
 * Safe configuration diagnostics.
 *
 * Never print the actual Supabase URL or publishable key.
 */
const hasSupabaseUrl = Boolean(
  process.env.SUPABASE_URL?.trim()
);

const hasSupabasePublishableKey = Boolean(
  process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
);

console.log(
  `Supabase URL configured: ${hasSupabaseUrl ? 'YES' : 'NO'}`
);

console.log(
  `Supabase publishable key configured: ${
    hasSupabasePublishableKey ? 'YES' : 'NO'
  }`
);

/*
 * Build the browser-safe Supabase client.
 *
 * SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are intentionally
 * embedded in the browser bundle.
 *
 * NEVER place a Supabase service_role key here.
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
    __AQUAPOINT_SUPABASE_URL__: JSON.stringify(
      process.env.SUPABASE_URL?.trim() || ''
    ),

    __AQUAPOINT_SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(
      process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || ''
    )
  }
});

/*
 * Admin authentication controller.
 */
await copyFile(
  join(root, 'src/admin-auth.js'),
  join(sourceDir, 'admin-auth.js')
);

/*
 * Collect generated static assets for the Worker build.
 */
async function collect(dir) {
  for (const entry of await readdir(dir, {
    withFileTypes: true
  })) {
    /*
     * Do not recursively include the generated Worker server directory.
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
     * Video remains a separate static file.
     * Do not inline MP4/WebM files into Worker source.
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
     * Make Supabase and Admin Auth load BEFORE app.js.
     *
     * This is especially important for production /admin routes.
     *
     * app.js expects:
     *
     * globalThis.__aquapointSupabase
     * globalThis.__aquapointAdminAuth
     *
     * to already exist when the application starts.
     */
    if (extname(path) === '.html') {
      const html = content.toString('utf8');

      content = Buffer.from(
        html.replace(
          '<script type="module" src="/app.js"></script>',

          `<script type="module">
    import "/supabase-client.js";
    import "/admin-auth.js";

    await import("/app.js");
  </script>`
        )
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
 * Collect all generated static assets.
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
 * Build Worker server.
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
 * Create generated server directory.
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