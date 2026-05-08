import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/about',
      name: 'about',
      component: () => import('@/options/pages/AboutPage.vue'),
    },
    {
      path: '/ui',
      name: 'ui',
      component: () => import('@/options/pages/UiPage.vue'),
    },
    {
      path: '/general',
      name: 'general',
      component: () => import('@/options/pages/GeneralPage.vue'),
    },
    {
      path: '/io',
      name: 'io',
      component: () => import('@/options/pages/IoPage.vue'),
    },
    {
      path: '/profile/:name(.*)*',
      name: 'profile',
      component: () => import('@/options/pages/ProfilePage.vue'),
      props: true,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/about',
    },
  ],
});

export default router;
