import Head from 'next/head';
import { Landing } from '~/containers';

const Home = () => {
  return (
    <>
      <Head>
        <title>CrosschainERC20 Launchpad | ERC-7281 and ERC-7802 Implementation</title>
        <meta
          name='description'
          content='Deploy cross-chain compatible ERC20 tokens with ERC-7281 and ERC-7802 standards. Seamless cross-chain bridging capabilities.'
        />
      </Head>
      <Landing />
    </>
  );
};

export default Home;
