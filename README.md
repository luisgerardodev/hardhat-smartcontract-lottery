# Hardhat Lottery Smart Contract

This project uses **Hardhat** to compile, test and deploy a lottery smart contract.

The smart contract uses **Chainlink VRF** to generate a random number and choose a winner. It also uses a **Chainlink Keeper** to automatically check if there's balance and players so it can request a random number and send the balance to the winner.