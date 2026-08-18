<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { buscarCandidatos } from '../firebase/candidatosService'

const route = useRoute()

// Lemos o que a Home enviou na URL
const ufUrl = route.query.uf || ''
const cargoUrl = route.query.cargo || ''

const carregando = ref(true)
const busca = ref('')
const partidoSelecionado = ref('')
const candidatos = ref([])

// Dicionário para o título
const CARGOS = {
  1: "Presidente", 2: "Vice-Presidente", 3: "Governador", 4: "Vice-Governador",
  5: "Senador", 6: "Deputado Federal", 7: "Deputado Estadual", 8: "Deputado Distrital",
  9: "1º Suplente", 10: "2º Suplente"
};

// Computa o título dinâmico
const tituloPagina = computed(() => {
  if (cargoUrl && ufUrl) {
    const nomeCargo = CARGOS[cargoUrl] || 'Candidatos'
    const textoUf = ufUrl === 'BR' ? 'no Brasil' : `em ${ufUrl}`
    return `Candidaturas para ${nomeCargo} ${textoUf}`
  }
  return 'Todos os Candidatos'
})

onMounted(async () => {
  // Passamos os filtros da URL para buscar apenas o que foi selecionado na Home
  candidatos.value = await buscarCandidatos(ufUrl, cargoUrl)
  carregando.value = false
})

const partidos = computed(() => {
  return [...new Set(candidatos.value.map(c => c.partido).filter(Boolean))]
})

const candidatosFiltrados = computed(() => {
  return candidatos.value.filter(c => {
    const nome = (c.nomeUrna || c.nome || '').toLowerCase()
    const completo = (c.nomeCompleto || '').toLowerCase()
    const termo = busca.value.toLowerCase()

    const combinaNome = nome.includes(termo) || completo.includes(termo)
    const combinaPartido = !partidoSelecionado.value || c.partido === partidoSelecionado.value
    return combinaNome && combinaPartido
  })
})

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">{{ tituloPagina }}</h1>
        <p class="text-slate-500 text-sm mt-1">Explore os perfis, patrimônio declarado e prestação de contas.</p>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <input
          v-model="busca"
          type="text"
          placeholder="Buscar candidato..."
          class="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />

        <select
          v-model="partidoSelecionado"
          class="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-slate-700"
        >
          <option value="">Todos os partidos</option>
          <option v-for="partido in partidos" :key="partido" :value="partido">{{ partido }}</option>
        </select>
      </div>
    </div>

    <div v-if="carregando" class="text-center py-16 text-slate-500 font-medium">
      Carregando candidatos do banco de dados...
    </div>

    <div v-else-if="candidatosFiltrados.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="candidato in candidatosFiltrados"
        :key="candidato.id"
        class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 overflow-hidden flex flex-col justify-between"
      >
        <div class="p-6">
          <div class="flex items-center space-x-4">
            <img
              :src="candidato.fotoUrl || 'https://via.placeholder.com/150'"
              :alt="candidato.nomeUrna || candidato.nome"
              class="w-16 h-16 rounded-full object-cover border-2 border-slate-100 shadow-sm"
            />
            <div>
              <span class="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-1">
                Nº {{ candidato.numero }}
              </span>
              <h2 class="text-lg font-bold text-slate-900 leading-tight">{{ candidato.nomeUrna || candidato.nome }}</h2>
              <p class="text-xs text-slate-500">{{ candidato.partido }}</p>
            </div>
          </div>

          <div class="mt-6 grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
            <div class="bg-slate-50 p-3 rounded-xl">
              <span class="text-xs text-slate-500 block font-medium">Arrecadado</span>
              <span class="text-sm font-bold text-emerald-600 block truncate">{{ formatarMoeda(candidato.totalReceitas) }}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl">
              <span class="text-xs text-slate-500 block font-medium">Despesas</span>
              <span class="text-sm font-bold text-rose-600 block truncate">{{ formatarMoeda(candidato.totalDespesas) }}</span>
            </div>
          </div>

          <div class="mt-3 bg-slate-50 p-3 rounded-xl flex justify-between items-center">
            <span class="text-xs text-slate-500 font-medium">Bens Declarados</span>
            <span class="text-sm font-bold text-slate-800">{{ formatarMoeda(candidato.totalBens) }}</span>
          </div>
        </div>

        <div class="bg-slate-50 px-6 py-3 border-t border-slate-100">
          <button class="w-full text-center py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors">
            Ver Prestação de Contas
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <p class="text-slate-500 text-base">Nenhum candidato encontrado com os critérios selecionados.</p>
    </div>
  </div>
</template>
