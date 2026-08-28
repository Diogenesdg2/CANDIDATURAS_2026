<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

// Controle do Dark Mode
const isDark = ref(false)

const toggleDarkMode = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

onMounted(() => {
  // Verifica se o usuário já tinha escolhido Dark Mode antes ou se o Windows/Celular dele já é escuro por padrão
  if (
    localStorage.getItem('theme') === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})
</script>

<template>
  <!-- O fundo agora muda automaticamente: bg-slate-50 no claro, dark:bg-slate-900 no escuro -->
  <div
    class="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans text-slate-900 dark:text-slate-100 flex flex-col"
  >
    <!-- CABEÇALHO ESCURO -->
    <header
      class="bg-slate-900 dark:bg-black border-b border-slate-800 sticky top-0 z-40 shadow-md transition-colors duration-300"
      role="banner"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          class="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-20 py-4 sm:py-0 gap-4"
        >
          <!-- LOGO E TÍTULO -->
          <RouterLink
            to="/"
            class="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl p-1 -ml-1"
            aria-label="Voltar para a página inicial"
          >
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
            <div class="flex flex-col justify-center">
              <h1 class="text-[22px] font-bold text-white tracking-tight leading-none">
                Eleições 2026
              </h1>
              <p class="text-[13px] text-slate-400 mt-0.5 leading-none">Transparência & Contas</p>
            </div>
          </RouterLink>

          <!-- NAVEGAÇÃO E BOTÃO DE TEMA -->
          <div
            class="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar"
          >
            <nav aria-label="Menu principal" class="flex items-center gap-1 sm:gap-2">
              <RouterLink
                to="/"
                class="px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500"
                active-class="bg-slate-800 text-white"
                exact-active-class="bg-slate-800 text-white"
                :class="[
                  $route.path === '/'
                    ? ''
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white',
                ]"
              >
                Início
              </RouterLink>

              <RouterLink
                to="/analises"
                class="px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500"
                active-class="bg-slate-800 text-white"
                :class="[
                  $route.path === '/analises'
                    ? ''
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white',
                ]"
              >
                Análises
              </RouterLink>

              <RouterLink
                to="/candidatos"
                class="px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500"
                active-class="bg-slate-800 text-white shadow-sm"
                :class="[
                  $route.path === '/candidatos'
                    ? ''
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white',
                ]"
              >
                Candidatos
              </RouterLink>

              <router-link
                to="/cola"
                class="hover:text-blue-500 transition-colors flex items-center gap-1"
              >
                Cola Eleitoral
              </router-link>

              <RouterLink
                to="/votacao"
                class="px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center gap-1.5"
                active-class="bg-purple-900/40 text-purple-300"
                :class="[
                  $route.path === '/votacao'
                    ? ''
                    : 'text-purple-300 hover:bg-slate-800/50 hover:text-purple-200',
                ]"
              >
                Enquete
              </RouterLink>

              <RouterLink
                to="/acessibilidade"
                class="px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1.5"
                active-class="bg-blue-900/40 text-blue-300"
                :class="[
                  $route.path === '/acessibilidade'
                    ? ''
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white',
                ]"
                aria-label="Página de Acessibilidade"
              >
                ♿ Acessibilidade
              </RouterLink>
            </nav>

            <!-- DIVISÓRIA -->
            <div class="h-6 w-px bg-slate-700 mx-1 hidden sm:block"></div>

            <!-- BOTÃO DARK MODE (SOL / LUA) -->
            <button
              @click="toggleDarkMode"
              class="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              :aria-label="isDark ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'"
            >
              <!-- Ícone do Sol (Aparece no Dark Mode para voltar pro Claro) -->
              <svg
                v-if="isDark"
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                ></path>
              </svg>
              <!-- Ícone da Lua (Aparece no Modo Claro para ir pro Escuro) -->
              <svg
                v-else
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                ></path>
              </svg>
            </button>
          </div>
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
