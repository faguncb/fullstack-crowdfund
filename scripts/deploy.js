const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy CreatorRegistry
    const CreatorRegistry = await hre.ethers.getContractFactory("CreatorRegistry");
    const creatorRegistry = await CreatorRegistry.deploy();
    await creatorRegistry.deployed();
    console.log("CreatorRegistry deployed to:", creatorRegistry.address);

    // 2. Deploy CrowdFund, passing the registry's address
    const CrowdFund = await hre.ethers.getContractFactory("CrowdFund");
    const crowdFund = await CrowdFund.deploy(creatorRegistry.address);
    await crowdFund.deployed();
    console.log("CrowdFund deployed to:", crowdFund.address);

    // 3. (Optional) Register the deployer as a creator for easy testing
    console.log("Registering deployer as a creator...");
    const tx = await creatorRegistry.registerCreator(deployer.address);
    await tx.wait();
    console.log("Deployer registered as a creator successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});