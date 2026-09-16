import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppShell from '@/components/AppShell';
import { loadRuntimeConfig } from '@/lib/api';
import './globals.css';

void loadRuntimeConfig().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppShell />
    </StrictMode>,
  ),
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
