import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-deploy'
import 'dotenv/config'

const GOERLI_RPC_URL =
  process.env.GOERLI_RPC_URL || 'https://eth-goerli/example'
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xkey'
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'key'
const LOCAL_RPC_URL = process.env.LOCAL_RPC_URL || 'url'
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || 'key'

const config: HardhatUserConfig = {
  solidity: '0.8.7',
  networks: {
    localhost: {
      url: LOCAL_RPC_URL,
      chainId: 31337
    },
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY!],
      chainId: 5,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: true,
    outputFile: 'gas-report.txt',
    noColors: true,
    currency: 'USD',
    coinmarketcap: COINMARKETCAP_API_KEY,
    token: 'ETH',
  },
  namedAccounts: {
    deployer: {
      default: 0,
      5: 0, // goerli network
      31337: 0, // local hardhat network
    },
    player: {
      default: 1,
    },
  },
  mocha: {
    // timeout: 200000 // 200 seconds max
    timeout: 100000000
  }
}

export default config
