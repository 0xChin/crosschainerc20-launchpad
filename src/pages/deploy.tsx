import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Typography,
  TextField,
  Button,
  Container,
  Box,
  IconButton,
  Divider,
  Collapse,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Link,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import { switchChain } from '@wagmi/core';
import { parseEther } from 'viem';
import { useAccount, useWaitForTransactionReceipt, useWriteContract, useChainId, usePublicClient } from 'wagmi';
import { interop, interop1, config } from '../utils/config';
import { factoryAbi } from '../utils/factoryAbi';

// Factory contract address
const FACTORY_ADDRESS = '0x0b1772D3f03f4f21Faf2Ca5aa8689e6d13337aF3';

// Default bridge options
const BRIDGE_OPTIONS = [
  {
    name: 'SuperchainTokenBridge',
    address: '0x4200000000000000000000000000000000000028',
    fixed: true,
  },
];

interface Bridge {
  id: string;
  type: string;
  address: string;
  mintLimit: string;
  burnLimit: string;
  isCustom: boolean;
}

// Steps in the form
const steps = ['Token Information', 'Bridge Configuration'];

const DeployTokenPage = () => {
  const router = useRouter();
  const { address } = useAccount();
  const chainId = useChainId();

  // Form state
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [decimals, setDecimals] = useState('18');
  const [ownerAddress, setOwnerAddress] = useState(address || '');

  // Multi-step form state
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Bridge state
  const [bridges, setBridges] = useState<Bridge[]>([
    {
      id: '1',
      type: 'SuperchainTokenBridge',
      address: '0x4200000000000000000000000000000000000028',
      mintLimit: '',
      burnLimit: '',
      isCustom: false,
    },
  ]);

  // Contract interaction state
  const { data: hash, isPending, writeContract } = useWriteContract();
  const publicClient = usePublicClient();

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

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTokenSymbol(e.target.value.toUpperCase());
  };

  const handleBack = () => {
    if (activeStep === 0) {
      router.push('/');
    } else {
      setActiveStep(activeStep - 1);
    }
  };

  const handleAddBridge = () => {
    const newBridge: Bridge = {
      id: (bridges.length + 1).toString(),
      type: 'SuperchainTokenBridge',
      address: '0x4200000000000000000000000000000000000028',
      mintLimit: '',
      burnLimit: '',
      isCustom: false,
    };

    setBridges([...bridges, newBridge]);
  };

  const handleRemoveBridge = (id: string) => {
    if (bridges.length > 1) {
      setBridges(bridges.filter((bridge) => bridge.id !== id));
    }
  };

  const handleBridgeChange = (id: string, field: keyof Bridge, value: string) => {
    setBridges(
      bridges.map((bridge) => {
        if (bridge.id === id) {
          // If changing bridge type to custom, update the address field
          if (field === 'type' && value === 'custom') {
            return {
              ...bridge,
              [field]: value,
              address: '',
              isCustom: true,
            };
          }

          // If changing bridge type to a predefined option, update the address
          if (field === 'type' && value !== 'custom') {
            const selectedBridge = BRIDGE_OPTIONS.find((option) => option.name === value);
            return {
              ...bridge,
              [field]: value,
              address: selectedBridge?.address || '',
              isCustom: false,
            };
          }

          return { ...bridge, [field]: value };
        }
        return bridge;
      }),
    );
  };

  // Validate the first step (token information)
  const validateTokenInfo = () => {
    const newErrors: { [key: string]: string } = {};

    if (!tokenName.trim()) {
      newErrors.tokenName = 'Token name is required';
    }

    if (!tokenSymbol.trim()) {
      newErrors.tokenSymbol = 'Token symbol is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate bridge configuration
  const validateBridgeConfig = () => {
    const newErrors: { [key: string]: string } = {};

    // Check if at least one bridge is configured
    if (bridges.length === 0) {
      newErrors.bridges = 'At least one bridge must be configured';
    }

    // Check if all bridges have addresses
    const missingAddress = bridges.some((bridge) => !bridge.address);
    if (missingAddress) {
      newErrors.bridgeAddress = 'All bridges must have an address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle continue to next step
  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeStep === 0) {
      if (validateTokenInfo()) {
        setActiveStep(1);
      }
    } else {
      handleDeployToken();
    }
  };

  // Handle final submission
  const handleDeployToken = () => {
    if (!validateBridgeConfig()) {
      return;
    }

    try {
      // Prepare arrays for the contract call
      const bridgeAddresses = bridges.map((bridge) => bridge.address as `0x${string}`);
      const minterLimits = bridges.map((bridge) => (bridge.mintLimit ? parseEther(bridge.mintLimit) : BigInt(0)));
      const burnerLimits = bridges.map((bridge) => (bridge.burnLimit ? parseEther(bridge.burnLimit) : BigInt(0)));

      // Use the connected wallet address if owner is not specified
      const owner = ownerAddress || address;

      // Call the contract
      writeContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'deployCrosschainERC20',
        args: [
          tokenName,
          tokenSymbol,
          parseInt(decimals),
          minterLimits,
          burnerLimits,
          bridgeAddresses,
          owner as `0x${string}`,
        ],
      });
    } catch (error) {
      console.error('Error deploying token:', error);
      setErrors({ deployment: 'Error deploying token. Check console for details.' });
    }
  };

  // Handle deploying on the other chain
  const handleDeployOnOtherChain = async () => {
    // Get the other chain
    const otherChain = getOtherChain();

    if (!validateBridgeConfig()) {
      return;
    }

    try {
      // First switch to the other chain
      await switchChain(config, { chainId: otherChain.id });

      // Prepare arrays for the contract call
      const bridgeAddresses = bridges.map((bridge) => bridge.address as `0x${string}`);
      const minterLimits = bridges.map((bridge) => (bridge.mintLimit ? parseEther(bridge.mintLimit) : BigInt(0)));
      const burnerLimits = bridges.map((bridge) => (bridge.burnLimit ? parseEther(bridge.burnLimit) : BigInt(0)));

      // Use the connected wallet address if owner is not specified
      const owner = ownerAddress || address;

      // Call the contract
      writeContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'deployCrosschainERC20',
        args: [
          tokenName,
          tokenSymbol,
          parseInt(decimals),
          minterLimits,
          burnerLimits,
          bridgeAddresses,
          owner as `0x${string}`,
        ],
      });
    } catch (error) {
      console.error('Error deploying token on other chain:', error);
      setErrors({ deployment: 'Error deploying token on other chain. Check console for details.' });
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
                  <Typography variant='body2'>Contract Address:</Typography>
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
              Deploy Same Token on {otherChain.id === interop.id ? 'Interop 0' : 'Interop 1'}
            </Button>
            <Typography variant='caption' sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
              This will deploy the same token configuration on the other chain
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <>
      <Head>
        <title>Deploy New Token | CrosschainERC20 Launchpad</title>
      </Head>
      <Container maxWidth='md' sx={{ py: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={handleBack}
            sx={{ mr: 2 }}
            aria-label={activeStep === 0 ? 'Back to home' : 'Back to token information'}
            disabled={isPending || isConfirming}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant='h4' component='h1' fontWeight='bold'>
            Deploy New Token
          </Typography>
        </Box>

        <Paper sx={{ p: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

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

          <Box component='form' onSubmit={handleContinue} noValidate>
            {/* Step 1: Token Information */}
            {activeStep === 0 && (
              <>
                <Typography variant='h6' component='h2' sx={{ mb: 3 }}>
                  Token Information
                </Typography>

                <TextField
                  required
                  fullWidth
                  id='token-name'
                  label='Token Name'
                  placeholder='My Awesome Token'
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  margin='normal'
                  error={!!errors.tokenName}
                  helperText={errors.tokenName}
                />

                <TextField
                  required
                  fullWidth
                  id='token-symbol'
                  label='Token Symbol'
                  placeholder='TKN'
                  value={tokenSymbol}
                  onChange={handleSymbolChange}
                  margin='normal'
                  inputProps={{
                    style: { textTransform: 'uppercase' },
                    maxLength: 8,
                  }}
                  error={!!errors.tokenSymbol}
                  helperText={errors.tokenSymbol || 'Maximum 8 characters, automatically converted to uppercase'}
                />

                <Divider sx={{ my: 3 }} />

                <Box sx={{ mb: 3 }}>
                  <Button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    sx={{ textTransform: 'none' }}
                  >
                    Advanced Options
                  </Button>

                  <Collapse in={showAdvanced}>
                    <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #eee' }}>
                      <TextField
                        fullWidth
                        id='token-decimals'
                        label='Decimals'
                        type='number'
                        value={decimals}
                        onChange={(e) => setDecimals(e.target.value)}
                        margin='normal'
                        helperText='Standard is 18 decimals for most tokens'
                        InputProps={{
                          inputProps: { min: 0, max: 18 },
                        }}
                      />

                      <TextField
                        fullWidth
                        id='owner-address'
                        label='Owner Address'
                        value={ownerAddress}
                        onChange={(e) => setOwnerAddress(e.target.value)}
                        margin='normal'
                        placeholder={address || '0x...'}
                        helperText='Address that will be the token owner and admin (defaults to connected wallet)'
                      />
                    </Box>
                  </Collapse>
                </Box>
              </>
            )}

            {/* Step 2: Bridge Configuration */}
            {activeStep === 1 && (
              <>
                <Typography variant='h6' component='h2' sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  Bridge Configuration
                  <Tooltip title='Configure bridges for cross-chain capabilities' placement='right'>
                    <IconButton size='small' sx={{ ml: 1 }}>
                      <InfoOutlinedIcon fontSize='small' />
                    </IconButton>
                  </Tooltip>
                </Typography>

                {bridges.map((bridge) => (
                  <Box key={bridge.id} sx={{ mb: 4 }}>
                    <Paper
                      variant='outlined'
                      sx={{
                        p: 2,
                        borderColor: (theme) => theme.palette.divider,
                        position: 'relative',
                      }}
                    >
                      {bridges.length > 1 && (
                        <IconButton
                          onClick={() => handleRemoveBridge(bridge.id)}
                          color='error'
                          aria-label='Remove bridge'
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                          }}
                          size='small'
                        >
                          <DeleteOutlineIcon fontSize='small' />
                        </IconButton>
                      )}

                      <Grid container spacing={2} alignItems='flex-start'>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth>
                            <InputLabel id={`bridge-type-label-${bridge.id}`}>Bridge</InputLabel>
                            <Select
                              labelId={`bridge-type-label-${bridge.id}`}
                              id={`bridge-type-${bridge.id}`}
                              value={bridge.type}
                              label='Bridge'
                              onChange={(e) => handleBridgeChange(bridge.id, 'type', e.target.value)}
                            >
                              <MenuItem value='SuperchainTokenBridge'>SuperchainTokenBridge</MenuItem>
                              <MenuItem value='custom'>Custom Bridge</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Standard bridge layout */}
                        {!bridge.isCustom && (
                          <>
                            <Grid item xs={12} sm={4}>
                              <TextField
                                fullWidth
                                label='Mint Limit'
                                type='number'
                                value={bridge.mintLimit}
                                onChange={(e) => handleBridgeChange(bridge.id, 'mintLimit', e.target.value)}
                                InputProps={{
                                  inputProps: { min: 0 },
                                  endAdornment: <InputAdornment position='end'>ETH</InputAdornment>,
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <TextField
                                fullWidth
                                label='Burn Limit'
                                type='number'
                                value={bridge.burnLimit}
                                onChange={(e) => handleBridgeChange(bridge.id, 'burnLimit', e.target.value)}
                                InputProps={{
                                  inputProps: { min: 0 },
                                  endAdornment: <InputAdornment position='end'>ETH</InputAdornment>,
                                }}
                              />
                            </Grid>
                          </>
                        )}
                      </Grid>

                      {/* Custom bridge layout */}
                      {bridge.isCustom && (
                        <Box sx={{ mt: 2 }}>
                          <TextField
                            fullWidth
                            label='Custom Bridge Address'
                            value={bridge.address}
                            onChange={(e) => handleBridgeChange(bridge.id, 'address', e.target.value)}
                            placeholder='0x...'
                            sx={{ mb: 2 }}
                          />

                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label='Mint Limit'
                                type='number'
                                value={bridge.mintLimit}
                                onChange={(e) => handleBridgeChange(bridge.id, 'mintLimit', e.target.value)}
                                InputProps={{
                                  inputProps: { min: 0 },
                                  endAdornment: <InputAdornment position='end'>ETH</InputAdornment>,
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label='Burn Limit'
                                type='number'
                                value={bridge.burnLimit}
                                onChange={(e) => handleBridgeChange(bridge.id, 'burnLimit', e.target.value)}
                                InputProps={{
                                  inputProps: { min: 0 },
                                  endAdornment: <InputAdornment position='end'>ETH</InputAdornment>,
                                }}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      )}
                    </Paper>
                  </Box>
                ))}

                <Button
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={handleAddBridge}
                  sx={{ textTransform: 'none', mb: 3 }}
                  disabled={isPending || isConfirming}
                >
                  Add Another Bridge
                </Button>

                {renderTransactionStatus()}
              </>
            )}

            <Button
              type='submit'
              variant='contained'
              fullWidth
              disabled={isPending || isConfirming}
              sx={{
                mt: 3,
                py: 1.5,
                backgroundColor: '#ff0320',
                '&:hover': {
                  backgroundColor: '#d60016',
                },
              }}
            >
              {activeStep === 0 ? (
                'Continue'
              ) : isPending || isConfirming ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                  {isPending ? 'Preparing Transaction...' : 'Confirming...'}
                </Box>
              ) : (
                'Deploy Token'
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

export default DeployTokenPage;
