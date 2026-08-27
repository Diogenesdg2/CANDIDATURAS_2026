import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CandidatosView from '../views/CandidatosView.vue'
import AnalisesView from '../views/AnalisesView.vue'
import AcessibilidadeView from '../views/AcessibilidadeView.vue'
import VotacaoView from '../views/VotacaoView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/candidatos',
      name: 'candidatos',
      component: CandidatosView,
    },
    {
      path: '/analises',
      name: 'analises',
      component: AnalisesView,
    },

    {
      path: '/acessibilidade',
      name: 'acessibilidade',
      component: AcessibilidadeView,
    },
    {
      path: '/votacao',
      name: 'votacao',
      component: VotacaoView,
    },
  ],
})

export default router
