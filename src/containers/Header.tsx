import { AppBar, Toolbar, Typography, styled, Box } from '@mui/material';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export const Header = () => {
  return (
    <StyledAppBar position='static' elevation={0}>
      <StyledToolbar>
        <LogoContainer>
          <Typography variant='h6' component='div' fontWeight='bold' fontSize='1.1rem'>
            CrosschainERC20 Launchpad
          </Typography>
        </LogoContainer>
        <ConnectButtonWrapper>
          <ConnectButton showBalance={false} chainStatus='icon' accountStatus='address' />
        </ConnectButtonWrapper>
      </StyledToolbar>
    </StyledAppBar>
  );
};

const StyledAppBar = styled(AppBar)({
  backgroundColor: 'white',
  color: 'black',
  borderBottom: '1px solid #e0e0e0',
});

const StyledToolbar = styled(Toolbar)({
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0.5rem 4rem',
  width: '100%',
  minHeight: '56px', // Making the header a bit more compact
});

const LogoContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
});

const ConnectButtonWrapper = styled(Box)({
  // Custom styling for the RainbowKit ConnectButton
  '& button': {
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },
});
