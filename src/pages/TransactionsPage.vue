<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">트랜잭션</h1>
      <div class="flex gap-2">
        <button v-for="t in tabs" :key="t.id" @click="activeTab = t.id"
          class="px-3 py-1.5 rounded-lg text-sm transition-colors"
          :class="activeTab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'">
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- 금융 트랜잭션 탭 -->
    <template v-if="activeTab === 'financial'">
      <!-- 제안 폼 -->
      <div class="card space-y-3">
        <h2 class="font-semibold text-slate-200">새 송금 제안</h2>
        <div>
          <label class="label">수신 주소</label>
          <input v-model="sendTo" class="input font-mono" placeholder="0x..." />
        </div>
        <div>
          <label class="label">금액 (ETH)</label>
          <input v-model="sendValue" type="number" step="0.001" class="input" placeholder="0.1" />
        </div>
        <button @click="submitTx" :disabled="!canSubmit || loading" class="btn-primary">
          {{ loading ? '제출 중...' : '트랜잭션 제안' }}
        </button>
      </div>

      <!-- 목록 -->
      <div v-if="loadingTxs" class="text-slate-400 text-sm">로딩 중...</div>
      <div v-else-if="transactions.length === 0" class="card text-slate-500 text-sm text-center py-6">
        트랜잭션 없음
      </div>
      <div v-else class="space-y-3">
        <div v-for="tx in [...transactions].reverse()" :key="tx.index" class="card space-y-3">
          <div class="flex items-start justify-between">
            <div>
              <div class="text-sm text-slate-400 mb-0.5">#{{ tx.index }} 송금</div>
              <div class="font-mono text-sm text-slate-300">{{ shortAddr(tx.to) }}</div>
              <div class="text-lg font-bold mt-1">{{ tx.value }} <span class="text-slate-400 text-sm">ETH</span></div>
            </div>
            <span :class="statusBadge(tx)">{{ statusLabel(tx) }}</span>
          </div>

          <div>
            <div class="text-xs text-slate-500 mb-1">
              서명 {{ tx.confirmCount }} / {{ threshold }}
            </div>
            <div class="flex flex-wrap gap-1">
              <span v-for="addr in tx.confirmedBy" :key="addr"
                class="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-mono">
                {{ shortAddr(addr) }}
              </span>
            </div>
          </div>

          <div v-if="!tx.executed && !tx.policyFailed" class="flex gap-2">
            <button v-if="!tx.confirmedBy.includes(store.currentWallet?.address)"
              @click="confirm(tx.index)" :disabled="loading" class="btn-primary text-sm py-1.5">
              승인
            </button>
            <button v-else
              @click="revoke(tx.index)" :disabled="loading" class="btn-secondary text-sm py-1.5">
              승인 취소
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 관리 트랜잭션 탭 -->
    <template v-if="activeTab === 'management'">
      <div v-if="loadingTxs" class="text-slate-400 text-sm">로딩 중...</div>
      <div v-else-if="mgmtTxs.length === 0" class="card text-slate-500 text-sm text-center py-6">
        관리 트랜잭션 없음
      </div>
      <div v-else class="space-y-3">
        <div v-for="m in [...mgmtTxs].reverse()" :key="m.index" class="card space-y-3">
          <div class="flex items-start justify-between">
            <div>
              <div class="text-sm text-slate-400 mb-0.5">#{{ m.index }} {{ mgmtLabel(m.txType) }}</div>
              <div class="text-sm text-slate-300">{{ mgmtDetail(m) }}</div>
            </div>
            <span :class="m.executed ? 'badge-done' : 'badge-pending'">
              {{ m.executed ? '완료' : '대기중' }}
            </span>
          </div>

          <div>
            <div class="text-xs text-slate-500 mb-1">서명 {{ m.confirmCount }} / {{ threshold }}</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="addr in m.confirmedBy" :key="addr"
                class="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-mono">
                {{ shortAddr(addr) }}
              </span>
            </div>
          </div>

          <div v-if="!m.executed" class="flex gap-2">
            <button v-if="!m.confirmedBy.includes(store.currentWallet?.address)"
              @click="confirmM(m.index)" :disabled="loading" class="btn-primary text-sm py-1.5">
              승인
            </button>
            <button v-else
              @click="revokeM(m.index)" :disabled="loading" class="btn-secondary text-sm py-1.5">
              승인 취소
            </button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ethers } from 'ethers'
import { useWalletStore } from '../stores/wallet'
import { useMultiSig } from '../composables/useMultiSig'
import { ManagementTypeLabel, getRoleName } from '../_contracts/abi'

const route = useRoute()
const store = useWalletStore()
const address = computed(() => route.params.address)

const ms = useMultiSig(address.value)
const { loading, error } = ms

const activeTab = ref('financial')
const tabs = [
  { id: 'financial', label: '금융 트랜잭션' },
  { id: 'management', label: '관리 트랜잭션' }
]

const transactions = ref([])
const mgmtTxs = ref([])
const threshold = ref(1)
const loadingTxs = ref(false)

const sendTo = ref('')
const sendValue = ref('')

const canSubmit = computed(() =>
  ethers.isAddress(sendTo.value) && parseFloat(sendValue.value) > 0 && store.currentWallet?.privateKey
)

function shortAddr(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '-'
}

function statusBadge(tx) {
  if (tx.executed) return 'badge-done'
  if (tx.policyFailed) return 'badge-failed'
  return 'badge-pending'
}
function statusLabel(tx) {
  if (tx.executed) return '실행됨'
  if (tx.policyFailed) return '정책 거부'
  return '대기중'
}

function mgmtLabel(type) {
  return ManagementTypeLabel[type] ?? '알 수 없음'
}

function mgmtDetail(m) {
  switch (m.txType) {
    case 0: return `${shortAddr(m.targetAddress)} → ${getRoleName(m.roleLevel)}`
    case 1: return `${shortAddr(m.targetAddress)} 제거`
    case 2: return `임계값 → ${m.newThreshold}`
    case 3: return `${shortAddr(m.targetAddress)} → ${getRoleName(m.roleLevel)}`
    case 4: return `${m.ruleValueThreshold} ETH 이상 시 ${getRoleName(m.ruleRoleLevel)} ${m.ruleCount}명 필요`
    case 5: return `룰 #${m.ruleIndex} 제거`
    default: return ''
  }
}

async function load() {
  loadingTxs.value = true
  try {
    const info = await ms.fetchWalletInfo()
    threshold.value = info.threshold
    transactions.value = await ms.fetchTransactions()
    mgmtTxs.value = await ms.fetchManagementTxs()
  } finally {
    loadingTxs.value = false
  }
}

async function submitTx() {
  await ms.submitTransaction(sendTo.value, sendValue.value)
  sendTo.value = ''
  sendValue.value = ''
  await load()
}
async function confirm(i) { await ms.confirmTx(i); await load() }
async function revoke(i)   { await ms.revokeTx(i);  await load() }
async function confirmM(i) { await ms.confirmMgmt(i); await load() }
async function revokeM(i)  { await ms.revokeMgmt(i);  await load() }

onMounted(load)
</script>
