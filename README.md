# FundVerse: A Full-Stack Decentralized Crowdfunding dApp

FundVerse is a complete decentralized application (dApp) built on the Ethereum blockchain. It allows registered creators to launch crowdfunding campaigns and enables users to contribute Ether (ETH) to support them.

This project serves as a comprehensive example of modern dApp development, incorporating a state machine, ETH handling, external contract interactions, and real-time frontend updates via blockchain events.

![FundVerse Screenshot](https://i.imgur.com/example.png) ## Core Features

* **State Machine Logic**: Campaigns transition through distinct states (`Fundraising`, `Successful`, `Failed`, `Closed`), ensuring robust and predictable behavior.
* **Payable Functions**: The smart contract can securely receive and send ETH for contributions, creator withdrawals, and contributor refunds.
* **External Contract Interaction**: The main contract communicates with a separate `CreatorRegistry` contract to authorize who can create campaigns, demonstrating contract composability.
* **Event-Driven Frontend**: The React frontend listens for on-chain events emitted by the smart contract and updates the UI in real-time, providing a transparent user experience.

## Tech Stack

* **Blockchain**: Solidity, Hardhat
* **Frontend**: React.js, Ethers.js
* **Testing**: Chai, Hardhat Network Helpers

## Project Structure

```
/
├── contracts/        # Solidity smart contracts (CrowdFund.sol, CreatorRegistry.sol)
├── scripts/          # Deployment scripts (deploy.js)
├── test/             # Test files for the smart contracts
├── frontend/         # React application for the user interface
├── hardhat.config.js # Hardhat configuration
└── package.json
```

## Local Development Setup

### Prerequisites

* Node.js (v16 or later)
* NPM
* MetaMask browser extension

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd fullstack-crowdfund
    ```

2.  **Install backend dependencies:**
    ```bash
    npm install
    ```

3.  **Install frontend dependencies:**
    ```bash
    cd frontend
    npm install
    ```

### Running the Application

1.  **Start a local Hardhat blockchain node.**
    * Open a terminal in the project root.
    ```bash
    npx hardhat node
    ```
    This will start a local blockchain and provide a list of accounts with private keys.

2.  **Deploy the smart contracts.**
    * Open a *second* terminal in the project root.
    ```bash
    npx hardhat run scripts/deploy.js --network localhost
    ```
    * **Important:** Copy the deployed `CrowdFund` and `CreatorRegistry` contract addresses from the terminal output.

3.  **Configure the frontend.**
    * Open `frontend/src/App.js`.
    * Paste the copied contract addresses into the `crowdFundAddress` and `creatorRegistryAddress` constants at the top of the file.

4.  **Start the React application.**
    * Open a *third* terminal, navigate to the `frontend` directory.
    ```bash
    cd frontend
    npm start
    ```
    Your browser will open the dApp at `http://localhost:3000`.

5.  **Configure MetaMask.**
    * Add a new network with the following details:
        * **Network Name**: Hardhat Localhost
        * **RPC URL**: `http://127.0.0.1:8545/`
        * **Chain ID**: `31337`
    * Import an account using one of the private keys provided by the `npx hardhat node` command.

You are now ready to interact with the FundVerse dApp on your local blockchain!