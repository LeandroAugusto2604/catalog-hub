// Iniciador do site em servidor Node (VPS).
// O build gera um "handler" em dist/server/server.js, sem servidor HTTP próprio.
// Este arquivo abre a porta, serve os arquivos estáticos de dist/client
// e entrega o resto para o app.
//
// Uso:  node deploy/server.mjs      (o PM2 usa este arquivo)
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { serve } from "srvx/node";
import { serveStatic } from "srvx/static";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

// Lê as configurações do arquivo .env da raiz do projeto
try {
  process.loadEnvFile(resolve(root, ".env"));
} catch {
  console.warn("Aviso: arquivo .env não encontrado ou não lido.");
}

const app = await import(resolve(root, "dist/server/server.js"));
const handler = app.default?.fetch ?? app.fetch;

const port = Number(process.env.PORT || 3000);

serve({
  port,
  hostname: process.env.HOST || "0.0.0.0",
  middleware: [serveStatic({ dir: resolve(root, "dist/client") })],
  fetch: (request) => handler(request),
});

console.log(`Site rodando em http://127.0.0.1:${port}`);
