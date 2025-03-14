import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { rainbowWallet, walletConnectWallet, injectedWallet } from '@rainbow-me/rainbowkit/wallets';
import { defineChain } from 'viem';
import { createConfig, http, cookieStorage, createStorage } from 'wagmi';
import { getConfig } from '~/config';

const { PROJECT_ID } = getConfig().env;

const getWallets = () => {
  if (PROJECT_ID) {
    return [injectedWallet, rainbowWallet, walletConnectWallet];
  } else {
    return [injectedWallet];
  }
};

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: getWallets(),
    },
  ],
  {
    appName: 'CrosschainERC20 Launchpad',
    projectId: PROJECT_ID,
  },
);

export const interop = defineChain({
  id: 420120000,
  name: 'Interop 0',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://interop-alpha-0.optimism.io'] },
  },
  blockExplorers: {
    default: { name: 'Blockscan', url: 'https://optimism-interop-alpha-0.blockscout.com' },
  },
});

export const interop1 = defineChain({
  id: 420120001,
  name: 'Interop 1',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://interop-alpha-1.optimism.io'] },
  },
  blockExplorers: {
    default: { name: 'Blockscan', url: 'https://optimism-interop-alpha-1.blockscout.com' },
  },
});

export const config = createConfig({
  chains: [interop, interop1],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    [interop.id]: http(),
    [interop1.id]: http(),
  },
  batch: { multicall: true },
  connectors,
});
