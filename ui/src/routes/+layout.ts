// Pywebview hosts this bundle as a file:// SPA — there is no server.
// - ssr = false: we render on the client, so onMount/window.pywebview
//   never run in Node during the build.
// - prerender = true: SvelteKit still emits an HTML *shell* for each
//   route at build time. Combined with svelte.config.js's
//   paths.relative = true, this gives us relative ./_app/... asset
//   URLs that actually resolve under file://. With prerender = false
//   the adapter falls back to a template anchored at "/" and every
//   chunk 404s in pywebview.
export const ssr = false;
export const prerender = true;
export const trailingSlash = 'ignore';
