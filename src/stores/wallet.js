import { defineStore } from 'pinia'
import { ethers } from 'ethers'

const STORAGE_KEY_WALLETS = 'ew_wallets'
const STORAGE_KEY_MULTISIG = 'ew_multisig'

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? [] } catch { return [] }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    provider: null,
    currentWallet: null,      // { name, address, privateKey, mnemonic }
    savedWallets: load(STORAGE_KEY_WALLETS),
    currentMultiSig: null,    // address string
    savedMultiSig: load(STORAGE_KEY_MULTISIG), // [{ name, address, deployedAt }]
    networkError: null
  }),

  getters: {
    signer: (state) => {
      if (!state.provider || !state.currentWallet?.privateKey) return null
      return new ethers.Wallet(state.currentWallet.privateKey, state.provider)
    },
    isReadOnly: (state) => !state.currentWallet?.privateKey
  },

  actions: {
    async initProvider() {
      try {
        const url = `${window.location.origin}/api/ethereum`
        const p = new ethers.JsonRpcProvider(url)
        await p.getBlockNumber()
        this.provider = p
      } catch {
        try {
          const infura = `https://sepolia.infura.io/v3/5dc76d758e1444e18669946ef9b04d0c`
          const p = new ethers.JsonRpcProvider(infura)
          await p.getBlockNumber()
          this.provider = p
        } catch (e) {
          this.networkError = '네트워크 연결 실패: ' + e.message
        }
      }
    },

    createWallet(name) {
      const w = ethers.Wallet.createRandom()
      const wallet = {
        name,
        address: w.address,
        privateKey: w.privateKey,
        mnemonic: w.mnemonic.phrase,
        createdAt: new Date().toISOString()
      }
      this.savedWallets.push(wallet)
      save(STORAGE_KEY_WALLETS, this.savedWallets)
      this.currentWallet = wallet
      return wallet
    },

    recoverFromMnemonic(name, mnemonic) {
      const w = ethers.Wallet.fromPhrase(mnemonic.trim())
      const wallet = {
        name,
        address: w.address,
        privateKey: w.privateKey,
        mnemonic: mnemonic.trim(),
        createdAt: new Date().toISOString()
      }
      this.savedWallets.push(wallet)
      save(STORAGE_KEY_WALLETS, this.savedWallets)
      this.currentWallet = wallet
      return wallet
    },

    recoverFromPrivateKey(name, privateKey) {
      const w = new ethers.Wallet(privateKey.trim())
      const wallet = {
        name,
        address: w.address,
        privateKey: w.privateKey,
        createdAt: new Date().toISOString()
      }
      this.savedWallets.push(wallet)
      save(STORAGE_KEY_WALLETS, this.savedWallets)
      this.currentWallet = wallet
      return wallet
    },

    selectWallet(wallet) {
      this.currentWallet = wallet
    },

    deleteWallet(address) {
      this.savedWallets = this.savedWallets.filter(w => w.address !== address)
      save(STORAGE_KEY_WALLETS, this.savedWallets)
      if (this.currentWallet?.address === address) this.currentWallet = null
    },

    addMultiSig(info) {
      const existing = this.savedMultiSig.findIndex(w => w.address === info.address)
      if (existing >= 0) {
        this.savedMultiSig[existing] = info
      } else {
        this.savedMultiSig.push(info)
      }
      save(STORAGE_KEY_MULTISIG, this.savedMultiSig)
    },

    deleteMultiSig(address) {
      this.savedMultiSig = this.savedMultiSig.filter(w => w.address !== address)
      save(STORAGE_KEY_MULTISIG, this.savedMultiSig)
      if (this.currentMultiSig === address) this.currentMultiSig = null
    },

    setCurrentMultiSig(address) {
      this.currentMultiSig = address
    }
  }
})
