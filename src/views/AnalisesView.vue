<script setup>
import { ref, computed, onMounted } from 'vue'
import { buscarCandidatos } from '../firebase/candidatosService'

const carregando = ref(true)

// 1. AQUI MUDAMOS O PADRÃO PARA INICIAR NO BRASIL (BR) E PRESIDENTE (1)
const ufSelecionada = ref('BR')
const cargoSelecionado = ref(1)

const candidatos = ref([])

const estados = [
  { sigla: 'BR', nome: 'Nacional (BR)' },
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
]

// 2. CARGOS DINÂMICOS (Igual fizemos na HomeView)
const cargos = computed(() => {
  if (ufSelecionada.value === 'BR') {
    return [
      { id: 1, nome: 'Presidente' },
      { id: 2, nome: 'Vice-Presidente' },
    ]
  } else {
    return [
      { id: 3, nome: 'Governador' },
      { id: 4, nome: 'Vice-Governador' },
      { id: 5, nome: 'Senador' },
      { id: 6, nome: 'Deputado Federal' },
      { id: 7, nome: 'Deputado Estadual' },
    ]
  }
})

const carregarDados = async () => {
  carregando.value = true
  candidatos.value = await buscarCandidatos(ufSelecionada.value, cargoSelecionado.value)
  carregando.value = false
}

// 3. FUNÇÕES QUE LIDAM COM AS MUDANÇAS NO DROPDOWN
const aoMudarUf = () => {
  if (ufSelecionada.value === 'BR') {
    cargoSelecionado.value = 1 // Muda para Presidente se for BR
  } else {
    cargoSelecionado.value = 3 // Muda para Governador se for Estado
  }
  carregarDados()
}

const aoMudarCargo = () => {
  carregarDados()
}

onMounted(() => {
  carregarDados()
})

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

// ==========================================
// INTELIGÊNCIA DOS DADOS (COMPUTED PROPERTIES)
// ==========================================

// KPIs Gerais
const kpis = computed(() => {
  const total = candidatos.value.length
  if (total === 0) return { total: 0, patrimonioSomado: 0, mediaBens: 0 }

  const soma = candidatos.value.reduce((acc, c) => acc + (c.totalBens || 0), 0)
  return {
    total,
    patrimonioSomado: soma,
    mediaBens: soma / total,
  }
})

// Ranking Top 10 Mais Ricos
const rankingRicos = computed(() => {
  const lista = [...candidatos.value].sort((a, b) => (b.totalBens || 0) - (a.totalBens || 0))
  const top10 = lista.slice(0, 10)
  const maiorPatrimonio = top10.length > 0 ? top10[0].totalBens : 1
  return { top10, maiorPatrimonio }
})

// Experiência (Novatos vs Veteranos)
const experiencia = computed(() => {
  let primeiraViagem = 0
  let experientes = 0
  candidatos.value.forEach((c) => {
    if (c.eleicoesAnteriores && c.eleicoesAnteriores.length > 1) experientes++
    else primeiraViagem++
  })

  const total = primeiraViagem + experientes || 1
  return {
    primeiraViagem,
    experientes,
    pctNovatos: Math.round((primeiraViagem / total) * 100),
    pctExperientes: Math.round((experientes / total) * 100),
  }
})

