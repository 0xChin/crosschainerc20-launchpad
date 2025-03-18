import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
  useChainId,
  usePublicClient,
  useSwitchChain,
} from 'wagmi';
import { interop, interop1 } from '../utils/config';
import { factoryAbi } from '../utils/factoryAbi';

// Factory contract address
const FACTORY_ADDRESS = '0x0b1772D3f03f4f21Faf2Ca5aa8689e6d13337aF3';

// Bridge options
const BRIDGE_OPTIONS = [
  {
    name: 'SuperchainTokenBridge',
    address: '0x4200000000000000000000000000000000000028',
    fixed: true,
  },
];

// Steps for the upgrade process
const steps = ['Input Token', 'Configure Settings', 'Deploy'];

interface Bridge {
  id: string;
  type: string;
  address: string;
  mintLimit: string;
  burnLimit: string;
  isCustom: boolean;
}

// ERC20 ABI for fetching token details
const erc20Abi = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const UpgradePage = () => {
  const router = useRouter();
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  // Form state - Step 1
  const [baseTokenAddress, setBaseTokenAddress] = useState('');
  const [tokenFetching, setTokenFetching] = useState(false);
  const [tokenDetails, setTokenDetails] = useState<{
    name: string;
    symbol: string;
    decimals: number;
  } | null>(null);

  // Form state - Step 2
  const [bridges, setBridges] = useState<Bridge[]>([
    {
      id: '1',
      type: 'SuperchainTokenBridge',
      address: '0x4200000000000000000000000000000000000028',
      mintLimit: '1000000',
      burnLimit: '1000000',
      isCustom: false,
    },
  ]);

  // Current step
  const [activeStep, setActiveStep] = useState(0);

  // Error state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Contract interaction state
  const { data: hash, isPending, writeContract } = useWriteContract();
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
      tokenAddress?: `0x${string}`;
      lockboxAddress?: `0x${string}`;
    };
  }>({});

  // Use read contract to fetch token details
  const fetchTokenDetails = async () => {
    if (!baseTokenAddress || !publicClient) return;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(baseTokenAddress)) {
      setErrors({ baseTokenAddress: 'Invalid Ethereum address format' });
      return;
    }

    setTokenFetching(true);
    setErrors({});

    try {
      // Fetch token name
      const name = await publicClient.readContract({
        address: baseTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'name',
      });

      // Fetch token symbol
      const symbol = await publicClient.readContract({
        address: baseTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'symbol',
      });

      // Fetch token decimals
      const decimals = await publicClient.readContract({
        address: baseTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'decimals',
      });

      setTokenDetails({
        name: name as string,
        symbol: symbol as string,
        decimals: Number(decimals),
      });

      // Clear any errors
      setErrors({});
    } catch (error) {
      console.error('Error fetching token details:', error);
      setErrors({
        baseTokenAddress: 'Error fetching token details. Check if this is a valid ERC20 token.',
      });
      setTokenDetails(null);
    } finally {
      setTokenFetching(false);
    }
  };

  // Update deployments when transaction is confirmed
  useEffect(() => {
    if (hash && isConfirmed && chainId) {
      // Get the deployment details from receipt
      const getDeploymentDetails = async () => {
        if (!publicClient) return;

        try {
          await publicClient.getTransactionReceipt({ hash });

          // Check for events to get the new token and lockbox addresses
          // For now, we'll just update the hash and confirmation status
          setDeployments((prev) => ({
            ...prev,
            [chainId]: {
              hash,
              confirmed: true,
            },
          }));
        } catch (error) {
          console.error('Error getting deployment details:', error);
          setDeployments((prev) => ({
            ...prev,
            [chainId]: {
              hash,
              confirmed: true,
            },
          }));
        }
      };

      getDeploymentDetails();
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
    if (activeStep > 0) {
      setActiveStep((prevStep) => prevStep - 1);
    } else {
      router.push('/');
    }
  };

  // Progress to next step
  const handleNext = () => {
    if (activeStep === 0) {
      // Validate first step
      if (!tokenDetails) {
        setErrors({
          baseTokenAddress: 'Please fetch token details before proceeding',
        });
        return;
      }
    } else if (activeStep === 1) {
      // Validate second step
      if (bridges.length === 0) {
        setErrors({
          bridges: 'At least one bridge is required',
        });
        return;
      }

      // Check if all bridge addresses are valid
      const invalidBridge = bridges.find((bridge) => !bridge.address || !/^0x[a-fA-F0-9]{40}$/.test(bridge.address));

      if (invalidBridge) {
        setErrors({
          bridges: 'Invalid bridge address format',
        });
        return;
      }

      // Verify that limits are valid numbers
      const invalidMinterLimit = bridges.find(
        (bridge) => !bridge.mintLimit || isNaN(Number(bridge.mintLimit)) || Number(bridge.mintLimit) <= 0,
      );

      if (invalidMinterLimit) {
        setErrors({
          bridges: 'Invalid minter limit',
        });
        return;
      }

      const invalidBurnerLimit = bridges.find(
        (bridge) => !bridge.burnLimit || isNaN(Number(bridge.burnLimit)) || Number(bridge.burnLimit) <= 0,
      );

      if (invalidBurnerLimit) {
        setErrors({
          bridges: 'Invalid burner limit',
        });
        return;
      }
    }

    // Clear errors and proceed
    setErrors({});
    setActiveStep((prevStep) => prevStep + 1);
  };

  // Add new bridge
  const handleAddBridge = () => {
    const newBridge: Bridge = {
      id: (bridges.length + 1).toString(),
      type: 'SuperchainTokenBridge',
      address: '0x4200000000000000000000000000000000000028',
      mintLimit: '1000000',
      burnLimit: '1000000',
      isCustom: false,
    };

    setBridges([...bridges, newBridge]);
  };

  // Remove a bridge
  const handleRemoveBridge = (id: string) => {
    if (bridges.length > 1) {
      setBridges(bridges.filter((bridge) => bridge.id !== id));
    } else {
      setErrors({
        bridges: 'At least one bridge is required',
      });
    }
  };

  // Update bridge fields
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

  // Deploy the CrosschainERC20 with Lockbox
  const handleDeploy = async () => {
    if (!tokenDetails || !address) return;

    try {
      // Deploy using the factory contract
      writeContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'deployCrosschainERC20WithLockbox',
        args: [
          tokenDetails.name,
          tokenDetails.symbol,
          tokenDetails.decimals,
          bridges.map((bridge) => BigInt(Number(bridge.mintLimit) * 10 ** 18)),
          bridges.map((bridge) => BigInt(Number(bridge.burnLimit) * 10 ** 18)),
          bridges.map((bridge) => bridge.address as `0x${string}`),
          baseTokenAddress as `0x${string}`,
          address,
        ],
      });
    } catch (error) {
      console.error('Error deploying token:', error);
      setErrors({ deployment: 'Error deploying token. Check console for details.' });
    }
  };

  // Deploy on other chain
  const handleDeployOnOtherChain = async () => {
    if (!tokenDetails || !address) return;

    // Get the other chain
    const otherChain = getOtherChain();

    try {
      // First switch to the other chain
      await switchChainAsync({ chainId: otherChain.id });

      // Deploy using the factory contract
      writeContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'deployCrosschainERC20WithLockbox',
        args: [
          tokenDetails.name,
          tokenDetails.symbol,
          tokenDetails.decimals,
          bridges.map((bridge) => BigInt(Number(bridge.mintLimit) * 10 ** 18)),
          bridges.map((bridge) => BigInt(Number(bridge.burnLimit) * 10 ** 18)),
          bridges.map((bridge) => bridge.address as `0x${string}`),
          baseTokenAddress as `0x${string}`,
          address,
        ],
      });
    } catch (error) {
      console.error('Error deploying token on other chain:', error);
      setErrors({ deployment: 'Error deploying token on other chain. Check console for details.' });
    }
  };

  // Show deployment status
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
        <Typography variant='h6' component='h3' sx={{ mb: 2 }}>
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
        {Object.entries(deployments).map(([chainIdStr, { hash: txHash, confirmed, tokenAddress, lockboxAddress }]) => {
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

              {/* Token Address (if available) */}
              {tokenAddress && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant='body2'>Token Address:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Link
                      href={`${getExplorerUrl(tokenAddress, chainNumber).replace('/tx/', '/address/')}`}
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
                      {tokenAddress}
                    </Link>
                    <IconButton size='small' onClick={() => handleCopy(tokenAddress)} sx={{ ml: 1 }}>
                      <ContentCopyIcon fontSize='small' />
                    </IconButton>
                  </Box>
                </Box>
              )}

              {/* Lockbox Address (if available) */}
              {lockboxAddress && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant='body2'>Lockbox Address:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Link
                      href={`${getExplorerUrl(lockboxAddress, chainNumber).replace('/tx/', '/address/')}`}
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
                      {lockboxAddress}
                    </Link>
                    <IconButton size='small' onClick={() => handleCopy(lockboxAddress)} sx={{ ml: 1 }}>
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
              Deploy Same Configuration on {otherChain.id === interop.id ? 'Interop 0' : 'Interop 1'}
            </Button>
            <Typography variant='caption' sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
              This will deploy the same token configuration on the other chain
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Input Token
        return (
          <Box>
            <Typography variant='h6' component='h2' sx={{ mb: 3 }}>
              Input Your ERC20 Token
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id='token-address'
                  label='ERC20 Token Address'
                  placeholder='0x...'
                  value={baseTokenAddress}
                  onChange={(e) => setBaseTokenAddress(e.target.value)}
                  margin='normal'
                  error={!!errors.baseTokenAddress}
                  helperText={errors.baseTokenAddress || 'Enter the address of your existing ERC20 token'}
                  disabled={tokenFetching || isPending || isConfirming}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant='outlined'
                  onClick={fetchTokenDetails}
                  disabled={!baseTokenAddress || tokenFetching || isPending || isConfirming}
                  sx={{ mt: 1 }}
                >
                  {tokenFetching ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Fetching Token Details...
                    </Box>
                  ) : (
                    'Fetch Token Details'
                  )}
                </Button>
              </Grid>

              {tokenDetails && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
                    <Typography variant='subtitle1' fontWeight='medium' sx={{ mb: 2 }}>
                      Token Details
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant='body2' color='text.secondary'>
                          Name:
                        </Typography>
                        <Typography variant='body1'>{tokenDetails.name}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant='body2' color='text.secondary'>
                          Symbol:
                        </Typography>
                        <Typography variant='body1'>{tokenDetails.symbol}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant='body2' color='text.secondary'>
                          Decimals:
                        </Typography>
                        <Typography variant='body1'>{tokenDetails.decimals}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 1: // Configure Settings
        return (
          <Box>
            <Typography variant='h6' component='h2' sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              Configure Bridge Settings
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

                    {/* Custom bridge layout */}
                    {bridge.isCustom && (
                      <>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label='Bridge Address'
                            placeholder='0x...'
                            value={bridge.address}
                            onChange={(e) => handleBridgeChange(bridge.id, 'address', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={2}>
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
                        <Grid item xs={12} sm={2}>
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
                </Paper>
              </Box>
            ))}

            <Button
              startIcon={<AddCircleOutlineIcon />}
              onClick={handleAddBridge}
              sx={{ textTransform: 'none', mb: 2 }}
              disabled={isPending || isConfirming}
            >
              Add Another Bridge
            </Button>
          </Box>
        );

      case 2: // Deploy
        return (
          <Box>
            <Typography variant='h6' component='h2' sx={{ mb: 3 }}>
              Review & Deploy
            </Typography>

            <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
              <Typography variant='subtitle1' fontWeight='medium' sx={{ mb: 2 }}>
                Token Settings
              </Typography>
              {tokenDetails && (
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant='body2' color='text.secondary'>
                      Name:
                    </Typography>
                    <Typography variant='body1'>{tokenDetails.name}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant='body2' color='text.secondary'>
                      Symbol:
                    </Typography>
                    <Typography variant='body1'>{tokenDetails.symbol}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant='body2' color='text.secondary'>
                      Decimals:
                    </Typography>
                    <Typography variant='body1'>{tokenDetails.decimals}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant='body2' color='text.secondary'>
                      Base Token:
                    </Typography>
                    <Typography variant='body1' sx={{ wordBreak: 'break-all' }}>
                      {baseTokenAddress}
                    </Typography>
                  </Grid>
                </Grid>
              )}
            </Paper>

            <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
              <Typography variant='subtitle1' fontWeight='medium' sx={{ mb: 2 }}>
                Bridge Configuration
              </Typography>
              <Box sx={{ mb: 2 }}>
                {bridges.map((bridge, index) => (
                  <Box
                    key={bridge.id}
                    sx={{ mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <Typography variant='subtitle2' fontWeight='medium'>
                      Bridge {index + 1}: {bridge.type}
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12}>
                        <Typography variant='body2' color='text.secondary'>
                          Address:
                        </Typography>
                        <Typography variant='body2' sx={{ wordBreak: 'break-all' }}>
                          {bridge.address}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant='body2' color='text.secondary'>
                          Mint Limit:
                        </Typography>
                        <Typography variant='body2'>{bridge.mintLimit} ETH</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant='body2' color='text.secondary'>
                          Burn Limit:
                        </Typography>
                        <Typography variant='body2'>{bridge.burnLimit} ETH</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </Box>
            </Paper>

            {renderTransactionStatus()}

            {!hash && (
              <Button
                variant='contained'
                fullWidth
                disabled={isPending || isConfirming}
                onClick={handleDeploy}
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
                  'Deploy Crosschain Token'
                )}
              </Button>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Head>
        <title>Upgrade Token | CrosschainERC20 Launchpad</title>
      </Head>
      <Container maxWidth='md' sx={{ py: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={handleBack}
            sx={{ mr: 2 }}
            aria-label={activeStep > 0 ? 'Back to previous step' : 'Back to home'}
            disabled={isPending || isConfirming}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant='h4' component='h1' fontWeight='bold'>
            Upgrade Your Token
          </Typography>
        </Box>

        <Paper sx={{ p: 4 }}>
          {/* Stepper */}
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

          {/* Step content */}
          {renderStepContent(activeStep)}

          {/* Navigation buttons */}
          {activeStep < steps.length - 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
              <Button
                variant='contained'
                onClick={handleNext}
                disabled={isPending || isConfirming || (activeStep === 0 && !tokenDetails)}
                sx={{
                  backgroundColor: '#ff0320',
                  '&:hover': {
                    backgroundColor: '#d60016',
                  },
                }}
              >
                Next
              </Button>
            </Box>
          )}
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

export default UpgradePage;
