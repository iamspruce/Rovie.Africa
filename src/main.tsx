import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted rather than pulled from a font CDN: a third-party round trip is
// a poor trade on the expensive, unreliable connections a lot of this
// audience is on, and Google Fonts is blocked outright on some networks.
// Each file carries unicode-range, so only the subsets in use are fetched.
// One face for the entire site. The design system names Berkeley Mono first
// and IBM Plex Mono immediately after it; Berkeley is commercially licensed
// and cannot be redistributed, so Plex is what actually ships. It was drawn
// for the same job - long reading in a fixed pitch - and its digits are
// unambiguous, which this site needs: every figure on it is money.
//
// Three weights, because the system builds hierarchy from size and weight
// alone: 400 body, 500 interactive, 700 headings.
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/700.css';
// The docs render Markdown emphasis, so the real italic is loaded rather than
// letting the browser slant the roman into a fake one.
import '@fontsource/ibm-plex-mono/400-italic.css';
import './styles/main.scss';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
