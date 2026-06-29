<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <h1 class="text-xl font-bold">대시보드</h1>

    <div v-if="loading" class="text-slate-400">로딩 중...</div>
    <div v-else-if="error" class="text-red-400 text-sm">{{ error }}</div>

    <template v-else-if="info">
      <!-- 잔액 카드 -->
      <div class="card flex items-center gap-6">
        <div>
          <div class="text-xs text-slate-500 mb-1">잔액</div>
          <div class="text-3xl font-bold">{{ info.balance }} <span class="text-lg text-slate-400">ETH</span></div>
        </div>
        <div class="ml-auto text-right">
          <div class="text-xs text-slate-500 mb-1">임계값</div>
          <div class="text-xl font-semibold">{{ info.threshold }}<span class="text-slate-500 text-sm"> / {{ info.owners.length }}</span></div>
        </div>
      </div>

      <!-- 멤버 목록 -->
      <div class="card">
        <h2 class="font-semibold mb-3">멤버</h2>
        <div class="space-y-2">
          <div v-for="member in members" :key="member.address"
            class="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
            <div>
              <div class="text-sm font-mono text-slate-300">{{ shortAddr(member.address) }}</div>
              <div v-if="member.address === store.currentWallet?.address"
                class="text-xs text-indigo-400">나</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-slate-300">{{ member.roleName }}</div>
              <div class="text-xs text-slate-500">레벨 {{ member.roleLevel }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 빠른 액션 -->
      <div class="grid grid-cols-2 gap-3">
        <RouterLink :to="`/wallet/${address}/transactions`"
          class="card hover:border-indigo-600 transition-colors cursor-pointer text-center">
          <div class="text-2xl mb-1">📋</div>
          <div class="text-sm font-medium">트랜잭션</div>
          <div class="text-xs text-slate-500 mt-1">제안 · 승인 · 내역</div>
        </RouterLink>
        <RouterLink :to="`/wallet/${address}/rules`"
          class="card hover:border-indigo-600 transition-colors cursor-pointer text-center">
          <div class="text-2xl mb-1">📏</div>
          <div class="text-sm font-medium">룰 관리</div>
          <div class="text-xs text-slate-500 mt-1">정책 설정</div>
        </RouterLink>
      </div>
    </template>
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

const { loading, error, fetchWalletInfo, fetchOwnerRoles } = useMultiSig(address.value)

const info = ref(null)
const members = ref([])

function shortAddr(a) {
  return `${a.slice(0, 8)}...${a.slice(-6)}`
}

onMounted(async () => {
  info.value = await fetchWalletInfo()
  members.value = await fetchOwnerRoles(info.value.owners)
})
</script>
