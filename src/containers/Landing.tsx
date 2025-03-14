import LinkIcon from '@mui/icons-material/Link';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import TokenIcon from '@mui/icons-material/Token';
import { Button, Typography, Box, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

export const Landing = () => {
  return (
    <LandingContainer>
      <TitleSection>
        <Typography variant='h3' component='h1' align='center' fontWeight='bold'>
          CrosschainERC20 Launchpad
        </Typography>
        <Typography variant='h6' component='p' align='center' sx={{ mt: 1.5, mb: 5, fontSize: '1.1rem' }}>
          Implement both ERC-7281 and ERC-7802 at once. Seamless. Cool
        </Typography>
      </TitleSection>

      <FeaturesContainer>
        <FeatureCard>
          <IconWrapper>
            <RocketLaunchIcon sx={{ fontSize: 40, color: '#ff0320' }} />
          </IconWrapper>
          <Typography variant='h5' component='h2' fontWeight='bold' sx={{ mb: 2, fontSize: '1.25rem' }}>
            Deploy New Token
          </Typography>
          <Typography variant='body1' sx={{ mb: 4, fontSize: '0.95rem' }}>
            Launch your new token with cross-chain capabilities from the start
          </Typography>
          <ActionButton variant='contained' fullWidth>
            Get Started
          </ActionButton>
        </FeatureCard>

        <FeatureCard>
          <IconWrapper>
            <TokenIcon sx={{ fontSize: 40, color: '#ff0320' }} />
          </IconWrapper>
          <Typography variant='h5' component='h2' fontWeight='bold' sx={{ mb: 2, fontSize: '1.25rem' }}>
            Add Bridging Capabilities
          </Typography>
          <Typography variant='body1' sx={{ mb: 4, fontSize: '0.95rem' }}>
            Upgrade your existing token with cross-chain features
          </Typography>
          <ActionButton variant='contained' fullWidth>
            Upgrade Token
          </ActionButton>
        </FeatureCard>

        <FeatureCard>
          <IconWrapper>
            <LinkIcon sx={{ fontSize: 40, color: '#ff0320' }} />
          </IconWrapper>
          <Typography variant='h5' component='h2' fontWeight='bold' sx={{ mb: 2, fontSize: '1.25rem' }}>
            Enable SuperchainTokenBridge
          </Typography>
          <Typography variant='body1' sx={{ mb: 4, fontSize: '0.95rem' }}>
            Connect your xERC20 token to SuperchainTokenBridge
          </Typography>
          <ActionButton variant='contained' fullWidth>
            Connect Bridge
          </ActionButton>
        </FeatureCard>
      </FeaturesContainer>
    </LandingContainer>
  );
};

const LandingContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  padding: '2.5rem 8rem',
  alignItems: 'center',
  width: '100%',
});

const TitleSection = styled(Box)({
  width: '100%',
  maxWidth: '800px',
  marginBottom: '2.5rem',
});

const FeaturesContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  gap: '2rem',
  width: '100%',
  maxWidth: '1200px',
});

const FeatureCard = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: '1.75rem',
  borderRadius: '8px',
  flex: 1,
  maxWidth: '350px',
  border: `1px solid ${theme.palette.divider}`,
}));

const IconWrapper = styled(Box)({
  marginBottom: '1.25rem',
});

const ActionButton = styled(Button)({
  backgroundColor: '#ff0320',
  color: 'white',
  textTransform: 'none',
  fontWeight: 'bold',
  padding: '0.75rem 1.5rem',
  fontSize: '0.9rem',
  '&:hover': {
    backgroundColor: '#d60016',
  },
});
