import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../pages/HomePage.vue') },
  { path: '/create-wallet', component: () => import('../pages/CreateWalletPage.vue') },
  { path: '/create-multisig', component: () => import('../pages/CreateMultiSigPage.vue') },
  {
    path: '/wallet/:address',
    component: () => import('../components/WalletLayout.vue'),
    children: [
      { path: '', component: () => import('../pages/DashboardPage.vue') },
      { path: 'transactions', component: () => import('../pages/TransactionsPage.vue') },
      { path: 'rules', component: () => import('../pages/RulesPage.vue') },
      { path: 'roles', component: () => import('../pages/RolesPage.vue') },
      { path: 'settings', component: () => import('../pages/SettingsPage.vue') }
    ]
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
