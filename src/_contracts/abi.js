export const MULTISIG_ABI = [
  // Constructor
  "constructor(address[] _owners, uint8[] _roleLevels, uint _threshold)",

  // Receive
  "receive() external payable",

  // ── Financial Transactions ──
  "function submitTransaction(address to, uint value, bytes calldata data) external",
  "function confirmTransaction(uint txIndex) external",
  "function revokeConfirmation(uint txIndex) external",

  // ── Management Proposals ──
  "function proposeAddOwner(address newOwner, uint8 roleLevel) external",
  "function proposeRemoveOwner(address ownerToRemove) external",
  "function proposeChangeThreshold(uint newThreshold) external",
  "function proposeSetRole(address target, uint8 roleLevel) external",
  "function proposeAddRule(uint256 valueThreshold, uint8 requiredRoleLevel, uint8 requiredCount) external",
  "function proposeRemoveRule(uint ruleIndex) external",
  "function confirmManagement(uint mgmtIndex) external",
  "function revokeManagementConfirmation(uint mgmtIndex) external",

  // ── Getters ──
  "function getOwners() external view returns (address[])",
  "function getTransaction(uint txIndex) external view returns (address to, uint value, bytes data, bool executed, bool policyFailed, uint confirmCount)",
  "function getTransactionCount() external view returns (uint)",
  "function getManagementTransaction(uint mgmtIndex) external view returns (uint8 txType, address targetAddress, uint8 roleLevel, uint newThreshold, uint256 ruleValueThreshold, uint8 ruleRoleLevel, uint8 ruleCount, uint ruleIndex, bool executed, uint confirmCount)",
  "function getManagementCount() external view returns (uint)",
  "function isConfirmed(uint txIndex, address owner) external view returns (bool)",
  "function isMgmtConfirmed(uint mgmtIndex, address owner) external view returns (bool)",
  "function threshold() external view returns (uint)",
  "function isOwner(address) external view returns (bool)",
  "function roleContract() external view returns (address)",
  "function ruleContract() external view returns (address)",
  "function policyContract() external view returns (address)",

  // ── Events ──
  "event Deposit(address indexed sender, uint amount, uint balance)",
  "event TransactionSubmitted(uint indexed txIndex, address indexed proposer, address to, uint value)",
  "event TransactionConfirmed(uint indexed txIndex, address indexed owner)",
  "event TransactionRevoked(uint indexed txIndex, address indexed owner)",
  "event TransactionExecuted(uint indexed txIndex)",
  "event TransactionFailed(uint indexed txIndex)",
  "event PolicyRejected(uint indexed txIndex)",
  "event ManagementSubmitted(uint indexed mgmtIndex, address indexed proposer, uint8 txType)",
  "event ManagementConfirmed(uint indexed mgmtIndex, address indexed owner)",
  "event ManagementRevoked(uint indexed mgmtIndex, address indexed owner)",
  "event ManagementExecuted(uint indexed mgmtIndex)"
]

export const ROLE_ABI = [
  "function getRole(address user) external view returns (uint8)",
  "function hasMinRole(address user, uint8 minLevel) external view returns (bool)",
  "function wallet() external view returns (address)"
]

export const RULE_ABI = [
  "function getActiveRules() external view returns (tuple(uint256 valueThreshold, uint8 requiredRoleLevel, uint8 requiredCount, bool active)[])",
  "function getRuleCount() external view returns (uint)",
  "function getRule(uint ruleIndex) external view returns (uint256, uint8, uint8, bool)",
  "function wallet() external view returns (address)"
]

// ManagementType enum
export const ManagementType = {
  AddOwner: 0,
  RemoveOwner: 1,
  ChangeThreshold: 2,
  SetRole: 3,
  AddRule: 4,
  RemoveRule: 5
}

export const ManagementTypeLabel = {
  0: '멤버 추가',
  1: '멤버 제거',
  2: '임계값 변경',
  3: '직급 변경',
  4: '룰 추가',
  5: '룰 제거'
}

// 직급 레벨 이름 (커스터마이징 가능)
export const ROLE_NAMES = {
  1: '사원',
  2: '대리',
  3: '과장',
  4: '부장',
  5: '임원'
}

export function getRoleName(level) {
  const n = Number(level)
  return ROLE_NAMES[n] ?? `레벨 ${n}`
}
