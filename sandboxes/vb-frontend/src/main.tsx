// Import security utils first to ensure they're loaded before any other code
import './utils/securityUtils';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import { ThemeProvider } from '@mui/material/styles';
import { victoryMuiTheme } from './theme/muiTheme';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={victoryMuiTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <AlertProvider>
            <App />
          </AlertProvider>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </StrictMode>,
);
