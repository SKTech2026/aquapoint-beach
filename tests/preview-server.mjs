import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import worker from '../dist/server/index.js';

// Local visual QA only. This mock never writes a reservation or runs in production.
const port = Number(process.env.AQUAPOINT_PREVIEW_PORT || 4173);
const stored = new Map();
globalThis.fetch = async (url, options = {}) => {
  if (!String(url).startsWith('https://preview.supabase.co/rest/v1/reservations')) throw Error('Unexpected outbound request');
  if (options.method === 'POST') {
    const row = JSON.parse(options.body);
    if (stored.has(row.request_id)) return Response.json({ code: '23505' }, { status: 409 });
    const value = { ...row, reservation_number: `AQP-2026-${String(stored.size + 1).padStart(5, '0')}`, status: 'pending' };
    stored.set(row.request_id, value);
    return Response.json([value]);
  }
  const id = new URL(url).searchParams.get('request_id')?.slice(3);
  return Response.json(stored.has(id) ? [stored.get(id)] : []);
};

createServer(async (req, res) => {
  if (req.url === '/videos/aquapoint-drone-hero.mp4') {
    const path = 'dist/videos/aquapoint-drone-hero.mp4';
    const size = statSync(path).size;
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
    const start = range ? Number(range[1]) : 0;
    const end = range && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || end < start) { res.writeHead(416, { 'content-range': `bytes */${size}` }); res.end(); return; }
    res.writeHead(range ? 206 : 200, {
      'content-type': 'video/mp4', 'accept-ranges': 'bytes',
      'content-length': end - start + 1,
      ...(range ? { 'content-range': `bytes ${start}-${end}/${size}` } : {})
    });
    createReadStream(path, { start, end }).pipe(res);
    return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const request = new Request(`http://127.0.0.1:${port}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks)
  });
  const response = await worker.fetch(request, { SUPABASE_URL: 'https://preview.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_preview' });
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, '127.0.0.1', () => console.log(`Local preview with MOCK reservations: http://127.0.0.1:${port}`));
