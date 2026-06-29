// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.2/contracts/utils/ReentrancyGuard.sol";
import "./RoleContract.sol";
import "./RuleContract.sol";
import "./PolicyVerificationContract.sol";

contract MultiSigWallet is ReentrancyGuard {

    // ───────────────────────────── Events ─────────────────────────────

    event Deposit(address indexed sender, uint amount, uint balance);

    event TransactionSubmitted(uint indexed txIndex, address indexed proposer, address to, uint value);
    event TransactionConfirmed(uint indexed txIndex, address indexed owner);
    event TransactionRevoked(uint indexed txIndex, address indexed owner);
    event TransactionExecuted(uint indexed txIndex);
    event TransactionFailed(uint indexed txIndex);
    event PolicyRejected(uint indexed txIndex);

    event ManagementSubmitted(uint indexed mgmtIndex, address indexed proposer, ManagementType txType);
    event ManagementConfirmed(uint indexed mgmtIndex, address indexed owner);
    event ManagementRevoked(uint indexed mgmtIndex, address indexed owner);
    event ManagementExecuted(uint indexed mgmtIndex);

    // ──────────────────────────── Sub-contracts ────────────────────────

    RoleContract public roleContract;
    RuleContract public ruleContract;
    PolicyVerificationContract public policyContract;

    // ──────────────────────────── Owners ──────────────────────────────

    address[] public owners;
    mapping(address => bool) public isOwner;
    mapping(address => uint) private ownerIndex;
    uint public threshold;

    // ──────────────────────────── Transactions ────────────────────────

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        bool policyFailed;
        uint confirmCount;
    }

    Transaction[] public transactions;
    mapping(uint => mapping(address => bool)) public confirmations;

    // ──────────────────────────── Management ─────────────────────────

    enum ManagementType {
        AddOwner,        // targetAddress + roleLevel
        RemoveOwner,     // targetAddress
        ChangeThreshold, // newThreshold
        SetRole,         // targetAddress + roleLevel
        AddRule,         // ruleValueThreshold + ruleRoleLevel + ruleCount
        RemoveRule       // ruleIndex
    }

    struct ManagementTransaction {
        ManagementType txType;
        address targetAddress;
        uint8 roleLevel;
        uint newThreshold;
        uint256 ruleValueThreshold;
        uint8 ruleRoleLevel;
        uint8 ruleCount;
        uint ruleIndex;
        bool executed;
        uint confirmCount;
    }

    ManagementTransaction[] public managementTransactions;
    mapping(uint => mapping(address => bool)) public mgmtConfirmations;

    // ──────────────────────────── Modifiers ───────────────────────────

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    modifier txExists(uint txIndex) {
        require(txIndex < transactions.length, "Tx does not exist");
        _;
    }

    modifier notExecuted(uint txIndex) {
        require(!transactions[txIndex].executed, "Tx already executed");
        _;
    }

    modifier notConfirmed(uint txIndex) {
        require(!confirmations[txIndex][msg.sender], "Already confirmed");
        _;
    }

    modifier mgmtExists(uint mgmtIndex) {
        require(mgmtIndex < managementTransactions.length, "Mgmt tx does not exist");
        _;
    }

    modifier mgmtNotExecuted(uint mgmtIndex) {
        require(!managementTransactions[mgmtIndex].executed, "Mgmt tx already executed");
        _;
    }

    modifier mgmtNotConfirmed(uint mgmtIndex) {
        require(!mgmtConfirmations[mgmtIndex][msg.sender], "Already confirmed");
        _;
    }

    // ──────────────────────────── Constructor ─────────────────────────

    /**
     * @param _owners 초기 소유자 주소 목록
     * @param _roleLevels 각 소유자의 초기 직급 레벨 (1이상, _owners와 동일한 순서)
     * @param _threshold M-of-N 임계값
     */
    constructor(
        address[] memory _owners,
        uint8[] memory _roleLevels,
        uint _threshold
    ) {
        require(_owners.length > 0, "Owners required");
        require(_owners.length == _roleLevels.length, "Owners and roles length mismatch");
        require(_threshold > 0 && _threshold <= _owners.length, "Invalid threshold");

        // 서브 컨트랙트 배포
        roleContract = new RoleContract(address(this));
        ruleContract = new RuleContract(address(this));
        policyContract = new PolicyVerificationContract(address(roleContract), address(ruleContract));

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner address");
            require(!isOwner[owner], "Duplicate owner");
            require(_roleLevels[i] > 0, "Role level must be > 0");

            isOwner[owner] = true;
            ownerIndex[owner] = owners.length;
            owners.push(owner);

            roleContract.setRole(owner, _roleLevels[i]);
        }

        threshold = _threshold;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // ──────────────────────────── Financial Transactions ──────────────

    function submitTransaction(address to, uint value, bytes calldata data) external onlyOwner {
        uint txIndex = transactions.length;
        transactions.push(Transaction({
            to: to,
            value: value,
            data: data,
            executed: false,
            policyFailed: false,
            confirmCount: 0
        }));
        emit TransactionSubmitted(txIndex, msg.sender, to, value);
    }

    function confirmTransaction(uint txIndex)
        external
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
        notConfirmed(txIndex)
        nonReentrant
    {
        confirmations[txIndex][msg.sender] = true;
        transactions[txIndex].confirmCount++;
        emit TransactionConfirmed(txIndex, msg.sender);

        if (transactions[txIndex].confirmCount >= threshold) {
            _tryExecute(txIndex);
        }
    }

    function revokeConfirmation(uint txIndex)
        external
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
    {
        require(confirmations[txIndex][msg.sender], "Not confirmed by you");
        confirmations[txIndex][msg.sender] = false;
        transactions[txIndex].confirmCount--;
        emit TransactionRevoked(txIndex, msg.sender);
    }

    function _tryExecute(uint txIndex) internal {
        Transaction storage txn = transactions[txIndex];

        // 서명자 목록 수집
        address[] memory signers = _getSigners(txIndex);

        // 정책 검증
        bool passed = policyContract.verify(txn.value, signers);
        if (!passed) {
            txn.policyFailed = true;
            emit PolicyRejected(txIndex);
            return;
        }

        // 실행
        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        if (success) {
            txn.executed = true;
            emit TransactionExecuted(txIndex);
        } else {
            emit TransactionFailed(txIndex);
        }
    }

    function _getSigners(uint txIndex) internal view returns (address[] memory) {
        uint count = 0;
        for (uint i = 0; i < owners.length; i++) {
            if (confirmations[txIndex][owners[i]]) count++;
        }
        address[] memory signers = new address[](count);
        uint j = 0;
        for (uint i = 0; i < owners.length; i++) {
            if (confirmations[txIndex][owners[i]]) signers[j++] = owners[i];
        }
        return signers;
    }

    // ──────────────────────────── Management Transactions ─────────────

    function proposeAddOwner(address newOwner, uint8 roleLevel) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        require(!isOwner[newOwner], "Already an owner");
        require(roleLevel > 0, "Invalid role level");

        _pushMgmt(ManagementTransaction({
            txType: ManagementType.AddOwner,
            targetAddress: newOwner,
            roleLevel: roleLevel,
            newThreshold: 0,
            ruleValueThreshold: 0,
            ruleRoleLevel: 0,
            ruleCount: 0,
            ruleIndex: 0,
            executed: false,
            confirmCount: 0
        }));
    }

    function proposeRemoveOwner(address ownerToRemove) external onlyOwner {
        require(isOwner[ownerToRemove], "Not an owner");
        require(owners.length > 1, "Cannot remove last owner");

        _pushMgmt(ManagementTransaction({
            txType: ManagementType.RemoveOwner,
            targetAddress: ownerToRemove,
            roleLevel: 0,
            newThreshold: 0,
            ruleValueThreshold: 0,
            ruleRoleLevel: 0,
            ruleCount: 0,
            ruleIndex: 0,
            executed: false,
            confirmCount: 0
        }));
    }

    function proposeChangeThreshold(uint newThreshold) external onlyOwner {
        require(newThreshold > 0 && newThreshold <= owners.length, "Invalid threshold");
        require(newThreshold != threshold, "Same as current");

        _pushMgmt(ManagementTransaction({
            txType: ManagementType.ChangeThreshold,
            targetAddress: address(0),
            roleLevel: 0,
            newThreshold: newThreshold,
            ruleValueThreshold: 0,
            ruleRoleLevel: 0,
            ruleCount: 0,
            ruleIndex: 0,
            executed: false,
            confirmCount: 0
        }));
    }

    function proposeSetRole(address target, uint8 roleLevel) external onlyOwner {
        require(isOwner[target], "Not an owner");
        require(roleLevel > 0, "Invalid role level");

        _pushMgmt(ManagementTransaction({
            txType: ManagementType.SetRole,
            targetAddress: target,
            roleLevel: roleLevel,
            newThreshold: 0,
            ruleValueThreshold: 0,
            ruleRoleLevel: 0,
            ruleCount: 0,
            ruleIndex: 0,
            executed: false,
            confirmCount: 0
        }));
    }

    function proposeAddRule(
        uint256 valueThreshold,
        uint8 requiredRoleLevel,
        uint8 requiredCount
    ) external onlyOwner {
        require(requiredRoleLevel > 0, "Invalid role level");
        require(requiredCount > 0, "Count must be > 0");

        _pushMgmt(ManagementTransaction({
            txType: ManagementType.AddRule,
            targetAddress: address(0),
            roleLevel: 0,
            newThreshold: 0,
            ruleValueThreshold: valueThreshold,
            ruleRoleLevel: requiredRoleLevel,
            ruleCount: requiredCount,
            ruleIndex: 0,
            executed: false,
            confirmCount: 0
        }));
    }

    function proposeRemoveRule(uint ruleIndex) external onlyOwner {
        _pushMgmt(ManagementTransaction({
            txType: ManagementType.RemoveRule,
            targetAddress: address(0),
            roleLevel: 0,
            newThreshold: 0,
            ruleValueThreshold: 0,
            ruleRoleLevel: 0,
            ruleCount: 0,
            ruleIndex: ruleIndex,
            executed: false,
            confirmCount: 0
        }));
    }

    function confirmManagement(uint mgmtIndex)
        external
        onlyOwner
        mgmtExists(mgmtIndex)
        mgmtNotExecuted(mgmtIndex)
        mgmtNotConfirmed(mgmtIndex)
        nonReentrant
    {
        mgmtConfirmations[mgmtIndex][msg.sender] = true;
        managementTransactions[mgmtIndex].confirmCount++;
        emit ManagementConfirmed(mgmtIndex, msg.sender);

        if (managementTransactions[mgmtIndex].confirmCount >= threshold) {
            _executeManagement(mgmtIndex);
        }
    }

    function revokeManagementConfirmation(uint mgmtIndex)
        external
        onlyOwner
        mgmtExists(mgmtIndex)
        mgmtNotExecuted(mgmtIndex)
    {
        require(mgmtConfirmations[mgmtIndex][msg.sender], "Not confirmed by you");
        mgmtConfirmations[mgmtIndex][msg.sender] = false;
        managementTransactions[mgmtIndex].confirmCount--;
        emit ManagementRevoked(mgmtIndex, msg.sender);
    }

    function _executeManagement(uint mgmtIndex) internal {
        ManagementTransaction storage mgmt = managementTransactions[mgmtIndex];
        mgmt.executed = true;

        if (mgmt.txType == ManagementType.AddOwner) {
            _addOwner(mgmt.targetAddress, mgmt.roleLevel);
        } else if (mgmt.txType == ManagementType.RemoveOwner) {
            _removeOwner(mgmt.targetAddress);
        } else if (mgmt.txType == ManagementType.ChangeThreshold) {
            threshold = mgmt.newThreshold;
        } else if (mgmt.txType == ManagementType.SetRole) {
            roleContract.setRole(mgmt.targetAddress, mgmt.roleLevel);
        } else if (mgmt.txType == ManagementType.AddRule) {
            ruleContract.addRule(mgmt.ruleValueThreshold, mgmt.ruleRoleLevel, mgmt.ruleCount);
        } else if (mgmt.txType == ManagementType.RemoveRule) {
            ruleContract.removeRule(mgmt.ruleIndex);
        }

        emit ManagementExecuted(mgmtIndex);
    }

    // ──────────────────────────── Internal Owner Management ───────────

    function _addOwner(address newOwner, uint8 roleLevel) internal {
        isOwner[newOwner] = true;
        ownerIndex[newOwner] = owners.length;
        owners.push(newOwner);
        roleContract.setRole(newOwner, roleLevel);
    }

    function _removeOwner(address owner) internal {
        isOwner[owner] = false;

        uint idx = ownerIndex[owner];
        address last = owners[owners.length - 1];
        owners[idx] = last;
        ownerIndex[last] = idx;
        owners.pop();
        delete ownerIndex[owner];

        roleContract.removeRole(owner);

        if (threshold > owners.length && owners.length > 0) {
            threshold = owners.length;
        }
    }

    function _pushMgmt(ManagementTransaction memory mgmt) internal {
        uint mgmtIndex = managementTransactions.length;
        managementTransactions.push(mgmt);
        emit ManagementSubmitted(mgmtIndex, msg.sender, mgmt.txType);
    }

    // ──────────────────────────── Getters ─────────────────────────────

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getTransaction(uint txIndex) external view returns (
        address to, uint value, bytes memory data,
        bool executed, bool policyFailed, uint confirmCount
    ) {
        Transaction storage txn = transactions[txIndex];
        return (txn.to, txn.value, txn.data, txn.executed, txn.policyFailed, txn.confirmCount);
    }

    function getTransactionCount() external view returns (uint) {
        return transactions.length;
    }

    function getManagementTransaction(uint mgmtIndex) external view returns (
        ManagementType txType,
        address targetAddress,
        uint8 roleLevel,
        uint newThreshold,
        uint256 ruleValueThreshold,
        uint8 ruleRoleLevel,
        uint8 ruleCount,
        uint ruleIndex,
        bool executed,
        uint confirmCount
    ) {
        ManagementTransaction storage mgmt = managementTransactions[mgmtIndex];
        return (
            mgmt.txType, mgmt.targetAddress, mgmt.roleLevel,
            mgmt.newThreshold, mgmt.ruleValueThreshold, mgmt.ruleRoleLevel,
            mgmt.ruleCount, mgmt.ruleIndex, mgmt.executed, mgmt.confirmCount
        );
    }

    function getManagementCount() external view returns (uint) {
        return managementTransactions.length;
    }

    function isConfirmed(uint txIndex, address owner) external view returns (bool) {
        return confirmations[txIndex][owner];
    }

    function isMgmtConfirmed(uint mgmtIndex, address owner) external view returns (bool) {
        return mgmtConfirmations[mgmtIndex][owner];
    }
}
