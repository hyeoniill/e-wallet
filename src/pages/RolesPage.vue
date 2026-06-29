<template>
  <div class="p-6 space-y-6 max-w-2xl">
    <h1 class="text-xl font-bold">직급 관리</h1>
    <p class="text-slate-400 text-sm">직급 변경은 M-of-N 서명 후 적용됩니다. 트랜잭션 탭에서 승인 가능합니다.</p>

    <!-- 직급 변경 제안 폼 -->
    <div class="card space-y-4">
      <h2 class="font-semibold">직급 변경 제안</h2>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">멤버 선택</label>
          <select v-model="form.address" class="input">
            <option value="">선택...</option>
            <option v-for="m in members" :key="m.address" :value="m.address">
              {{ shortAddr(m.address) }} (현재: {{ m.roleName }})
            </option>
          </select>
        </div>
        <div>
          <label class="label">새 직급</label>
          <select v-model.number="form.roleLevel" class="input">
            <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>
      </div>
      <button @click="proposeRole" :disabled="!canPropose || loading" class="btn-primary">
        {{ loading ? '제안 중...' : '직급 변경 제안' }}
      </button>
    </div>

    <!-- 멤버 목록 -->
    <div class="card">
      <h2 class="font-semibold mb-4">멤버 직급 현황</h2>

      <div v-if="loadingMembers" class="text-slate-400 text-sm">로딩 중...</div>
      <div v-else class="space-y-0">
        <div v-for="m in members" :key="m.address"
          class="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
          <div>
            <div class="text-sm font-mono text-slate-300">{{ shortAddr(m.address) }}</div>
            <div v-if="m.address === store.currentWallet?.address" class="text-xs text-indigo-400">나</div>
          </div>
          <div class="text-right">
            <div class="text-sm font-medium">{{ m.roleName }}</div>
            <div class="text-xs text-slate-500">레벨 {{ m.roleLevel }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 직급 레벨 가이드 -->
    <div class="card">
      <h2 class="font-semibold mb-3">직급 레벨 가이드</h2>
      <div class="grid grid-cols-5 gap-2">
        <div v-for="r in roleOptions" :key="r.value"
          class="text-center py-2 rounded-lg bg-slate-800">
          <div class="text-lg font-bold text-indigo-400">{{ r.value }}</div>
          <div class="text-xs text-slate-400">{{ r.label.split('(')[0] }}</div>
        </div>
      </div>
    </div>

    <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>
    <div v-if="successMsg" class="text-green-400 text-sm">{{ successMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWalletStore } from '../stores/wallet'
import { useMultiSig } from '../composables/useMultiSig'

const route = useRoute()
const store = useWalletStore()
const address = computed(() => route.params.address)

const ms = useMultiSig(address.value)
const { loading, error } = ms

const members = ref([])
const loadingMembers = ref(false)
const successMsg = ref('')

const roleOptions = [
  { value: 1, label: '사원(1)' },
  { value: 2, label: '대리(2)' },
  { value: 3, label: '과장(3)' },
  { value: 4, label: '부장(4)' },
  { value: 5, label: '임원(5)' }
]

const form = ref({ address: '', roleLevel: 2 })

const canPropose = computed(() =>
  form.value.address && form.value.roleLevel && store.currentWallet?.privateKey
)

function shortAddr(a) {
  return `${a.slice(0, 8)}...${a.slice(-6)}`
}

async function loadMembers() {
  loadingMembers.value = true
  try {
    const info = await ms.fetchWalletInfo()
    members.value = await ms.fetchOwnerRoles(info.owners)
  } finally {
    loadingMembers.value = false
  }
}

async function proposeRole() {
  successMsg.value = ''
  await ms.proposeSetRole(form.value.address, form.value.roleLevel)
  successMsg.value = '직급 변경 제안이 제출되었습니다. 트랜잭션 탭에서 승인하세요.'
  form.value = { address: '', roleLevel: 2 }
}

onMounted(loadMembers)
</script>
