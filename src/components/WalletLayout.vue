<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-56 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      <div class="p-4 border-b border-slate-800">
        <div class="text-xs text-slate-500 mb-1">다중 서명 지갑</div>
        <div class="text-sm font-mono text-slate-300 truncate">{{ shortAddr }}</div>
        <div class="text-xs text-indigo-400 mt-1">{{ walletName }}</div>
      </div>

      <nav class="flex-1 p-3 space-y-1">
        <RouterLink v-for="item in navItems" :key="item.to"
          :to="`/wallet/${address}${item.to}`"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
          :class="isActive(item.to)
            ? 'bg-indigo-600/20 text-indigo-400'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'">
          <span class="text-base">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="p-3 border-t border-slate-800">
        <RouterLink to="/"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-300 transition-colors">
          ← 홈으로
        </RouterLink>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 overflow-y-auto">
      <!-- 지갑 미연결 경고 -->
      <div v-if="store.isReadOnly"
        class="bg-yellow-500/10 border-b border-yellow-500/30 px-5 py-2 text-yellow-400 text-sm">
        읽기 전용 모드 — 개인키가 없어 트랜잭션을 제출할 수 없습니다
      </div>

      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWalletStore } from '../stores/wallet'

const store = useWalletStore()
const route = useRoute()
const address = computed(() => route.params.address)

const shortAddr = computed(() => {
  const a = address.value
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : ''
})

const walletName = computed(() => {
  return store.savedMultiSig.find(w => w.address === address.value)?.name ?? '지갑'
})

const navItems = [
  { to: '',              icon: '🏠', label: '대시보드' },
  { to: '/transactions', icon: '📋', label: '트랜잭션' },
  { to: '/rules',        icon: '📏', label: '룰 관리' },
  { to: '/roles',        icon: '👤', label: '직급 관리' },
  { to: '/settings',     icon: '⚙️', label: '설정' }
]

function isActive(to) {
  const full = `/wallet/${address.value}${to}`
  if (to === '') return route.path === full
  return route.path.startsWith(full)
}
</script>
