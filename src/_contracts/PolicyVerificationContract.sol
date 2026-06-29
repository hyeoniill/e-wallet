// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RoleContract.sol";
import "./RuleContract.sol";

contract PolicyVerificationContract {
    RoleContract public roleContract;
    RuleContract public ruleContract;

    constructor(address _roleContract, address _ruleContract) {
        roleContract = RoleContract(_roleContract);
        ruleContract = RuleContract(_ruleContract);
    }

    /**
     * 트랜잭션이 모든 활성 룰을 통과하는지 검증
     * @param value 송금 금액 (wei)
     * @param signers 서명자 주소 목록
     * @return 검증 통과 여부
     */
    function verify(uint256 value, address[] memory signers) external view returns (bool) {
        RuleContract.Rule[] memory activeRules = ruleContract.getActiveRules();

        for (uint i = 0; i < activeRules.length; i++) {
            RuleContract.Rule memory rule = activeRules[i];

            if (value >= rule.valueThreshold) {
                uint8 qualifiedCount = 0;
                for (uint j = 0; j < signers.length; j++) {
                    if (roleContract.hasMinRole(signers[j], rule.requiredRoleLevel)) {
                        qualifiedCount++;
                    }
                }

                if (qualifiedCount < rule.requiredCount) {
                    return false;
                }
            }
        }

        return true;
    }
}
