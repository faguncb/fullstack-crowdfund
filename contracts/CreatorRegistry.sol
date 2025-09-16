// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "hardhat/console.sol";

/**
 * @title CreatorRegistry
 * @dev A simple contract to register and verify creator addresses.
 * The owner of the contract is the only one who can add new creators.
 */
contract CreatorRegistry {
    address public owner;
    mapping(address => bool) public isRegistered;

    event CreatorRegistered(address indexed creator);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    function registerCreator(address _creator) external onlyOwner {
        require(_creator != address(0), "Invalid creator address");
        isRegistered[_creator] = true;
        emit CreatorRegistered(_creator);
    }

    function checkIsRegistered(address _creator) external view returns (bool) {
        return isRegistered[_creator];
    }
}