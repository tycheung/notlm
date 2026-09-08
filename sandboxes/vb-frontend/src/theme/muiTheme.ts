import { createTheme } from '@mui/material/styles';
import { VICTORY_PALETTE } from './victoryPalette';

/**
 * MUI theme aligned with Victory palette + dark shell (matches web app).
 */
export const victoryMuiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: VICTORY_PALETTE.primary,
      light: VICTORY_PALETTE.primaryLight,
      dark: '#c2410c',
    },
    secondary: {
      main: VICTORY_PALETTE.accent,
    },
    error: {
      main: VICTORY_PALETTE.danger,
    },
    success: {
      main: VICTORY_PALETTE.success,
    },
    warning: {
      main: VICTORY_PALETTE.pending,
    },
    info: {
      main: VICTORY_PALETTE.accent,
    },
    background: {
      default: VICTORY_PALETTE.bg,
      paper: VICTORY_PALETTE.surface,
    },
    text: {
      primary: VICTORY_PALETTE.text,
      secondary: VICTORY_PALETTE.textMuted,
      disabled: VICTORY_PALETTE.textDim,
    },
    divider: VICTORY_PALETTE.border,
  },
  typography: {
    fontFamily: [
      'JetBrains Mono',
      'SF Mono',
      'Fira Code',
      'monospace',
    ].join(','),
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: VICTORY_PALETTE.primary,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: VICTORY_PALETTE.primary,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: VICTORY_PALETTE.primary,
            color: VICTORY_PALETTE.text,
          },
        },
      },
    },
  },
});
