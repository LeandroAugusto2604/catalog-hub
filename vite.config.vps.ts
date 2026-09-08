// Configuração de build para hospedagem própria (VPS com Node).
// Diferença em relação ao vite.config.ts: NÃO usa o plugin do Cloudflare,
// gera uma saída Node em .output/server/index.mjs para rodar com PM2.
//
// Uso na VPS:  bun run build:vps   (ou: npx vite build --config vite.config.vps.ts)
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({ target: "node-server" }),
    viteReact(),
  ],
});
