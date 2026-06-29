<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-lg">
      <RouterLink to="/" class="text-slate-500 text-sm hover:text-slate-300 mb-6 inline-block">← 홈으로</RouterLink>
      <h1 class="text-2xl font-bold mb-6">지갑 생성</h1>

      <!-- Tab -->
      <div class="flex gap-2 mb-6">
        <button v-for="t in tabs" :key="t.id"
          @click="activeTab = t.id"
          class="px-4 py-1.5 rounded-lg text-sm transition-colors"
          :class="activeTab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'">
          {{ t.label }}
        </button>
      </div>

      <!-- 새 지갑 생성 -->
      <div v-if="activeTab === 'new'" class="card space-y-4">
        <div v-if="!generated">
          <label class="label">지갑 이름</label>
          <input v-model="name" class="input" placeholder="예: 내 지갑" />
          <button @click="generate" :disabled="!name.trim()" class="btn-primary w-full mt-4">
            지갑 생성
          </button>
        </div>

        <div v-else>
          <div class="text-sm text-slate-400 mb-2">니모닉 구문 (안전한 곳에 보관하세요)</div>
          <div class="grid grid-cols-3 gap-2 mb-4">
            <div v-for="(word, i) in mnemonic.split(' ')" :key="i"
              class="bg-slate-800 rounded-lg px-3 py-2 text-center">
              <span class="text-xs text-slate-500">{{ i + 1 }}</span>
              <div class="text-sm font-mono text-slate-200">{{ word }}</div>
            </div>
          </div>
          <p class="text-yellow-400 text-xs mb-4">⚠️ 이 구문을 잃어버리면 지갑을 복구할 수 없습니다</p>
          <button @click="confirmCreate" class="btn-primary w-full">저장하고 시작</button>
        </div>
      </div>

      <!-- 니모닉 복구 -->
      <div v-if="activeTab === 'mnemonic'" class="card space-y-4">
        <div>
          <label class="label">지갑 이름</label>
          <input v-model="name" class="input" placeholder="예: 복구된 지갑" />
        </div>
        <div>
          <label class="label">12단어 니모닉</label>
          <textarea v-model="inputMnemonic" class="input h-24 resize-none" placeholder="단어를 공백으로 구분하여 입력" />
        </div>
        <button @click="recoverMnemonic" :disabled="!canRecoverMnemonic" class="btn-primary w-full">복구</button>
      </div>

      <!-- 개인키 복구 -->
      <div v-if="activeTab === 'privatekey'" class="card space-y-4">
        <div>
          <label class="label">지갑 이름</label>
          <input v-model="name" class="input" placeholder="예: 복구된 지갑" />
        </div>
        <div>
          <label class="label">개인키</label>
          <input v-model="inputPrivateKey" type="password" class="input" placeholder="0x..." />
        </div>
        <button @click="recoverPrivateKey" :disabled="!canRecoverPrivateKey" class="btn-primary w-full">복구</button>
      </div>

      <div v-if="errorMsg" class="text-red-400 text-sm mt-3">{{ errorMsg }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ethers } from 'ethers'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../stores/wallet'

const store = useWalletStore()
const router = useRouter()

const activeTab = ref('new')
const tabs = [
  { id: 'new', label: '새 지갑' },
  { id: 'mnemonic', label: '니모닉 복구' },
  { id: 'privatekey', label: '개인키 복구' }
]

const name = ref('')
const generated = ref(false)
const mnemonic = ref('')
const inputMnemonic = ref('')
const inputPrivateKey = ref('')
const errorMsg = ref('')

function generate() {
  const w = ethers.Wallet.createRandom()
  mnemonic.value = w.mnemonic.phrase
  generated.value = true
}

function confirmCreate() {
  store.createWallet(name.value.trim())
  router.push('/')
}

const canRecoverMnemonic = computed(() =>
  name.value.trim() && inputMnemonic.value.trim().split(/\s+/).length === 12
)

const canRecoverPrivateKey = computed(() =>
  name.value.trim() && inputPrivateKey.value.trim().length > 0
)

function recoverMnemonic() {
  try {
    errorMsg.value = ''
    store.recoverFromMnemonic(name.value.trim(), inputMnemonic.value)
    router.push('/')
  } catch (e) {
    errorMsg.value = '복구 실패: ' + e.message
  }
}

function recoverPrivateKey() {
  try {
    errorMsg.value = ''
    store.recoverFromPrivateKey(name.value.trim(), inputPrivateKey.value)
    router.push('/')
  } catch (e) {
    errorMsg.value = '복구 실패: ' + e.message
  }
}
</script>
