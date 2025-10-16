const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

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
            .withArgs(0, owner.address, ethers.utils.parseEther("10"), anyValue);
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

    it("Should allow refund after failed campaign via checkUpkeep", async function () {
        await crowdFund.createCampaign(1, 0); // immediate deadline
        // advance time by 1 second
        await ethers.provider.send("evm_increaseTime", [2]);
        await ethers.provider.send("evm_mine");

        // move to Failed
        await expect(crowdFund.checkUpkeep(0))
            .to.emit(crowdFund, "CampaignStateChanged")
            .withArgs(0, 2); // Failed

        // contribute before failure shouldn't be possible, so instead we simulate a new campaign
        await crowdFund.createCampaign(1, 1); // id 1
        await crowdFund.connect(addr1).contribute(1, { value: ethers.utils.parseEther("0.5") });
        // time passes to fail
        await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");
        await crowdFund.checkUpkeep(1);

        const balBefore = await ethers.provider.getBalance(addr1.address);
        const refundTx = await crowdFund.connect(addr1).getRefund(1);
        const refundRcpt = await refundTx.wait();
        const refundGas = refundRcpt.gasUsed.mul(refundTx.gasPrice);
        const balAfter = await ethers.provider.getBalance(addr1.address);
        expect(balAfter.add(refundGas)).to.equal(balBefore.add(ethers.utils.parseEther("0.5")));
    });

    describe("Campaign Updates", function () {
        it("Should allow creator to post updates", async function () {
            await crowdFund.createCampaign(10, 30); // Campaign ID 0
            const updateMessage = "First milestone achieved!";
            
            await expect(crowdFund.postUpdate(0, updateMessage))
                .to.emit(crowdFund, "CampaignUpdatePosted")
                .withArgs(0, updateMessage, anyValue);

            const updateCount = await crowdFund.getUpdateCount(0);
            expect(updateCount).to.equal(1);

            const [message, timestamp] = await crowdFund.getUpdate(0, 0);
            expect(message).to.equal(updateMessage);
            expect(timestamp).to.be.gt(0);
        });

        it("Should prevent non-creator from posting updates", async function () {
            await crowdFund.createCampaign(10, 30); // Campaign ID 0
            await expect(crowdFund.connect(addr2).postUpdate(0, "Unauthorized update"))
                .to.be.revertedWith("Only the creator can post updates");
        });

        it("Should reject empty update messages", async function () {
            await crowdFund.createCampaign(10, 30);
            await expect(crowdFund.postUpdate(0, ""))
                .to.be.revertedWith("Update message cannot be empty");
        });

        it("Should reject updates longer than 500 characters", async function () {
            await crowdFund.createCampaign(10, 30);
            const longMessage = "a".repeat(501);
            await expect(crowdFund.postUpdate(0, longMessage))
                .to.be.revertedWith("Update message too long");
        });

        it("Should allow multiple updates in chronological order", async function () {
            await crowdFund.createCampaign(10, 30);
            
            await crowdFund.postUpdate(0, "Update 1");
            await crowdFund.postUpdate(0, "Update 2");
            await crowdFund.postUpdate(0, "Update 3");

            const updateCount = await crowdFund.getUpdateCount(0);
            expect(updateCount).to.equal(3);

            const [msg1] = await crowdFund.getUpdate(0, 0);
            const [msg2] = await crowdFund.getUpdate(0, 1);
            const [msg3] = await crowdFund.getUpdate(0, 2);

            expect(msg1).to.equal("Update 1");
            expect(msg2).to.equal("Update 2");
            expect(msg3).to.equal("Update 3");
        });

        it("Should revert when accessing invalid update index", async function () {
            await crowdFund.createCampaign(10, 30);
            await crowdFund.postUpdate(0, "Single update");
            
            await expect(crowdFund.getUpdate(0, 1))
                .to.be.revertedWith("Update index out of bounds");
        });
    });
});