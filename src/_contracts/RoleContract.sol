// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RoleContract {
    address public wallet;

    mapping(address => uint8) private _roles;

    event RoleSet(address indexed user, uint8 roleLevel);
    event RoleRemoved(address indexed user);

    modifier onlyWallet() {
        require(msg.sender == wallet, "Only wallet");
        _;
    }

    constructor(address _wallet) {
        wallet = _wallet;
    }

    function setRole(address user, uint8 roleLevel) external onlyWallet {
        require(user != address(0), "Invalid address");
        require(roleLevel > 0, "Role level must be > 0");
        _roles[user] = roleLevel;
        emit RoleSet(user, roleLevel);
    }

    function removeRole(address user) external onlyWallet {
        delete _roles[user];
        emit RoleRemoved(user);
    }

    function getRole(address user) external view returns (uint8) {
        return _roles[user];
    }

    function hasMinRole(address user, uint8 minLevel) external view returns (bool) {
        return _roles[user] >= minLevel;
    }
}
