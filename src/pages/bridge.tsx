import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Typography,
  TextField,
  Button,
  Container,
  Box,
  IconButton,
  Paper,
  Tooltip,
  Alert,
  Link,
  CircularProgress,
  Snackbar,
  Grid,
} from '@mui/material';
import { useWaitForTransactionReceipt, useWriteContract, useChainId, usePublicClient, useSwitchChain } from 'wagmi';
import { interop, interop1 } from '../utils/config';
import { factoryAbi } from '../utils/factoryAbi';

// Factory contract address
const FACTORY_ADDRESS = '0x0b1772D3f03f4f21Faf2Ca5aa8689e6d13337aF3';

// SuperchainTokenBridge address
const BRIDGE_ADDRESS = '0x4200000000000000000000000000000000000028';

const BridgePage = () => {
  const router = useRouter();
  const chainId = useChainId();

  // Form state
  const [tokenAddress, setTokenAddress] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Contract interaction state
  const { data: hash, isPending, writeContract } = useWriteContract();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // For copy notification
  const [copySnackbar, setCopySnackbar] = useState(false);

  // Track deployments on both chains
  const [deployments, setDeployments] = useState<{
    [chainId: number]: {
      hash: `0x${string}`;
      confirmed: boolean;
      contractAddress?: `0x${string}`;
    };
  }>({});

  // Update deployments when transaction is confirmed
  useEffect(() => {
    if (hash && isConfirmed && chainId) {
      // Get the contract address from receipt
      const getContractAddress = async () => {
        if (!publicClient) return;

        try {
          const receipt = await publicClient.getTransactionReceipt({ hash });
          if (receipt?.contractAddress) {
            setDeployments((prev) => ({
              ...prev,
              [chainId]: {
                hash,
                confirmed: true,
                contractAddress: receipt.contractAddress as `0x${string}`,
              },
            }));
          } else {
            // If there's no contractAddress in the receipt, update with just hash and confirmed
            setDeployments((prev) => ({
              ...prev,
              [chainId]: {
                hash,
                confirmed: true,
              },
            }));
          }
        } catch (error) {
          console.error('Error getting contract address:', error);
          setDeployments((prev) => ({
            ...prev,
            [chainId]: {
              hash,
              confirmed: true,
            },
          }));
        }
      };

      getContractAddress();
    }
  }, [hash, isConfirmed, chainId, publicClient]);

  // Handle copying text to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySnackbar(true);
  };

  // Get the other chain for cross-deployment
  const getOtherChain = () => {
    return chainId === interop.id ? interop1 : interop;
  };

  // Get the appropriate block explorer URL based on chain ID
  const getExplorerUrl = (txHash: `0x${string}`, chainToUse?: number) => {
    const currentChain = chainToUse || chainId;

    if (currentChain === interop.id) {
      return `${interop.blockExplorers.default.url}/tx/${txHash}`;
    } else if (currentChain === interop1.id) {
      return `${interop1.blockExplorers.default.url}/tx/${txHash}`;
    }
    // Fallback to a default explorer
    return `https://optimism-interop-alpha-0.blockscout.com/tx/${txHash}`;
  };

  const handleBack = () => {
    router.push('/');
  };

  // Validate form input
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!tokenAddress.trim()) {
      newErrors.tokenAddress = 'xERC20 token address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      newErrors.tokenAddress = 'Invalid Ethereum address format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submission to deploy the ERC7802Adapter
  const handleDeployAdapter = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Call the contract
      writeContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'deployERC7802Adapter',
        args: [tokenAddress as `0x${string}`, BRIDGE_ADDRESS as `0x${string}`],
      });
    } catch (error) {
      console.error('Error deploying adapter:', error);
      setErrors({ deployment: 'Error deploying adapter. Check console for details.' });
    }
  };

  // Handle deploying on the other chain
  const handleDeployOnOtherChain = async () => {
    // Get the other chain
    const otherChain = getOtherChain();

    if (!validateForm()) {
      return;
    }

    try {
      // First switch to the other chain
      await switchChainAsync({ chainId: otherChain.id });

      // Call the contract
      writeContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'deployERC7802Adapter',
        args: [tokenAddress as `0x${string}`, BRIDGE_ADDRESS as `0x${string}`],
      });
    } catch (error) {
      console.error('Error deploying adapter on other chain:', error);
      setErrors({ deployment: 'Error deploying adapter on other chain. Check console for details.' });
    }
  };

  // Show result message based on transaction status
  const renderTransactionStatus = () => {
    const hasDeployments = Object.keys(deployments).length > 0;
    const isDeployingCurrentChain = isPending || (hash && isConfirming);
    const showStatus = hasDeployments || isDeployingCurrentChain;

    if (!showStatus) {
      return null;
    }

    // Determine if we've deployed on current and other chain
    const deployedOnCurrentChain = deployments[chainId]?.confirmed;
    const otherChain = getOtherChain();
    const deployedOnOtherChain = deployments[otherChain.id]?.confirmed;

    // Determine if we should show the deploy on other chain button
    const showDeployOnOtherChain = deployedOnCurrentChain && !deployedOnOtherChain && !isPending && !isConfirming;

    return (
      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid' }}>
        <Typography variant='h6' component='h3' sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          Deployment Status
        </Typography>

        {/* Current transaction status */}
        {isPending && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography>Submitting transaction on {chainId === interop.id ? 'Interop 0' : 'Interop 1'}...</Typography>
          </Box>
        )}

        {hash && isConfirming && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography>Waiting for confirmation on {chainId === interop.id ? 'Interop 0' : 'Interop 1'}...</Typography>
          </Box>
        )}

        {/* Show deployments for both chains */}
        {Object.entries(deployments).map(([chainIdStr, { hash: txHash, confirmed, contractAddress }]) => {
          const chainNumber = parseInt(chainIdStr);
          const chainName = chainNumber === interop.id ? 'Interop 0' : 'Interop 1';

          return (
            <Box key={chainIdStr} sx={{ mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant='subtitle1' fontWeight='medium'>
                {chainName} Deployment {confirmed ? '✓' : '(Pending)'}
              </Typography>

              {/* Transaction Hash */}
              <Box sx={{ mb: 1, mt: 1 }}>
                <Typography variant='body2'>Transaction Hash:</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Link
                    href={getExplorerUrl(txHash, chainNumber)}
                    target='_blank'
                    rel='noopener noreferrer'
                    sx={{
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flexGrow: 1,
                    }}
                  >
                    {txHash}
                  </Link>
                  <IconButton size='small' onClick={() => handleCopy(txHash)} sx={{ ml: 1 }}>
                    <ContentCopyIcon fontSize='small' />
                  </IconButton>
                </Box>
              </Box>

              {/* Contract Address (if available) */}
              {contractAddress && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant='body2'>Adapter Address:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Link
                      href={`${getExplorerUrl(contractAddress, chainNumber).replace('/tx/', '/address/')}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      sx={{
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexGrow: 1,
                      }}
                    >
                      {contractAddress}
                    </Link>
                    <IconButton size='small' onClick={() => handleCopy(contractAddress)} sx={{ ml: 1 }}>
                      <ContentCopyIcon fontSize='small' />
                    </IconButton>
                  </Box>
                </Box>
              )}
            </Box>
          );
        })}

        {/* Option to deploy on other chain */}
        {showDeployOnOtherChain && (
          <Box sx={{ mt: 3 }}>
            <Button variant='outlined' onClick={handleDeployOnOtherChain} sx={{ textTransform: 'none' }} fullWidth>
              Deploy Same Adapter on {otherChain.id === interop.id ? 'Interop 0' : 'Interop 1'}
            </Button>
            <Typography variant='caption' sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
              This will deploy the same adapter configuration on the other chain
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <>
      <Head>
        <title>Enable SuperchainTokenBridge | CrosschainERC20 Launchpad</title>
      </Head>
      <Container maxWidth='md' sx={{ py: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={handleBack}
            sx={{ mr: 2 }}
            aria-label='Back to home'
            disabled={isPending || isConfirming}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant='h4' component='h1' fontWeight='bold'>
            Enable SuperchainTokenBridge
          </Typography>
        </Box>

        <Paper sx={{ p: 4 }}>
          {/* Display validation errors */}
          {Object.keys(errors).length > 0 && (
            <Alert severity='error' sx={{ mb: 3 }}>
              Please fix the following errors:
              <ul style={{ margin: '0.5rem 0 0 1rem', paddingLeft: 0 }}>
                {Object.values(errors).map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          <Box sx={{ mb: 4 }}>
            <Typography variant='h6' component='h2' sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              Connect Your xERC20 Token
              <Tooltip
                title='This will deploy an ERC7802 adapter to connect your token with SuperchainTokenBridge'
                placement='right'
              >
                <IconButton size='small' sx={{ ml: 1 }}>
                  <InfoOutlinedIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id='token-address'
                  label='xERC20 Token Address'
                  placeholder='0x...'
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  margin='normal'
                  error={!!errors.tokenAddress}
                  helperText={errors.tokenAddress || 'Enter the address of your existing xERC20 token'}
                />
              </Grid>
            </Grid>

            {renderTransactionStatus()}

            <Button
              variant='contained'
              fullWidth
              disabled={isPending || isConfirming}
              onClick={handleDeployAdapter}
              sx={{
                mt: 3,
                py: 1.5,
                backgroundColor: '#ff0320',
                '&:hover': {
                  backgroundColor: '#d60016',
                },
              }}
            >
              {isPending || isConfirming ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                  {isPending ? 'Preparing Transaction...' : 'Confirming...'}
                </Box>
              ) : (
                'Deploy Adapter'
              )}
            </Button>
          </Box>
        </Paper>

        {/* Copy to clipboard notification */}
        <Snackbar
          open={copySnackbar}
          autoHideDuration={3000}
          onClose={() => setCopySnackbar(false)}
          message='Copied to clipboard'
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Container>
    </>
  );
};

export default BridgePage;
