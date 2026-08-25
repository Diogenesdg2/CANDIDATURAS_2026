<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { buscarCandidatos } from '../firebase/candidatosService'

const route = useRoute()

// Lemos os filtros que a Home enviou na URL
const ufUrl = route.query.uf || ''
const cargoUrl = route.query.cargo || ''

const carregando = ref(true)
const busca = ref('')
const partidoSelecionado = ref('')
const candidatos = ref([])

// Variáveis para controlar os Modais
const modalAberto = ref(false)
const tipoModal = ref('') // 'bens' ou 'eleicoes'
const candidatoAtivo = ref({})

const abrirModal = (candidato, tipo) => {
  candidatoAtivo.value = candidato
  tipoModal.value = tipo
  modalAberto.value = true
}

// Dicionário para o título
const CARGOS = {
  1: 'Presidente',
  2: 'Vice-Presidente',
  3: 'Governador',
  4: 'Vice-Governador',
  5: 'Senador',
  6: 'Deputado Federal',
  7: 'Deputado Estadual',
  8: 'Deputado Distrital',
  9: '1º Suplente',
  10: '2º Suplente',
}

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
  // Como os dados já vieram salvos pela Home, aqui apenas lemos do Firestore instantaneamente
  candidatos.value = await buscarCandidatos(ufUrl, cargoUrl)
  carregando.value = false
})

const partidos = computed(() => {
  return [...new Set(candidatos.value.map((c) => c.partido).filter(Boolean))]
})

