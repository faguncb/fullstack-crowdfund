// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "hardhat/console.sol";

// Interface for the external CreatorRegistry contract
interface ICreatorRegistry {
    function checkIsRegistered(address _creator) external view returns (bool);
}

/**
 * @title CrowdFund
 * @dev A crowdfunding contract with a state machine logic.
 */
contract CrowdFund {
    // State machine for the campaign
    enum State { Fundraising, Successful, Failed, Closed }

    struct Update {
        string message;
        uint256 timestamp;
    }

    struct Campaign {
        address payable creator;
        uint256 goal; // in Wei
        uint256 deadline;
        uint256 totalRaised;
        State currentState;
        mapping(address => uint256) contributions;
        Update[] updates;
    }

    ICreatorRegistry public registry;
    Campaign[] public campaigns;

    // --- Events ---
    event CampaignLaunched(uint256 indexed campaignId, address indexed creator, uint256 goal, uint256 deadline);
    event Contribution(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event FundsWithdrawn(uint256 indexed campaignId, uint256 amount);
    event RefundIssued(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event CampaignStateChanged(uint256 indexed campaignId, State newState);
    event CampaignUpdatePosted(uint256 indexed campaignId, string message, uint256 timestamp);

    constructor(address _registryAddress) {
        registry = ICreatorRegistry(_registryAddress);
    }

    /**
     * @dev Creates a new campaign.
     * INTERACTION: Calls the external registry contract to verify the creator.
     */
    function createCampaign(uint256 _goalInEther, uint256 _durationInDays) external {
        require(registry.checkIsRegistered(msg.sender), "Creator not registered");

        uint256 goalInWei = _goalInEther * 1 ether;
        uint256 deadline = block.timestamp + (_durationInDays * 1 days);

        Campaign storage newCampaign = campaigns.push();
        newCampaign.creator = payable(msg.sender);
        newCampaign.goal = goalInWei;
        newCampaign.deadline = deadline;
        newCampaign.currentState = State.Fundraising; // Initial state

        uint256 campaignId = campaigns.length - 1;
        emit CampaignLaunched(campaignId, msg.sender, goalInWei, deadline);
    }

    /**
     * @dev Allows users to contribute ETH to a campaign.
     * PAYABLE: This function receives ETH.
     */
    function contribute(uint256 _campaignId) external payable {
        Campaign storage campaign = campaigns[_campaignId];

        // State machine check
        require(campaign.currentState == State.Fundraising, "Campaign is not active");
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        require(msg.value > 0, "Contribution must be greater than 0");

        campaign.contributions[msg.sender] += msg.value;
        campaign.totalRaised += msg.value;

        emit Contribution(_campaignId, msg.sender, msg.value);

        // State transition check
        if (campaign.totalRaised >= campaign.goal) {
            campaign.currentState = State.Successful;
            emit CampaignStateChanged(_campaignId, State.Successful);
        }
    }

    /**
     * @dev Manually checks if a campaign has passed its deadline without meeting the goal.
     */
    function checkUpkeep(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.currentState == State.Fundraising, "Campaign not in Fundraising state");
        require(block.timestamp >= campaign.deadline, "Campaign deadline not reached yet");

        // State transition to Failed
        campaign.currentState = State.Failed;
        emit CampaignStateChanged(_campaignId, State.Failed);
    }

    /**
     * @dev Allows the creator to withdraw funds if the campaign was successful.
     */
    function withdrawFunds(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "Only the creator can withdraw");
        require(campaign.currentState == State.Successful, "Campaign was not successful");

        uint256 amount = campaign.totalRaised;
        campaign.currentState = State.Closed; // Final state

        emit CampaignStateChanged(_campaignId, State.Closed);
        emit FundsWithdrawn(_campaignId, amount);

        (bool success, ) = campaign.creator.call{value: amount}("");
        require(success, "Failed to send funds");
    }

    /**
     * @dev Allows contributors to get a refund if the campaign failed.
     */
    function getRefund(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.currentState == State.Failed, "Campaign was not a failure");

        uint256 refundAmount = campaign.contributions[msg.sender];
        require(refundAmount > 0, "No contribution to refund");

        campaign.contributions[msg.sender] = 0; // Prevent re-entrancy

        emit RefundIssued(_campaignId, msg.sender, refundAmount);

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund failed");
    }

    /**
     * @dev Allows the creator to post an update to their campaign.
     */
    function postUpdate(uint256 _campaignId, string calldata _message) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "Only the creator can post updates");
        require(bytes(_message).length > 0, "Update message cannot be empty");
        require(bytes(_message).length <= 500, "Update message too long");

        campaign.updates.push(Update({
            message: _message,
            timestamp: block.timestamp
        }));

        emit CampaignUpdatePosted(_campaignId, _message, block.timestamp);
    }

    // --- View Functions ---
    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    function getUpdateCount(uint256 _campaignId) external view returns (uint256) {
        return campaigns[_campaignId].updates.length;
    }

    function getUpdate(uint256 _campaignId, uint256 _updateIndex) external view returns (string memory message, uint256 timestamp) {
        require(_updateIndex < campaigns[_campaignId].updates.length, "Update index out of bounds");
        Update storage update = campaigns[_campaignId].updates[_updateIndex];
        return (update.message, update.timestamp);
    }
}