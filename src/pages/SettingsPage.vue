<template>
  <div class="p-6 space-y-6 max-w-2xl">
    <h1 class="text-xl font-bold">설정</h1>
    <p class="text-slate-400 text-sm">모든 변경은 M-of-N 서명 후 적용됩니다. 트랜잭션 탭에서 승인 가능합니다.</p>

    <div v-if="loadingInfo" class="text-slate-400 text-sm">로딩 중...</div>

    <template v-else-if="info">
      <!-- 현재 설정 요약 -->
      <div class="card">
        <h2 class="font-semibold mb-3">현재 설정</h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-xs text-slate-500">임계값</div>
            <div class="text-xl font-bold">{{ info.threshold }} <span class="text-slate-500 text-sm">/ {{ info.owners.length }}</span></div>
          </div>
          <div>
            <div class="text-xs text-slate-500">컨트랙트 주소</div>
            <div class="text-sm font-mono text-slate-300">{{ shortAddr(info.address) }}</div>
          </div>
        </div>
      </div>

      <!-- 임계값 변경 -->
      <div class="card space-y-3">
        <h2 class="font-semibold">임계값 변경 제안</h2>
        <div class="flex gap-3 items-end">
          <div class="flex-1">
            <label class="label">새 임계값 (1 ~ {{ info.owners.length }})</label>
            <input v-model.number="newThreshold" type="number" :min="1" :max="info.owners.length" class="input" />
          </div>
          <button @click="changeThreshold"
            :disabled="!newThreshold || newThreshold === info.threshold || loading"
            class="btn-primary">
            제안
          </button>
        </div>
      </div>

      <!-- 멤버 추가 -->
      <div class="card space-y-3">
        <h2 class="font-semibold">멤버 추가 제안</h2>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">주소</label>
            <input v-model="addOwnerForm.address" class="input font-mono" placeholder="0x..." />
          </div>
          <div>
            <label class="label">직급</label>
            <select v-model.number="addOwnerForm.roleLevel" class="input">
              <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>
        </div>
        <button @click="addOwner" :disabled="!canAddOwner || loading" class="btn-primary">
          멤버 추가 제안
        </button>
      </div>

      <!-- 멤버 제거 -->
      <div class="card space-y-3">
        <h2 class="font-semibold">멤버 제거 제안</h2>
        <div class="flex gap-3 items-end">
          <div class="flex-1">
            <label class="label">제거할 멤버</label>
            <select v-model="removeOwnerAddr" class="input">
              <option value="">선택...</option>
              <option v-for="o in info.owners" :key="o" :value="o">{{ shortAddr(o) }}</option>
            </select>
          </div>
          <button @click="removeOwner" :disabled="!removeOwnerAddr || loading" class="btn-danger">
            제거 제안
          </button>
        </div>
      </div>

      <!-- 지갑 삭제 (로컬) -->
      <div class="card border-red-500/30">
        <h2 class="font-semibold text-red-400 mb-2">이 지갑 목록에서 삭제</h2>
        <p class="text-slate-500 text-sm mb-3">컨트랙트는 삭제되지 않습니다. 로컬 목록에서만 제거됩니다.</p>
        <button @click="removeFromList" class="btn-danger text-sm">목록에서 삭제</button>
      </div>
    </template>

    <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>
    <div v-if="successMsg" class="text-green-400 text-sm">{{ successMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ethers } from 'ethers'
import { useWalletStore } from '../stores/wallet'
import { useMultiSig } from '../composables/useMultiSig'

const route = useRoute()
const router = useRouter()
const store = useWalletStore()
const address = computed(() => route.params.address)

const ms = useMultiSig(address.value)
const { loading, error } = ms

const info = ref(null)
const loadingInfo = ref(false)
const successMsg = ref('')
const newThreshold = ref(null)
const addOwnerForm = ref({ address: '', roleLevel: 1 })
const removeOwnerAddr = ref('')

const roleOptions = [
  { value: 1, label: '사원(1)' },
  { value: 2, label: '대리(2)' },
  { value: 3, label: '과장(3)' },
  { value: 4, label: '부장(4)' },
  { value: 5, label: '임원(5)' }
]

const canAddOwner = computed(() =>
  ethers.isAddress(addOwnerForm.value.address) && store.currentWallet?.privateKey
)

function shortAddr(a) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`
}

async function loadInfo() {
  loadingInfo.value = true
  try {
    info.value = await ms.fetchWalletInfo()
    newThreshold.value = info.value.threshold
  } finally {
    loadingInfo.value = false
  }
}

async function changeThreshold() {
  successMsg.value = ''
  await ms.proposeChangeThreshold(newThreshold.value)
  successMsg.value = '임계값 변경 제안이 제출되었습니다.'
}

async function addOwner() {
  successMsg.value = ''
  await ms.proposeAddOwner(addOwnerForm.value.address, addOwnerForm.value.roleLevel)
  successMsg.value = '멤버 추가 제안이 제출되었습니다.'
  addOwnerForm.value = { address: '', roleLevel: 1 }
}

async function removeOwner() {
  successMsg.value = ''
  await ms.proposeRemoveOwner(removeOwnerAddr.value)
  successMsg.value = '멤버 제거 제안이 제출되었습니다.'
  removeOwnerAddr.value = ''
}

function removeFromList() {
  store.deleteMultiSig(address.value)
  router.push('/')
}

onMounted(loadInfo)
</script>
