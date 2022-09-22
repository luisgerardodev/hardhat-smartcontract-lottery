import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'

export interface networkConfigItem {
  name?: string
  vrfCoordinatorV2?: string
  entranceFee?: number | BigNumber
  gasLane?: string
  subscriptionId?: string
  callbackGasLimit?: string
  interval?: string,
  blockConfirmations?: number
}

export interface networkConfigInfo {
  [key: string]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
  localhost: {},
  // hardhat: {},
  '5': {
    name: 'goerli',
    vrfCoordinatorV2: '0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D',
    entranceFee: ethers.utils.parseEther('0.01'),
    gasLane: '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15',
    subscriptionId: `${process.env.GOERLI_VRF_SUBSCRIPTION_ID}`,
    callbackGasLimit: '500000',
    interval: '30',
    blockConfirmations: 6,
  },
  '31337': {
    name: 'hardhat',
    entranceFee: ethers.utils.parseEther('0.01'),
    gasLane: '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15',
    callbackGasLimit: '500000',
    interval: '30',
    blockConfirmations: 1,
  },
}

export const developmentChains = ['hardhat', 'localhost']

export const DECIMALS = 8
