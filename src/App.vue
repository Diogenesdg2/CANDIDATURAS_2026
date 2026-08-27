<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
    <!-- CABEÇALHO -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm" role="banner">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          class="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-20 py-4 sm:py-0 gap-4"
        >
          <!-- LOGO E TÍTULO -->
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-inner"
              aria-hidden="true"
            >
              <svg
                class="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-black text-slate-900 tracking-tight leading-none">
                Eleições 2026
              </h1>
              <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Auditoria e Transparência
              </p>
            </div>
          </div>

          <!-- NAVEGAÇÃO PRINCIPAL -->
          <nav
            aria-label="Menu principal"
            class="flex items-center gap-1 sm:gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar"
          >
            <RouterLink
              to="/"
              class="px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500"
              active-class="bg-blue-50 text-blue-700"
              exact-active-class="bg-blue-50 text-blue-700"
              :class="[
                $route.path === '/' ? '' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ]"
            >
              Início (Importar)
            </RouterLink>

            <RouterLink
              to="/analises"
              class="px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500"
              active-class="bg-blue-50 text-blue-700"
              :class="[
                $route.path === '/analises'
                  ? ''
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ]"
            >
              📊 Análises
            </RouterLink>

            <RouterLink
              to="/candidatos"
              class="px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500"
              active-class="bg-slate-900 text-white shadow-md"
              :class="[
                $route.path === '/candidatos'
                  ? ''
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ]"
            >
              Candidatos
            </RouterLink>

            <!-- NOVO LINK DE ACESSIBILIDADE NO TOPO -->
            <RouterLink
              to="/acessibilidade"
              class="px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500"
              active-class="bg-emerald-50 text-emerald-700"
              :class="[
                $route.path === '/acessibilidade'
                  ? ''
                  : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800',
              ]"
              aria-label="Página de Acessibilidade"
            >
              ♿ Acessibilidade
            </RouterLink>
          </nav>
        </div>
      </div>
    </header>

    <!-- ÁREA DE RENDERIZAÇÃO DAS PÁGINAS -->
    <div class="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <RouterView />
    </div>
  </div>
</template>

<style>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
