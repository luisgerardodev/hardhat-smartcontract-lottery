import { ethers, network } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { developmentChains } from '../helper-hardhat-config'
import { VRFCoordinatorV2Mock } from '../typechain-types'

const BASE_FEE = ethers.utils.parseEther('0.25')
const GAS_PRICE_LINK = 1e9 // link per gas. calculated value base on the gas price of the chain
const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

async function deployMocks({
  getNamedAccounts,
  deployments,
}: HardhatRuntimeEnvironment) {
  const { deploy, log } = deployments

  const { deployer } = await getNamedAccounts()

  if (developmentChains.includes(network.name)) {
    log('Local network detected! Deploying mocks...')

    await deploy('VRFCoordinatorV2Mock', {
      from: deployer,
      args: [BASE_FEE, GAS_PRICE_LINK],
      log: true
    })

  }

  log('Mocks Deployed!')
  log('---------------------------------------------------------------')
}

export default deployMocks

deployMocks.tags = ['all', 'mocks']