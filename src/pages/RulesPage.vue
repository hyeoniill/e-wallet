<template>
  <div class="p-6 space-y-6 max-w-2xl">
    <h1 class="text-xl font-bold">룰 관리</h1>
    <p class="text-slate-400 text-sm">룰 추가/제거는 M-of-N 서명 후 적용됩니다. 트랜잭션 탭에서 승인 가능합니다.</p>

    <!-- 룰 추가 폼 -->
    <div class="card space-y-4">
      <h2 class="font-semibold">룰 추가 제안</h2>
      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="label">최소 금액 (ETH)</label>
          <input v-model="form.value" type="number" step="0.1" class="input" placeholder="1.0" />
        </div>
        <div>
          <label class="label">필요 직급</label>
          <select v-model.number="form.roleLevel" class="input">
            <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>
        <div>
          <label class="label">필요 서명 수</label>
          <input v-model.number="form.count" type="number" min="1" class="input" placeholder="1" />
        </div>
      </div>

      <div class="bg-slate-800 rounded-lg px-4 py-3 text-sm text-slate-300">
        예시: <span class="text-indigo-400">{{ form.value || '?' }} ETH</span> 이상 송금 시
        <span class="text-indigo-400">{{ roleName(form.roleLevel) }}</span> 이상
        <span class="text-indigo-400">{{ form.count || '?' }}명</span> 서명 필요
      </div>

      <button @click="addRule" :disabled="!canAdd || loading" class="btn-primary">
        {{ loading ? '제안 중...' : '룰 추가 제안' }}
      </button>
    </div>

    <!-- 현재 룰 목록 -->
    <div class="card">
      <h2 class="font-semibold mb-4">현재 활성 룰</h2>

      <div v-if="loadingRules" class="text-slate-400 text-sm">로딩 중...</div>
      <div v-else-if="rules.length === 0" class="text-slate-500 text-sm text-center py-4">
        설정된 룰 없음
      </div>
      <div v-else class="space-y-3">
        <div v-for="rule in rules" :key="rule.index"
          class="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
          <div>
            <div class="text-sm text-slate-200">
              {{ rule.valueThreshold }} ETH 이상 →
              {{ rule.requiredRoleName }} 이상 {{ rule.requiredCount }}명 서명 필요
            </div>
            <div class="text-xs text-slate-500 mt-0.5">룰 #{{ rule.index }}</div>
          </div>
          <button @click="removeRule(rule.index)" :disabled="loading"
            class="text-red-400 hover:text-red-300 text-sm transition-colors">
            제거 제안
          </button>
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
import { getRoleName } from '../_contracts/abi'

const route = useRoute()
const store = useWalletStore()
const address = computed(() => route.params.address)

const ms = useMultiSig(address.value)
const { loading, error } = ms

const rules = ref([])
const loadingRules = ref(false)
const successMsg = ref('')

const roleOptions = [
  { value: 1, label: '사원(1)' },
  { value: 2, label: '대리(2)' },
  { value: 3, label: '과장(3)' },
  { value: 4, label: '부장(4)' },
  { value: 5, label: '임원(5)' }
]

const form = ref({ value: '', roleLevel: 4, count: 1 })

const canAdd = computed(() =>
  parseFloat(form.value.value) > 0 && form.value.count >= 1 && store.currentWallet?.privateKey
)

function roleName(level) {
  return getRoleName(level)
}

async function loadRules() {
  loadingRules.value = true
  try {
    rules.value = await ms.fetchRules()
  } finally {
    loadingRules.value = false
  }
}

async function addRule() {
  successMsg.value = ''
  await ms.proposeAddRule(form.value.value, form.value.roleLevel, form.value.count)
  successMsg.value = '룰 추가 제안이 제출되었습니다. 트랜잭션 탭에서 승인하세요.'
  form.value = { value: '', roleLevel: 4, count: 1 }
  await loadRules()
}

async function removeRule(ruleIndex) {
  successMsg.value = ''
  await ms.proposeRemoveRule(ruleIndex)
  successMsg.value = '룰 제거 제안이 제출되었습니다. 트랜잭션 탭에서 승인하세요.'
}

onMounted(loadRules)
</script>
