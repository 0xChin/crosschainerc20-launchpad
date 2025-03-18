import GitHubIcon from '@mui/icons-material/GitHub';
import { styled, Box, Typography, IconButton, Container } from '@mui/material';

export const Footer = () => {
  return (
    <FooterContainer>
      <Container maxWidth='lg'>
        <FooterContent>
          <WonderlandLink>
            Made with <Heart>♥</Heart> by{' '}
            <StyledLink href='https://defi.sucks' target='_blank' rel='noopener noreferrer'>
              Wonderland
            </StyledLink>
          </WonderlandLink>
          <SocialLinks>
            <IconButton
              aria-label='GitHub'
              href='https://github.com/defi-wonderland/crosschainERC20'
              target='_blank'
              rel='noopener noreferrer'
              size='small'
            >
              <GitHubIcon fontSize='small' />
            </IconButton>
          </SocialLinks>
        </FooterContent>
      </Container>
    </FooterContainer>
  );
};

const FooterContainer = styled('footer')(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  padding: '1.5rem 0',
  borderTop: `1px solid ${theme.palette.divider}`,
  marginTop: 'auto',
  width: '100%',
}));

const FooterContent = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
});

const WonderlandLink = styled(Typography)({
  color: '#666',
  fontSize: '0.875rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
});

const Heart = styled('span')({
  color: '#ff0320',
  fontSize: '0.875rem',
});

const StyledLink = styled('a')({
  color: '#666',
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
});

const SocialLinks = styled(Box)({
  display: 'flex',
  gap: '0.5rem',
});
