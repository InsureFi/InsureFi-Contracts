require("dotenv").config();

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@openzeppelin/hardhat-upgrades");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const mnemonic = process.env.MNEMONIC || "";
module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    crotestnet: {
      url: "https://cronos-testnet-3.crypto.org:8545",
      chainId: 338,
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0",
        inittialIndex: 0,
        count: 10,
      },
    },
    localhost: {
      url: `http://localhost:8545`,
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0",
        inittialIndex: 0,
        count: 10,
      },
      timeout: 150000,
    },
    cromainnet: {
      url: "https://mmf-rpc.xstaking.sg",
      chainId: 25,
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0",
        inittialIndex: 0,
        count: 10,
      },
    },
    bscmainnet: {
      url: "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0",
        inittialIndex: 0,
        count: 10,
      },
    },
    polygon: {
      url: "https://polygon-rpc.com",
      chainId: 137,
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0",
        inittialIndex: 0,
        count: 10,
      },
    },
    hardhat: {
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0",
        inittialIndex: 0,
        count: 10,
      },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  mocha: {
    timeout: 40000,
  },
};
