import {
  ThemeProvider as MuiThemeProvider,
  Experimental_CssVarsProvider as CssVarsProvider,
} from '@mui/material/styles';
import { getConfig } from '~/config';

interface StateProps {
  children: React.ReactElement;
}

export const ThemeProvider = ({ children }: StateProps) => {
  const muiTheme = getConfig().customThemes.getMui;

  return (
    <CssVarsProvider defaultMode='light' disableTransitionOnChange theme={muiTheme} modeStorageKey='app-theme-mode'>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </CssVarsProvider>
  );
};
