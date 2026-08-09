import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted rather than pulled from a font CDN: a third-party round trip is
// a poor trade on the expensive, unreliable connections a lot of this
// audience is on, and Google Fonts is blocked outright on some networks.
// Each file carries unicode-range, so only the subsets in use are fetched.
import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
// The docs render Markdown emphasis, so the real italic is loaded rather than
// letting the browser slant the roman into a fake one.
import '@fontsource/atkinson-hyperlegible/400-italic.css';
import './styles/main.scss';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
