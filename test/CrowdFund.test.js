const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrowdFund", function () {
    let CreatorRegistry, creatorRegistry, CrowdFund, crowdFund, owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        CreatorRegistry = await ethers.getContractFactory("CreatorRegistry");
        creatorRegistry = await CreatorRegistry.deploy();
        await creatorRegistry.deployed();

        CrowdFund = await ethers.getContractFactory("CrowdFund");
        crowdFund = await CrowdFund.deploy(creatorRegistry.address);
        await crowdFund.deployed();

        // Register owner and addr1 as creators
        await creatorRegistry.registerCreator(owner.address);
        await creatorRegistry.registerCreator(addr1.address);
    });

    it("Should allow a registered creator to create a campaign", async function () {
        await expect(crowdFund.createCampaign(10, 30))
            .to.emit(crowdFund, "CampaignLaunched")
            .withArgs(0, owner.address, ethers.utils.parseEther("10"), (await ethers.provider.getBlock('latest')).timestamp + 30 * 86400);
        const campaign = await crowdFund.campaigns(0);
        expect(campaign.creator).to.equal(owner.address);
    });

    it("Should prevent an unregistered user from creating a campaign", async function () {
        await expect(crowdFund.connect(addr2).createCampaign(5, 20)).to.be.revertedWith("Creator not registered");
    });

    it("Should allow users to contribute and change state to Successful", async function () {
        await crowdFund.createCampaign(10, 30); // Campaign ID 0
        await crowdFund.connect(addr1).contribute(0, { value: ethers.utils.parseEther("5") });
        await expect(crowdFund.connect(addr2).contribute(0, { value: ethers.utils.parseEther("5") }))
            .to.emit(crowdFund, "CampaignStateChanged")
            .withArgs(0, 1); // State.Successful is 1
        const campaign = await crowdFund.campaigns(0);
        expect(campaign.totalRaised).to.equal(ethers.utils.parseEther("10"));
    });

    it("Should allow creator to withdraw funds on successful campaign", async function () {
        await crowdFund.createCampaign(1, 1);
        await crowdFund.connect(addr1).contribute(0, { value: ethers.utils.parseEther("1") });

        // Check state is Successful
        const campaignBefore = await crowdFund.campaigns(0);
        expect(campaignBefore.currentState).to.equal(1); // Successful

        const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

        const tx = await crowdFund.withdrawFunds(0);
        const receipt = await tx.wait();
        const gasUsed = receipt.gasUsed.mul(tx.gasPrice);

        const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

        expect(ownerBalanceAfter.add(gasUsed)).to.equal(ownerBalanceBefore.add(ethers.utils.parseEther("1")));

        const campaignAfter = await crowdFund.campaigns(0);
        expect(campaignAfter.currentState).to.equal(3); // Closed
    });
});