// Ranking por Partidos
const rankingPartidos = computed(() => {
  const mapPartidos = {}
  candidatos.value.forEach((c) => {
    const p = c.partido || 'Sem Partido'
    if (!mapPartidos[p]) mapPartidos[p] = 0
    mapPartidos[p] += c.totalBens || 0
  })

  const lista = Object.keys(mapPartidos)
    .map((key) => ({
      partido: key,
      total: mapPartidos[key],
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const maiorTotal = lista.length > 0 ? lista[0].total : 1
  return { lista, maiorTotal }
})
</script>

<template>
  <div class="space-y-8 pb-12">
    <!-- CABEÇALHO E FILTROS -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">Análise de Dados</h1>
        <p class="text-slate-500 text-sm mt-1">
          Comparativos baseados nos candidatos importados para o seu painel.
        </p>
      </div>

      <div class="flex gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <select
          v-model="ufSelecionada"
          @change="aoMudarUf"
          class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="est in estados" :key="est.sigla" :value="est.sigla">
            {{ est.sigla }} - {{ est.nome }}
          </option>
        </select>

        <select
          v-model="cargoSelecionado"
          @change="aoMudarCargo"
          class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="carg in cargos" :key="carg.id" :value="carg.id">{{ carg.nome }}</option>
        </select>
      </div>
    </div>

    <!-- ESTADO DE CARREGAMENTO -->
    <div v-if="carregando" class="text-center py-20 bg-white rounded-2xl border border-slate-200">
      <div
        class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
      ></div>
      <p class="text-slate-500 font-medium text-sm">Calculando estatísticas...</p>
    </div>

    <!-- ESTADO VAZIO -->
    <div
      v-else-if="candidatos.length === 0"
      class="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm"
    >
      <p class="text-slate-500 text-base font-bold mb-2">
        Nenhum dado importado para esta seleção.
      </p>
      <p class="text-sm text-slate-400">
        Vá até a página Inicial e importe os candidatos do TSE para gerar análises.
      </p>
    </div>

    <!-- DASHBOARD -->
    <div v-else class="space-y-6">
      <!-- 1. KPIS GRID -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Candidatos Analisados
          </p>
          <p class="text-3xl font-black text-slate-900">{{ kpis.total }}</p>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm bg-emerald-50/30">
          <p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            Patrimônio Declarado (Total)
          </p>
          <p class="text-2xl font-black text-emerald-900">
            {{ formatarMoeda(kpis.patrimonioSomado) }}
          </p>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm bg-blue-50/30">
          <p class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            Média de Bens por Candidato
          </p>
          <p class="text-2xl font-black text-blue-900">{{ formatarMoeda(kpis.mediaBens) }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 2. RANKING DE RICOS (Ocupa 2 colunas) -->
        <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <span class="w-2 h-6 bg-blue-600 rounded-full inline-block"></span> Top 10 Maiores
            Patrimônios
          </h2>

          <div class="space-y-4">
            <div v-for="(cand, index) in rankingRicos.top10" :key="cand.id" class="relative">
              <div class="flex justify-between text-sm mb-1">
                <span class="font-bold text-slate-800"
                  >{{ index + 1 }}. {{ cand.nomeUrna }}
                  <span class="text-slate-400 font-normal">({{ cand.partido }})</span></span
                >
                <span class="font-bold text-slate-900">{{ formatarMoeda(cand.totalBens) }}</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  class="bg-blue-600 h-2.5 rounded-full"
                  :style="{ width: `${(cand.totalBens / rankingRicos.maiorPatrimonio) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- COLUNA DA DIREITA -->
        <div class="space-y-6">
          <!-- 3. RENOVAÇÃO VS VELHA GUARDA -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 class="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide border-b pb-2">
              Perfil Eleitoral
            </h2>

            <div class="space-y-5 mt-4">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-bold text-slate-700">1ª Eleição (Novatos)</span>
                  <span class="font-bold text-emerald-600">{{ experiencia.pctNovatos }}%</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-3">
                  <div
                    class="bg-emerald-500 h-3 rounded-full"
                    :style="{ width: `${experiencia.pctNovatos}%` }"
                  ></div>
                </div>
                <p class="text-xs text-slate-400 mt-1">
                  {{ experiencia.primeiraViagem }} candidatos
                </p>
              </div>

              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-bold text-slate-700">Veteranos (2+ eleições)</span>
                  <span class="font-bold text-amber-600">{{ experiencia.pctExperientes }}%</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-3">
                  <div
                    class="bg-amber-500 h-3 rounded-full"
                    :style="{ width: `${experiencia.pctExperientes}%` }"
                  ></div>
                </div>
                <p class="text-xs text-slate-400 mt-1">{{ experiencia.experientes }} candidatos</p>
              </div>
            </div>
          </div>

          <!-- 4. PARTIDOS MAIS RICOS -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 class="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide border-b pb-2">
              Patrimônio por Partido
            </h2>

            <div class="space-y-3 mt-4">
              <div v-for="partido in rankingPartidos.lista" :key="partido.partido">
                <div class="flex justify-between text-xs mb-1">
                  <span class="font-bold text-slate-700">{{ partido.partido }}</span>
                  <span class="font-bold text-slate-900">{{ formatarMoeda(partido.total) }}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    class="bg-slate-800 h-1.5 rounded-full"
                    :style="{ width: `${(partido.total / rankingPartidos.maiorTotal) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
