import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

// Plugin to automatically copy index.html to 404.html for GitHub Pages SPA routing
function githubPagesSpaPlugin(): Plugin {
  return {
    name: 'github-pages-spa-404',
    closeBundle() {
      try {
        const distDir = path.resolve(__dirname, 'dist');
        const indexFile = path.join(distDir, 'index.html');
        const notFoundFile = path.join(distDir, '404.html');
        if (fs.existsSync(indexFile)) {
          fs.copyFileSync(indexFile, notFoundFile);
        }
      } catch (err) {
        console.warn('[GitHub Pages] Could not copy 404.html:', err);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    // Relative base path ensures assets load properly on GitHub Pages regardless of repo name
    base: process.env.VITE_BASE_PATH || './',
    plugins: [react(), tailwindcss(), githubPagesSpaPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
