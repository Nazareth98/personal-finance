import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@personal-finance/tokens/theme.css';
import '@personal-finance/ui/styles.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
);
