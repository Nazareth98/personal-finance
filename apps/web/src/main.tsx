import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from '@personal-finance/ui';
import '@personal-finance/tokens/theme.css';
import '@personal-finance/ui/styles.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode><ToastProvider><App /></ToastProvider></StrictMode>
);
