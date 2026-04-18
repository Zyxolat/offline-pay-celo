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
  defaultNetwork: "celo",
  networks: {
    celo: {
      url: "https://forno.celo.org",
      chainId: 42220,
      accounts: privateKey ? [privateKey] : [],
    },
  },
};

export default config;
