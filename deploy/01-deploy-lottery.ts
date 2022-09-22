import { network, ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { developmentChains, networkConfig } from '../helper-hardhat-config'
import { verify } from '../utils/verify'

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther('2')

async function deployLottery({
  getNamedAccounts,
  deployments,
  ethers,
}: HardhatRuntimeEnvironment) {

  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = network.config.chainId!
  let vrfCoordinatorV2Address, subscriptionId

  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2Mock = await ethers.getContract(
      'VRFCoordinatorV2Mock'
    )
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
    const transactionReceipt = await transactionResponse.wait(1)
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
    subscriptionId = transactionReceipt.events![0].args!.subId

    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    )
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
    subscriptionId = networkConfig[chainId].subscriptionId
  }

  const {
    entranceFee,
    gasLane,
    callbackGasLimit,
    interval,
    blockConfirmations,
  } = networkConfig[chainId]

  const args = [
    vrfCoordinatorV2Address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ]

  const lottery = await deploy('Lottery', {
    from: deployer,
    args,
    log: true,
    waitConfirmations: blockConfirmations || 1,
  })

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log('Verifying...')
    await verify(lottery.address, args)
  }

  log('----------------------------------------------------------------------')
}

export default deployLottery

deployLottery.tags = ['all', 'lottery']