const candidatosFiltrados = computed(() => {
  return candidatos.value.filter((c) => {
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
        <p class="text-slate-500 text-sm mt-1">
          <span v-if="!carregando" class="font-semibold text-blue-600"
            >{{ candidatos.length }} candidatos encontrados</span
          >
          <span v-else>Carregando registros...</span>
        </p>
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

    <!-- TELA DE CARREGAMENTO SIMPLES -->
    <div v-if="carregando" class="text-center py-20 bg-white rounded-2xl border border-slate-200">
      <div
        class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
      ></div>
      <p class="text-slate-500 font-medium text-sm">Carregando candidatos do banco de dados...</p>
    </div>

    <!-- LISTAGEM DE CARDS -->
    <div
      v-else-if="candidatosFiltrados.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <div
        v-for="candidato in candidatosFiltrados"
        :key="candidato.id"
        class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 overflow-hidden flex flex-col justify-between"
      >
        <div class="p-6">
          <!-- Foto Retangular Estilo TSE -->
          <div
            class="relative mb-4 flex justify-center bg-slate-50 py-4 rounded-xl border border-slate-100"
          >
            <img
              :src="candidato.fotoUrl"
              :alt="candidato.nomeUrna"
              class="w-32 h-40 object-cover border border-slate-300 shadow-sm"
              @error="
                (e) => {
                  e.target.onerror = null
                  e.target.src =
                    'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
                }
              "
            />
          </div>

          <div class="flex items-center space-x-4 mb-4">
            <div>
              <span
                class="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-1"
              >
                Nº {{ candidato.numero }}
              </span>
              <h2 class="text-lg font-bold text-slate-900 leading-tight">
                {{ candidato.nomeUrna }}
              </h2>
              <p class="text-xs text-slate-500">{{ candidato.partido }}</p>
            </div>
          </div>

          <!-- Situações do TSE (Cor Azulada/Esverdeada padrão) -->
          <div class="space-y-2 mb-6">
            <div class="bg-[#1f6d6d] p-3 rounded-sm text-white">
              <p class="text-sm font-bold truncate">
                {{ candidato.situacaoCandidatura || 'Não informado' }}
              </p>
              <p class="text-[10px] uppercase opacity-90">Situação Candidatura</p>
            </div>
            <div class="bg-[#1f6d6d] p-3 rounded-sm text-white">
              <p class="text-sm font-bold truncate">
                {{ candidato.situacaoPartido || 'Não informado' }}
              </p>
              <p class="text-[10px] uppercase opacity-90">Situação Partido/Federação/Coligação</p>
            </div>
          </div>

          <!-- Limites de Gastos -->
          <div class="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
            <div class="bg-slate-50 p-3 rounded-xl">
              <span
                class="text-[10px] uppercase tracking-wider text-slate-500 block font-bold mb-0.5"
                >Limite 1º Turno</span
              >
              <span
                class="text-sm font-bold text-slate-700 block truncate"
                :title="formatarMoeda(candidato.limiteGastos1T)"
              >
                {{ formatarMoeda(candidato.limiteGastos1T) }}
              </span>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl">
              <span
                class="text-[10px] uppercase tracking-wider text-slate-500 block font-bold mb-0.5"
                >Limite 2º Turno</span
              >
              <span
                class="text-sm font-bold text-slate-700 block truncate"
                :title="formatarMoeda(candidato.limiteGastos2T)"
              >
                {{
                  candidato.limiteGastos2T > 0
                    ? formatarMoeda(candidato.limiteGastos2T)
                    : 'Não se aplica'
                }}
              </span>
            </div>
          </div>

          <div class="mt-3 bg-slate-50 p-3 rounded-xl flex justify-between items-center">
            <span class="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5"
              >Bens Declarados</span
            >
            <span class="text-sm font-bold text-slate-800">{{
              formatarMoeda(candidato.totalBens)
            }}</span>
          </div>
        </div>

        <!-- Botões de Ação do Card -->
        <div class="bg-slate-50 px-6 py-3 border-t border-slate-100 flex gap-2">
          <button
            @click="abrirModal(candidato, 'bens')"
            class="flex-1 text-center py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Bens do Candidato
          </button>
          <button
            @click="abrirModal(candidato, 'eleicoes')"
            class="flex-1 text-center py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Eleições
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <p class="text-slate-500 text-base">
        Nenhum candidato encontrado com os critérios selecionados.
      </p>
    </div>
  </div>

  <!-- MODAL FLUTUANTE (BENS E ELEIÇÕES) -->
  <div
    v-if="modalAberto"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
  >
    <div
      class="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl animate-fade-in"
    >
      <div
        class="p-5 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10"
      >
        <div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
            {{ tipoModal === 'bens' ? 'Bens do Candidato' : 'Histórico de Eleições' }}
          </span>
          <h3 class="text-xl font-extrabold text-slate-900 mt-0.5">
            {{ candidatoAtivo.nomeUrna || candidatoAtivo.nome }}
          </h3>
        </div>
        <button
          @click="modalAberto = false"
          class="text-slate-400 hover:text-slate-600 text-2xl font-bold px-2"
        >
          &times;
        </button>
      </div>

      <div class="p-6 space-y-4">
        <!-- Conteúdo dos Bens -->
        <div v-if="tipoModal === 'bens'">
          <div
            class="p-4 bg-emerald-50 rounded-xl mb-4 border border-emerald-100 flex justify-between items-center"
          >
            <span class="text-xs uppercase tracking-wider text-emerald-800 font-bold"
              >Total em Bens</span
            >
            <span class="text-base text-emerald-900 font-extrabold">{{
              formatarMoeda(candidatoAtivo.totalBens)
            }}</span>
          </div>

          <div v-if="candidatoAtivo.bens && candidatoAtivo.bens.length > 0">
            <div
              v-for="(bem, i) in candidatoAtivo.bens"
              :key="i"
              class="border-b border-slate-100 pb-3 mb-3 last:border-0"
            >
              <p class="text-xs font-bold uppercase text-slate-400">{{ bem.tipo }}</p>
              <p class="text-sm font-semibold text-slate-800 mt-0.5">{{ bem.descricao }}</p>
              <p class="text-sm font-bold text-slate-900 mt-1">{{ formatarMoeda(bem.valor) }}</p>
            </div>
          </div>
          <div v-else class="text-center py-6 text-slate-400 text-sm">
            Nenhum detalhe de bem cadastrado para este candidato.
          </div>
        </div>

        <!-- Conteúdo das Eleições -->
        <div v-if="tipoModal === 'eleicoes'">
          <div
            v-if="candidatoAtivo.eleicoesAnteriores && candidatoAtivo.eleicoesAnteriores.length > 0"
          >
            <div
              v-for="(eleicao, i) in candidatoAtivo.eleicoesAnteriores"
              :key="i"
              class="p-4 border border-slate-200 rounded-xl mb-3 bg-slate-50"
            >
              <p class="text-sm font-bold text-slate-900 leading-snug">
                {{ candidatoAtivo.nomeUrna }} número
                {{ eleicao.numero || candidatoAtivo.numero }} candidato a
                {{ eleicao.cargo || candidatoAtivo.cargo }}
              </p>
              <p class="text-xs text-slate-500 mt-1">
                Partido {{ eleicao.partido || candidatoAtivo.partido }} em {{ eleicao.ano || 2026 }}
              </p>
            </div>
          </div>
          <div v-else class="text-center py-6 text-slate-400 text-sm">
            Nenhum histórico anterior registrado.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
