import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import RequestsView from '@/views/RequestsView.vue'
import UsersView from '@/views/UsersView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/requests',
      name: 'requests',
      component: RequestsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/users',
      name: 'users',
      component: UsersView,
      meta: { requiresAuth: true, requiresRoles: ['Admin'] },
    },
    {
      path: '/',
      redirect: '/requests',
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/requests',
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return next('/requests')
  }

  if (to.meta.requiresRoles && Array.isArray(to.meta.requiresRoles)) {
    if (!to.meta.requiresRoles.includes(authStore.role)) {
      return next('/requests')
    }
  }

  next()
})

export default router
