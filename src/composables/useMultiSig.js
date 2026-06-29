import { ref, computed } from 'vue'
import { ethers } from 'ethers'
import { useWalletStore } from '../stores/wallet'
import { MULTISIG_ABI, ROLE_ABI, RULE_ABI, ManagementType, getRoleName } from '../_contracts/abi'

export function useMultiSig(contractAddress) {
  const store = useWalletStore()

  const loading = ref(false)
  const error = ref(null)

  function getContract(withSigner = false) {
    if (!store.provider) throw new Error('네트워크 미연결')
    if (!contractAddress) throw new Error('컨트랙트 주소 없음')
    const runner = withSigner ? store.signer : store.provider
    if (withSigner && !runner) throw new Error('지갑 미연결')
    return new ethers.Contract(contractAddress, MULTISIG_ABI, runner)
  }

  async function getRoleContract() {
    const c = getContract()
    const roleAddr = await c.roleContract()
    return new ethers.Contract(roleAddr, ROLE_ABI, store.provider)
  }

  async function getRuleContract() {
    const c = getContract()
    const ruleAddr = await c.ruleContract()
    return new ethers.Contract(ruleAddr, RULE_ABI, store.provider)
  }

  // ── 기본 정보 ──────────────────────────────────────────────────────

  async function fetchWalletInfo() {
    const c = getContract()
    const [owners, threshold, balance] = await Promise.all([
      c.getOwners(),
      c.threshold(),
      store.provider.getBalance(contractAddress)
    ])
    return {
      address: contractAddress,
      owners: [...owners],
      threshold: Number(threshold),
      balance: ethers.formatEther(balance)
    }
  }

  async function fetchOwnerRoles(owners) {
    const rc = await getRoleContract()
    const roles = await Promise.all(owners.map(o => rc.getRole(o)))
    return owners.map((addr, i) => ({
      address: addr,
      roleLevel: Number(roles[i]),
      roleName: getRoleName(roles[i])
    }))
  }

  // ── 트랜잭션 ───────────────────────────────────────────────────────

  async function fetchTransactions() {
    const c = getContract()
    const count = Number(await c.getTransactionCount())
    const owners = await c.getOwners()

    const txs = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const tx = await c.getTransaction(i)
        const confirmedBy = (
          await Promise.all(owners.map(async o => ({ o, ok: await c.isConfirmed(i, o) })))
        ).filter(x => x.ok).map(x => x.o)

        return {
          index: i,
          to: tx.to,
          value: ethers.formatEther(tx.value),
          valueWei: tx.value.toString(),
          data: tx.data,
          executed: tx.executed,
          policyFailed: tx.policyFailed,
          confirmCount: Number(tx.confirmCount),
          confirmedBy
        }
      })
    )
    return txs
  }

  async function fetchManagementTxs() {
    const c = getContract()
    const count = Number(await c.getManagementCount())
    const owners = await c.getOwners()

    const txs = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const m = await c.getManagementTransaction(i)
        const confirmedBy = (
          await Promise.all(owners.map(async o => ({ o, ok: await c.isMgmtConfirmed(i, o) })))
        ).filter(x => x.ok).map(x => x.o)

        return {
          index: i,
          txType: Number(m.txType),
          targetAddress: m.targetAddress,
          roleLevel: Number(m.roleLevel),
          newThreshold: Number(m.newThreshold),
          ruleValueThreshold: ethers.formatEther(m.ruleValueThreshold),
          ruleValueThresholdWei: m.ruleValueThreshold.toString(),
          ruleRoleLevel: Number(m.ruleRoleLevel),
          ruleCount: Number(m.ruleCount),
          ruleIndex: Number(m.ruleIndex),
          executed: m.executed,
          confirmCount: Number(m.confirmCount),
          confirmedBy
        }
      })
    )
    return txs
  }

  // ── 룰 ────────────────────────────────────────────────────────────

  async function fetchRules() {
    const rc = await getRuleContract()
    const active = await rc.getActiveRules()
    return active.map((r, i) => ({
      index: i,
      valueThreshold: ethers.formatEther(r.valueThreshold),
      valueThresholdWei: r.valueThreshold.toString(),
      requiredRoleLevel: Number(r.requiredRoleLevel),
      requiredRoleName: getRoleName(r.requiredRoleLevel),
      requiredCount: Number(r.requiredCount)
    }))
  }

  // ── 액션: 금융 트랜잭션 ──────────────────────────────────────────

  async function submitTransaction(to, valueEth, data = '0x') {
    const c = getContract(true)
    const value = ethers.parseEther(valueEth)
    const tx = await c.submitTransaction(to, value, data)
    return tx.wait()
  }

  async function confirmTx(txIndex) {
    const c = getContract(true)
    const tx = await c.confirmTransaction(txIndex)
    return tx.wait()
  }

  async function revokeTx(txIndex) {
    const c = getContract(true)
    const tx = await c.revokeConfirmation(txIndex)
    return tx.wait()
  }

  // ── 액션: Management ──────────────────────────────────────────────

  async function proposeAddOwner(address, roleLevel) {
    const c = getContract(true)
    const tx = await c.proposeAddOwner(address, roleLevel)
    return tx.wait()
  }

  async function proposeRemoveOwner(address) {
    const c = getContract(true)
    const tx = await c.proposeRemoveOwner(address)
    return tx.wait()
  }

  async function proposeChangeThreshold(n) {
    const c = getContract(true)
    const tx = await c.proposeChangeThreshold(n)
    return tx.wait()
  }

  async function proposeSetRole(address, roleLevel) {
    const c = getContract(true)
    const tx = await c.proposeSetRole(address, roleLevel)
    return tx.wait()
  }

  async function proposeAddRule(valueEth, requiredRoleLevel, requiredCount) {
    const c = getContract(true)
    const value = ethers.parseEther(valueEth)
    const tx = await c.proposeAddRule(value, requiredRoleLevel, requiredCount)
    return tx.wait()
  }

  async function proposeRemoveRule(ruleIndex) {
    const c = getContract(true)
    const tx = await c.proposeRemoveRule(ruleIndex)
    return tx.wait()
  }

  async function confirmMgmt(mgmtIndex) {
    const c = getContract(true)
    const tx = await c.confirmManagement(mgmtIndex)
    return tx.wait()
  }

  async function revokeMgmt(mgmtIndex) {
    const c = getContract(true)
    const tx = await c.revokeManagementConfirmation(mgmtIndex)
    return tx.wait()
  }

  // ── 래퍼 (loading/error 처리) ──────────────────────────────────────

  function wrap(fn) {
    return async (...args) => {
      loading.value = true
      error.value = null
      try {
        return await fn(...args)
      } catch (e) {
        error.value = e.reason ?? e.message
        throw e
      } finally {
        loading.value = false
      }
    }
  }

  return {
    loading,
    error,
    fetchWalletInfo: wrap(fetchWalletInfo),
    fetchOwnerRoles: wrap(fetchOwnerRoles),
    fetchTransactions: wrap(fetchTransactions),
    fetchManagementTxs: wrap(fetchManagementTxs),
    fetchRules: wrap(fetchRules),
    submitTransaction: wrap(submitTransaction),
    confirmTx: wrap(confirmTx),
    revokeTx: wrap(revokeTx),
    proposeAddOwner: wrap(proposeAddOwner),
    proposeRemoveOwner: wrap(proposeRemoveOwner),
    proposeChangeThreshold: wrap(proposeChangeThreshold),
    proposeSetRole: wrap(proposeSetRole),
    proposeAddRule: wrap(proposeAddRule),
    proposeRemoveRule: wrap(proposeRemoveRule),
    confirmMgmt: wrap(confirmMgmt),
    revokeMgmt: wrap(revokeMgmt)
  }
}
