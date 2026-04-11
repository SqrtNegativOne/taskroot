import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// TaskRoot loads the built bundle through pywebview via a file:// URL.
// - adapter-static with a fallback gives us a SPA (index.html for any path).
// - paths.relative = true makes asset URLs work under file://.
// - SSR is disabled in src/routes/+layout.ts (there is no server).
/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      // Keep the fallback under a different name so it does not clobber
      // the prerendered index.html (which is what pywebview actually
      // loads over file://). We only have one route right now, so this
      // file is essentially a safety net for future dynamic routes.
      fallback: '200.html',
      precompress: false,
      strict: false
    }),
    paths: {
      relative: true
    }
  }
};

export default config;
