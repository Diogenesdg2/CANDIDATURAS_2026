<script setup>
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800">
    <!-- Navbar -->
    <nav class="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">

          <RouterLink to="/" class="flex items-center space-x-3 cursor-pointer">
            <div class="bg-blue-600 p-2 rounded-lg text-white">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div>
              <span class="font-bold text-lg tracking-tight block">Eleições 2026</span>
              <span class="text-xs text-slate-400 block -mt-1">Transparência & Contas</span>
            </div>
          </RouterLink>

          <div class="flex space-x-2">
            <RouterLink
              to="/"
              active-class="bg-slate-800 text-white"
              class="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Início
            </RouterLink>

            <RouterLink
              to="/candidatos"
              active-class="bg-slate-800 text-white"
              class="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Candidatos
            </RouterLink>
          </div>

        </div>
      </div>
    </nav>

    <!-- Conteúdo Dinâmico -->
    <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <RouterView />
    </main>
  </div>
</template>
