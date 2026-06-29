<template>
  <RouterView />
</template>

<script setup>
import { onMounted } from 'vue'
import { useWalletStore } from './stores/wallet'

const store = useWalletStore()
onMounted(() => store.initProvider())
</script>
