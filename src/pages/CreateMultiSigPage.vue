<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-xl">
      <RouterLink to="/" class="text-slate-500 text-sm hover:text-slate-300 mb-6 inline-block">← 홈으로</RouterLink>
      <h1 class="text-2xl font-bold mb-6">다중 서명 지갑</h1>

      <!-- Tab -->
      <div class="flex gap-2 mb-6">
        <button v-for="t in tabs" :key="t.id"
          @click="activeTab = t.id"
          class="px-4 py-1.5 rounded-lg text-sm transition-colors"
          :class="activeTab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'">
          {{ t.label }}
        </button>
      </div>

      <!-- 생성 -->
      <div v-if="activeTab === 'create'" class="card space-y-5">
        <div>
          <label class="label">지갑 이름</label>
          <input v-model="walletName" class="input" placeholder="예: 회사 운영 지갑" />
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="label mb-0">소유자 목록</label>
            <button @click="addOwner" class="text-xs text-indigo-400 hover:text-indigo-300">+ 추가</button>
          </div>
          <div class="space-y-2">
            <div v-for="(owner, i) in owners" :key="i" class="flex gap-2">
              <input v-model="owner.address" class="input flex-1" placeholder="0x..." />
              <select v-model="owner.roleLevel" class="input w-28">
                <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
              <button v-if="owners.length > 1" @click="removeOwner(i)"
                class="text-slate-500 hover:text-red-400 px-2">✕</button>
            </div>
          </div>
        </div>

        <div>
          <label class="label">임계값 (M-of-{{ owners.length }})</label>
          <input v-model.number="threshold" type="number" :min="1" :max="owners.length" class="input w-24" />
          <p class="text-xs text-slate-500 mt-1">{{ threshold }}명 이상 서명해야 트랜잭션 실행</p>
        </div>

        <div v-if="!store.currentWallet" class="text-yellow-400 text-sm">
          ⚠️ 배포하려면 먼저 홈에서 서명 지갑을 선택하세요
        </div>

        <button @click="deploy" :disabled="!canDeploy || deploying" class="btn-primary w-full">
          <span v-if="deploying">배포 중...</span>
          <span v-else>컨트랙트 배포</span>
        </button>

        <div v-if="errorMsg" class="text-red-400 text-sm">{{ errorMsg }}</div>
      </div>

      <!-- 참여 -->
      <div v-if="activeTab === 'join'" class="card space-y-4">
        <p class="text-slate-400 text-sm">이미 배포된 다중 서명 지갑 주소를 입력해 참여하세요</p>
        <div>
          <label class="label">지갑 이름</label>
          <input v-model="joinName" class="input" placeholder="예: 팀 지갑" />
        </div>
        <div>
          <label class="label">컨트랙트 주소</label>
          <input v-model="joinAddress" class="input font-mono" placeholder="0x..." />
        </div>
        <button @click="join" :disabled="!canJoin || joining" class="btn-primary w-full">
          <span v-if="joining">확인 중...</span>
          <span v-else>참여</span>
        </button>
        <div v-if="errorMsg" class="text-red-400 text-sm">{{ errorMsg }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ethers } from 'ethers'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../stores/wallet'
import { MULTISIG_ABI } from '../_contracts/abi'
import { MULTISIG_BYTECODE } from '../_contracts/bytecode.js'

const store = useWalletStore()
const router = useRouter()

const activeTab = ref('create')
const tabs = [
  { id: 'create', label: '새로 만들기' },
  { id: 'join', label: '주소로 참여' }
]

const roleOptions = [
  { value: 1, label: '사원(1)' },
  { value: 2, label: '대리(2)' },
  { value: 3, label: '과장(3)' },
  { value: 4, label: '부장(4)' },
  { value: 5, label: '임원(5)' }
]

// 생성
const walletName = ref('')
const owners = ref([{ address: '', roleLevel: 1 }])
const threshold = ref(1)
const deploying = ref(false)
const errorMsg = ref('')

function addOwner() {
  owners.value.push({ address: '', roleLevel: 1 })
}
function removeOwner(i) {
  owners.value.splice(i, 1)
  if (threshold.value > owners.value.length) threshold.value = owners.value.length
}

const canDeploy = computed(() => {
  if (!walletName.value.trim() || !store.currentWallet?.privateKey) return false
  const valid = owners.value.every(o => ethers.isAddress(o.address))
  return valid && threshold.value >= 1 && threshold.value <= owners.value.length
})

async function deploy() {
  deploying.value = true
  errorMsg.value = ''
  try {
    // 컨트랙트 배포 (bytecode는 컴파일 후 채워야 함)
    if (!MULTISIG_BYTECODE) {
      throw new Error('바이트코드가 없습니다. Remix에서 컴파일 후 bytecode.js에 붙여넣으세요.')
    }

    const signer = new ethers.Wallet(store.currentWallet.privateKey, store.provider)

    const factory = new ethers.ContractFactory(MULTISIG_ABI, MULTISIG_BYTECODE, signer)
    const addresses = owners.value.map(o => o.address)
    const levels = owners.value.map(o => o.roleLevel)
    const contract = await factory.deploy(addresses, levels, threshold.value)
    await contract.waitForDeployment()

    const addr = await contract.getAddress()
    store.addMultiSig({ name: walletName.value.trim(), address: addr, deployedAt: new Date().toISOString() })
    router.push(`/wallet/${addr}`)
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    deploying.value = false
  }
}

// 참여
const joinName = ref('')
const joinAddress = ref('')
const joining = ref(false)

const canJoin = computed(() =>
  joinName.value.trim() && ethers.isAddress(joinAddress.value)
)

async function join() {
  joining.value = true
  errorMsg.value = ''
  try {
    const addr = joinAddress.value.trim()
    const code = await store.provider.getCode(addr)
    if (code === '0x') throw new Error('해당 주소에 컨트랙트가 없습니다')

    store.addMultiSig({ name: joinName.value.trim(), address: addr, joinedAt: new Date().toISOString() })
    router.push(`/wallet/${addr}`)
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    joining.value = false
  }
}
</script>
