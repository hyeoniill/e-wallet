<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6">
    <h1 class="text-3xl font-bold mb-1">E-Wallet</h1>
    <p class="text-slate-400 text-sm mb-10">기업용 다중 서명 전자지갑</p>

    <!-- 개인 지갑 선택 -->
    <div class="w-full max-w-md space-y-6">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-slate-200">내 지갑</h2>
          <RouterLink to="/create-wallet" class="btn-primary text-sm py-1.5">+ 새 지갑</RouterLink>
        </div>

        <div v-if="store.savedWallets.length === 0" class="text-slate-500 text-sm text-center py-4">
          저장된 지갑이 없습니다
        </div>

        <div v-else class="space-y-2">
          <button v-for="w in store.savedWallets" :key="w.address"
            @click="selectWallet(w)"
            class="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-left">
            <div>
              <div class="text-sm font-medium">{{ w.name }}</div>
              <div class="text-xs text-slate-400 font-mono">{{ shortAddr(w.address) }}</div>
            </div>
            <div v-if="store.currentWallet?.address === w.address"
              class="text-xs text-indigo-400">선택됨</div>
          </button>
        </div>
      </div>

      <!-- 다중 서명 지갑 -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-slate-200">다중 서명 지갑</h2>
          <RouterLink to="/create-multisig" class="btn-primary text-sm py-1.5">+ 생성/참여</RouterLink>
        </div>

        <div v-if="store.savedMultiSig.length === 0" class="text-slate-500 text-sm text-center py-4">
          저장된 다중 서명 지갑이 없습니다
        </div>

        <div v-else class="space-y-2">
          <RouterLink v-for="ms in store.savedMultiSig" :key="ms.address"
            :to="`/wallet/${ms.address}`"
            class="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
            <div>
              <div class="text-sm font-medium">{{ ms.name }}</div>
              <div class="text-xs text-slate-400 font-mono">{{ shortAddr(ms.address) }}</div>
            </div>
            <span class="text-slate-500 text-xs">→</span>
          </RouterLink>
        </div>
      </div>

      <!-- 현재 연결된 지갑 -->
      <div v-if="store.currentWallet" class="text-center text-xs text-slate-500">
        연결된 서명 지갑: <span class="text-slate-300 font-mono">{{ shortAddr(store.currentWallet.address) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useWalletStore } from '../stores/wallet'

const store = useWalletStore()

function shortAddr(a) {
  return `${a.slice(0, 8)}...${a.slice(-6)}`
}

function selectWallet(w) {
  store.selectWallet(w)
}
</script>
