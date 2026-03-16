import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/ai/generate' },
    { path: '/ai/generate', component: () => import('../views/AiGenerateView.vue') },
    { path: '/ai/modify', component: () => import('../views/AiModifyView.vue') },
    { path: '/ai/url-analyze', component: () => import('../views/UrlAnalyzeView.vue') },
    { path: '/recorder', component: () => import('../views/TestRecorderView.vue') },
    { path: '/visual/builder', component: () => import('../views/VisualTestBuilderView.vue') },
    { path: '/tests', component: () => import('../views/TestManagerView.vue') },
    { path: '/tests/explorer', component: () => import('../views/TestExplorerView.vue') },
    { path: '/runner', component: () => import('../views/TestRunnerView.vue') },
    { path: '/config', component: () => import('../views/ConfigView.vue') },
  ],
});
