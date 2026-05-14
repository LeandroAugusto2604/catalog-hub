// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Set BUILD_TARGET=node to build for a self-hosted Node.js server (VPS).
// Default (unset) keeps the Cloudflare Workers build used by Lovable's preview/publish.
const isNodeBuild = process.env.BUILD_TARGET === "node";

export default defineConfig({
  cloudflare: isNodeBuild ? false : undefined,
  tanstackStart: isNodeBuild ? { target: "node-server" } : undefined,
});
