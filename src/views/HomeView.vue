<script setup>
import { ref, onMounted, computed } from 'vue'
import { buscarCandidatos, popularDadosExemplo } from '../firebase/candidatosService'

const carregando = ref(true)
const candidatos = ref([])

const carregarDados = async () => {
  carregando.value = true
  candidatos.value = await buscarCandidatos()
  carregando.value = false
}

// Cálculos automáticos baseados nos documentos retornados
const totalArrecadado = computed(() => {
  return candidatos.value.reduce((acc, c) => acc + (Number(c.totalReceitas) || 0), 0)
})

const totalGasto = computed(() => {
  return candidatos.value.reduce((acc, c) => acc + (Number(c.totalDespesas) || 0), 0)
})

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

const handlePopularDados = async () => {
  await popularDadosExemplo()
  await carregarDados()
}

onMounted(() => {
  carregarDados()
})
</script>

<template>
  <div class="space-y-8">
    <header>
      <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Painel de Transparência</h1>
      <p class="mt-2 text-slate-600 text-sm">Acompanhe as receitas, despesas e prestação de contas dos candidatos à presidência do Brasil em 2026.</p>
    </header>

    <!-- Estado de Carregando -->
    <div v-if="carregando" class="text-center py-12 text-slate-500 font-medium">
      Carregando indicadores financeiros...
    </div>

    <!-- Cards de Resumo -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-blue-600">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Total Arrecadado</h3>
        <p class="mt-2 text-3xl font-black text-slate-900">{{ formatarMoeda(totalArrecadado) }}</p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-rose-500">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Total Gasto</h3>
        <p class="mt-2 text-3xl font-black text-slate-900">{{ formatarMoeda(totalGasto) }}</p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-emerald-500">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">Candidatos Registrados</h3>
        <p class="mt-2 text-3xl font-black text-slate-900">{{ candidatos.length }}</p>
      </div>
    </div>

    <!-- Ações e Atalhos -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 class="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Ações Rápidas</h2>
      <div class="flex flex-wrap gap-4">
        <RouterLink
          to="/candidatos"
          class="inline-flex items-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          Visualizar Lista de Candidatos
        </RouterLink>


      </div>
    </div>
  </div>
</template>
