import { assert, expect } from 'chai'
import { BigNumber } from 'ethers'
import { network, getNamedAccounts, deployments, ethers } from 'hardhat'
import { developmentChains, networkConfig } from '../../helper-hardhat-config'
import { Lottery, VRFCoordinatorV2Mock } from '../../typechain-types'

!developmentChains.includes(network.name)
  ? describe.skip
  : describe('Lottery Unit Tests', function () {
      let lottery: Lottery, vrfCoordinatorV2Mock: VRFCoordinatorV2Mock, subscriptionId: number, lotteryEntranceFee: BigNumber, deployer: string, interval: BigNumber
      const chainId = network.config.chainId!

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(['all'])
        lottery = await ethers.getContract('Lottery', deployer)
        vrfCoordinatorV2Mock = await ethers.getContract(
          'VRFCoordinatorV2Mock',
          deployer
        )

        lotteryEntranceFee = await lottery.getEntranceFee()
        interval = await lottery.getInterval()
      })

      describe('constructor', function () {
        it('Should initialize the lottery correctly', async function () {
          const lotteryState = await lottery.getLotteryState()
          const interval = await lottery.getInterval()

          assert.equal(lotteryState.toString(), '0')
          assert.equal(
            interval.toString(),
            `${networkConfig[chainId].interval}`
          )
        })
      })

      describe('enter lottery', function () {
        it("Should revert when you don't pay enough", async function () {
          await expect(lottery.enterLottery()).to.be.revertedWithCustomError(lottery, 'Lottery__NotEnouthETHEntered')
        })

        it('Should record players when they enter', async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          const playerFromContract = await lottery.getPlayer(0)
          assert.equal(playerFromContract, deployer)
        })

        it('Should emit event on enter', async function () {
          await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.emit(lottery, 'LotteryEntered')
        })

        it('Should not allow entrance when lottery is calculating', async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
          await network.provider.send('evm_mine', [])
          // Pretend to be Chainlink Keeper
          await lottery.performUpkeep([])
          await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.be.revertedWithCustomError(lottery, 'Lottery__NotOpen')
        })
      })

      describe('checkUpkeep', function () {
        it('Should return false if people have not sent any ETH', async function () {
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
          await network.provider.send('evm_mine', [])  
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
          assert(!upkeepNeeded)
        })

        it('Should return false if lottery is not open', async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
          await network.provider.send('evm_mine', [])  
          await lottery.performUpkeep([])
          const lotteryState = await lottery.getLotteryState()
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
          assert.equal(lotteryState.toString(), '1')
          assert.equal(upkeepNeeded, false)
        })

        it('Should return false if enough time has not passed', async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send('evm_increaseTime', [interval.toNumber() - 1])
          await network.provider.send('evm_mine', [])
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
          assert.equal(upkeepNeeded, false)
        })

        it('Should return true if enough time has passed, has players, eth, and is open', async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
          await network.provider.send('evm_mine', [])  
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
          assert.equal(upkeepNeeded, true)
        })
      })

      describe('performUpkeep', function () {
        it('Should only run if checkUpkeep is true', async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
          await network.provider.send('evm_mine', [])
          const tx = await lottery.performUpkeep([])
          assert(tx)
        })
        it('Should revert when checkUpkeep is false', async function () {
          await expect(lottery.performUpkeep([])).to.be.revertedWithCustomError(lottery, 'Lottery__UpkeepNotNeeded')
        })
        it('Should update the raffle state, emit an event, and call the vrf coordinator', async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1])
          await network.provider.send('evm_mine', [])

          const txResponse = await lottery.performUpkeep([])
          const txReceipt = await txResponse.wait(1)

          const requestId = txReceipt.events![1].args!.requestId
          const lotteryState = await lottery.getLotteryState()

          assert(requestId.toNumber() > 0)
          assert(lotteryState === 1)
        })
        // it('Should ', async function () {})
      })

      describe('fulfillRandomWords', function() {
        beforeEach(async function() {
          await lottery.enterLottery({ value: lotteryEntranceFee })
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 5])
          await network.provider.send('evm_mine', [])
        })

        it('Should only be called after performUpkeep', async function () {
          await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)).to.be.revertedWith('nonexistent request')
          await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)).to.be.revertedWith('nonexistent request')
        })

        //way big test
        it('Should pick a winner, reset the lottery, and send money', async function () {
          const additionalEntrants = 3
          const startingAccountIndex = 2 // deployer = 0
          const accounts = await ethers.getSigners()
          for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
            lottery = lottery.connect(accounts[i])
            await lottery.enterLottery({ value: lotteryEntranceFee })
          }
          const startingTimeStamp = await lottery.getLatestTimeStamp()

          await new Promise<void>(async (resolve, reject) => {
            lottery.once('WinnerPicked', async () => {
              console.log('WinnerPicked event fired!')
              try {

                const recentWinner = await lottery.getRecentWinner()
                const lotteryState = await lottery.getLotteryState()
                const winnerEndingBalance = await accounts[2].getBalance()
                const endingTimeStamp = await lottery.getLatestTimeStamp()

                await expect(lottery.getPlayer(0)).to.be.reverted

                assert.equal(recentWinner.toString(), accounts[2].address)
                assert.equal(lotteryState, 0)
                assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(lotteryEntranceFee.mul(additionalEntrants).add(lotteryEntranceFee)).toString(), '0')
                assert(endingTimeStamp > startingTimeStamp)

                resolve()
              } catch (error) {
                reject(error)
              }
            })

            let winnerStartingBalance: BigNumber

            try {
              
              const tx = await lottery.performUpkeep([])
              const txReceipt = await tx.wait(1)
              winnerStartingBalance = await accounts[2].getBalance()
  
              await vrfCoordinatorV2Mock.fulfillRandomWords(
                txReceipt!.events![1].args!.requestId,
                lottery.address
              )
            } catch (error) {
              console.log(error)
            }

          })

        })
      })
    })
