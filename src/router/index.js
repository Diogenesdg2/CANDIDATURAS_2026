import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CandidatosView from '../views/CandidatosView.vue'
import AnalisesView from '../views/AnalisesView.vue'
import AcessibilidadeView from '../views/AcessibilidadeView.vue'

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
      path: '/acessibilidade', // <--- Registrar a nova rota
      name: 'acessibilidade',
      component: AcessibilidadeView, // <--- Certifique-se de importar o componente correto
    },
  ],
})

export default router
