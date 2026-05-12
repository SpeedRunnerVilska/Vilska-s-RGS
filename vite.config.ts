import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// For dev: uses localhost. For production: set RGS_API_URL env var
const REMOTE_RGS_BASE = process.env.RGS_API_URL || 'https://rgs-demo.hacksawgaming.com';

// https://vite.dev/config/
export default defineConfig({
  define: {
    __RGS_API_URL__: JSON.stringify(
      process.env.RGS_API_URL || 'http://localhost:5174'
    ),
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5174,
    host: '0.0.0.0',
    strictPort: true
  },
  plugins: [
    svelte(),
    {
      name: 'local-api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url ?? '';
          if (!url.startsWith('/wallet')) {
            next();
            return;
          }

          const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json; charset=utf-8'
          };

          if (req.method === 'OPTIONS') {
            res.writeHead(204, corsHeaders);
            res.end();
            return;
          }

          if (url === '/wallet/balance') {
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({ balance: 1000, currency: 'USD' }));
            return;
          }

          if (url === '/wallet' || url === '/wallet/') {
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
              success: true,
              wallet: true,
              message: 'Mock /wallet root endpoint'
            }));
            return;
          }

          if (url.startsWith('/wallet/api')) {
            const remotePath = url.replace(/^\/wallet/, '');
            const target = new URL(remotePath, REMOTE_RGS_BASE);
            console.log(`[wallet proxy] ${req.method} ${url} -> ${target}`);
            const requestHeaders: Record<string, string> = {};
            for (const [key, value] of Object.entries(req.headers)) {
              if (!value || key === 'host') continue;
              requestHeaders[key] = Array.isArray(value) ? value.join(',') : value;
            }

            let body: Buffer | undefined;
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              body = await new Promise((resolve) => {
                const chunks: Uint8Array[] = [];
                req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
                req.on('end', () => resolve(Buffer.concat(chunks)));
              });
            }

            try {
              const remoteResponse = await fetch(target.toString(), {
                method: req.method,
                headers: requestHeaders,
                body
              });

              res.writeHead(remoteResponse.status, {
                ...corsHeaders,
                ...Object.fromEntries(remoteResponse.headers.entries())
              });
              const remoteBody = Buffer.from(await remoteResponse.arrayBuffer());
              res.end(remoteBody);
            } catch (error) {
              console.error('[wallet proxy] remote fetch error', error);
              res.writeHead(502, corsHeaders);
              res.end(JSON.stringify({
                success: false,
                error: 'Remote wallet proxy failed',
                details: String(error)
              }));
            }
            return;
          }

          if (url.startsWith('/api/')) {
            console.log(`[generic api proxy] ${req.method} ${url}`);
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
              success: true,
              balance: 1000,
              currency: 'USD',
              path: url,
              message: 'Mock generic API endpoint'
            }));
            return;
          }

          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({
            success: false,
            error: 'Wallet endpoint not found',
            path: url
          }));
        });
      }
    }
  ]
})
