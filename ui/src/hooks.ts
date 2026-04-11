// SvelteKit universal hooks.
//
// TaskRoot ships as a SPA hosted by pywebview under a file:// URL
// (or pywebview's built-in http_server on localhost). In either
// mode the initial URL ends with `/index.html`, so after SvelteKit
// strips `base` from `location.pathname` the router sees `/index.html`
// and fails to match the root route `/`, rendering the built-in 404.
//
// `reroute` fires before route matching on both initial load and
// client navigation. We trim the trailing `index.html` segment so the
// remainder matches `/`. Everything else passes through untouched.
import type { Reroute } from '@sveltejs/kit';

export const reroute: Reroute = ({ url }) => {
  if (url.pathname.endsWith('/index.html')) {
    return url.pathname.slice(0, -'index.html'.length);
  }
};
