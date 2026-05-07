/**
 * Local OAuth callback server.
 *
 * Listens on a random available port at 127.0.0.1 for the OAuth redirect.
 * Times out after 5 minutes. Serves a success/failure page in the browser.
 * Never logs tokens or authorization codes.
 */

import {createServer, type Server} from 'node:http';
import {URL} from 'node:url';
import net from 'node:net';

export type CallbackResult = {
  code: string;
  state?: string;
};

const SUCCESS_HTML = `<!DOCTYPE html><html><head><title>OpenSyntax</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0d1117;color:#e6edf3}
.box{text-align:center;padding:2rem;border:1px solid #30363d;border-radius:8px;max-width:400px}
h1{color:#3fb950;margin-bottom:.5rem}p{color:#8b949e}</style></head>
<body><div class="box"><h1>✓ Authentication complete</h1>
<p>You can close this tab and return to the terminal.</p></div></body></html>`;

const FAILURE_HTML = `<!DOCTYPE html><html><head><title>OpenSyntax</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0d1117;color:#e6edf3}
.box{text-align:center;padding:2rem;border:1px solid #30363d;border-radius:8px;max-width:400px}
h1{color:#f85149;margin-bottom:.5rem}p{color:#8b949e}</style></head>
<body><div class="box"><h1>✗ Authentication failed</h1>
<p>Missing authorization code. Please try again.</p></div></body></html>`;

/** Find a random available port on 127.0.0.1. */
export async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

/** Start the callback server and wait for the OAuth redirect. */
export async function waitForCallback(
  port: number,
  expectedState?: string,
  timeoutMs = 300_000
): Promise<CallbackResult> {
  return new Promise((resolve, reject) => {
    let server: Server;

    const timer = setTimeout(() => {
      server?.close();
      reject(new Error('OAuth callback timed out after 5 minutes'));
    }, timeoutMs);

    server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state') ?? undefined;
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, {'content-type': 'text/html'});
          res.end(FAILURE_HTML);
          clearTimeout(timer);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, {'content-type': 'text/html'});
          res.end(FAILURE_HTML);
          return;
        }

        // Validate state to prevent CSRF
        if (expectedState && state !== expectedState) {
          res.writeHead(400, {'content-type': 'text/html'});
          res.end(FAILURE_HTML);
          clearTimeout(timer);
          server.close();
          reject(new Error('OAuth state mismatch — possible CSRF attack'));
          return;
        }

        res.writeHead(200, {'content-type': 'text/html'});
        res.end(SUCCESS_HTML);
        clearTimeout(timer);
        server.close();
        resolve({code, state});
      } catch {
        res.writeHead(500, {'content-type': 'text/plain'});
        res.end('Internal error');
      }
    });

    server.listen(port, '127.0.0.1');
    server.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
