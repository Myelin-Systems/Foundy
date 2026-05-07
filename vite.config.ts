import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    watch: {
      usePolling: true,   // ← makes file watching work inside Docker
      interval:   100,    // ms between polls — 100ms is responsive without being heavy
    },
    host:        true,    // ← binds to 0.0.0.0 so Docker can expose the port
    strictPort:  true,
    port:        5173,
  },
});