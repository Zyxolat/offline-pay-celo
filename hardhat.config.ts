import "dotenv/config";
import "@nomicfoundation/hardhat-ethers";
import type { HardhatUserConfig } from "hardhat/config";

const privateKey = process.env.PRIVATE_KEY?.trim();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    celo: {
       url: "https://few-misty-telescope.celo-mainnet.quiknode.pro/d35e2e9bb1d68c304aeee0cb859970b0b9fe3992",
      chainId: 42220,
     accounts: privateKey ? [privateKey] : [],
    },
  },
};

export default config;
