const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CreatorRegistry", function () {
    let CreatorRegistry, registry, owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        CreatorRegistry = await ethers.getContractFactory("CreatorRegistry");
        registry = await CreatorRegistry.deploy();
        await registry.deployed();
    });

    it("sets the deployer as owner", async function () {
        expect(await registry.owner()).to.equal(owner.address);
    });

    it("owner can register creators and emits event", async function () {
        await expect(registry.registerCreator(addr1.address))
            .to.emit(registry, "CreatorRegistered")
            .withArgs(addr1.address);
        expect(await registry.checkIsRegistered(addr1.address)).to.equal(true);
    });

    it("non-owner cannot register creators", async function () {
        await expect(registry.connect(addr1).registerCreator(addr2.address))
            .to.be.revertedWith("Only owner can perform this action");
    });

    it("rejects zero address", async function () {
        await expect(registry.registerCreator(ethers.constants.AddressZero))
            .to.be.revertedWith("Invalid creator address");
    });
});


