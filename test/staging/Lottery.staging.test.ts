import { assert, expect } from 'chai'
import { BigNumber } from 'ethers'
import { network, getNamedAccounts, deployments, ethers } from 'hardhat'
import { developmentChains } from '../../helper-hardhat-config'
import { Lottery } from '../../typechain-types'

developmentChains.includes(network.name)
  ? describe.skip
  : describe('Lottery Staging Tests', function () {
      let lottery: Lottery,
        lotteryEntranceFee: BigNumber,
        deployer: string,
        interval: BigNumber

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        lottery = await ethers.getContract('Lottery', deployer)
        lotteryEntranceFee = await lottery.getEntranceFee()
        interval = await lottery.getInterval()
      })

      describe('fulfillRandomWords', function () {
        beforeEach(async function () {
          deployer = (await getNamedAccounts()).deployer
          lottery = await ethers.getContract('Lottery', deployer)
          lotteryEntranceFee = await lottery.getEntranceFee()
        })

        it('Should work with live Chainlink Keepers and Chainlink VRF and get a random winner', async function () {
          console.log("Setting up test...")
          const startingTimeStamp = await lottery.getLatestTimeStamp()
          const accounts = await ethers.getSigners()

          console.log("Setting up Listener...")
          await new Promise<void>(async (resolve, reject) => {
            // Setup listener before we enter the lottery
            // Just in case the blockchain moves REALLY fast
            lottery.once('WinnerPicked', async (winner) => {
              console.log('WinnerPicked event fired!')
              try {

                const recentWinner = await lottery.getRecentWinner()
                const lotteryState = await lottery.getLotteryState()
                const winnerEndingBalance = await accounts[0].getBalance()
                const endingTimeStamp = await lottery.getLatestTimeStamp()

                await expect(lottery.getPlayer(0)).to.be.reverted
                assert.equal(recentWinner.toString(), accounts[0].address)
                assert.equal(lotteryState, 0)
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(lotteryEntranceFee).toString()
                )
                assert(endingTimeStamp > startingTimeStamp)

                resolve()
              } catch (error) {
                reject(error)
              }
            })

            // Then entering the lottery
            console.log('Entering Lottery...')
            const tx = await lottery.enterLottery({ value: lotteryEntranceFee })
            await tx.wait(1)
            console.log('Ok, time to wait...')
            const winnerStartingBalance = await accounts[0].getBalance()

          })
        })
      })
    })
