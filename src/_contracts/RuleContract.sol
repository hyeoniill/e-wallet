// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RuleContract {
    address public wallet;

    struct Rule {
        uint256 valueThreshold;   // 이 금액(wei) 이상 송금 시 룰 적용
        uint8 requiredRoleLevel;  // 필요한 최소 직급 레벨
        uint8 requiredCount;      // 해당 직급 이상 서명자 필요 수
        bool active;
    }

    Rule[] private _rules;

    event RuleAdded(uint indexed ruleIndex, uint256 valueThreshold, uint8 requiredRoleLevel, uint8 requiredCount);
    event RuleRemoved(uint indexed ruleIndex);

    modifier onlyWallet() {
        require(msg.sender == wallet, "Only wallet");
        _;
    }

    constructor(address _wallet) {
        wallet = _wallet;
    }

    function addRule(
        uint256 valueThreshold,
        uint8 requiredRoleLevel,
        uint8 requiredCount
    ) external onlyWallet {
        require(requiredRoleLevel > 0, "Invalid role level");
        require(requiredCount > 0, "Required count must be > 0");

        _rules.push(Rule({
            valueThreshold: valueThreshold,
            requiredRoleLevel: requiredRoleLevel,
            requiredCount: requiredCount,
            active: true
        }));

        emit RuleAdded(_rules.length - 1, valueThreshold, requiredRoleLevel, requiredCount);
    }

    function removeRule(uint ruleIndex) external onlyWallet {
        require(ruleIndex < _rules.length, "Rule does not exist");
        require(_rules[ruleIndex].active, "Rule already inactive");
        _rules[ruleIndex].active = false;
        emit RuleRemoved(ruleIndex);
    }

    function getRule(uint ruleIndex) external view returns (uint256, uint8, uint8, bool) {
        Rule storage r = _rules[ruleIndex];
        return (r.valueThreshold, r.requiredRoleLevel, r.requiredCount, r.active);
    }

    function getRuleCount() external view returns (uint) {
        return _rules.length;
    }

    function getActiveRules() external view returns (Rule[] memory) {
        uint count = 0;
        for (uint i = 0; i < _rules.length; i++) {
            if (_rules[i].active) count++;
        }

        Rule[] memory active = new Rule[](count);
        uint j = 0;
        for (uint i = 0; i < _rules.length; i++) {
            if (_rules[i].active) active[j++] = _rules[i];
        }
        return active;
    }
}
