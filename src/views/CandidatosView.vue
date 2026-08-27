<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  buscarCandidatos,
  atualizarStatusCandidato,
  buscarRaioXCamara,
} from '../firebase/candidatosService'

const route = useRoute()
const ufUrl = route.query.uf || ''
const cargoUrl = route.query.cargo || ''

const carregando = ref(true)
const busca = ref('')
const partidoSelecionado = ref('')
const candidatos = ref([])

const atualizandoId = ref(null)
const atualizandoTodos = ref(false)
const progressoGlobal = ref({ atual: 0, total: 0 })

// ----------------------------------------------------
// CONTROLE DOS MODAIS E RAIO-X
// ----------------------------------------------------
const modalAberto = ref(false)
const tipoModal = ref('')
const candidatoAtivo = ref({})

const dadosRaioX = ref(null)
const raioxLoading = ref(false)
const deputadosAtuais = ref([])

const abrirModal = async (candidato, tipo) => {
  candidatoAtivo.value = candidato
  tipoModal.value = tipo
  modalAberto.value = true

  if (tipo === 'raiox') {
    dadosRaioX.value = null
    raioxLoading.value = true
    dadosRaioX.value = await buscarRaioXCamara(candidato.nomeUrna, candidato.uf)
    raioxLoading.value = false
  }
}

// ----------------------------------------------------
// MODO MANO A MANO (COMPARAÇÃO VERSUS)
// ----------------------------------------------------
const candidatosComparacao = ref([])
const modalComparacaoAberto = ref(false)

const toggleComparacao = (candidato) => {
  const index = candidatosComparacao.value.findIndex((c) => c.id === candidato.id)
  if (index > -1) {
    candidatosComparacao.value.splice(index, 1)
  } else {
    if (candidatosComparacao.value.length >= 2) {
      alert('Você só pode comparar 2 candidatos por vez! Desmarque um para escolher outro.')
      return
    }
    candidatosComparacao.value.push(candidato)
  }
}

const isSelecionadoParaComparar = (candidato) => {
  return candidatosComparacao.value.some((c) => c.id === candidato.id)
}

const abrirComparacao = () => {
  if (candidatosComparacao.value.length === 2) modalComparacaoAberto.value = true
}

const limparComparacao = () => {
  candidatosComparacao.value = []
}

const obterMaiorBem = (bens) => {
  if (!bens || bens.length === 0) return { descricao: 'Nenhum bem declarado', valor: 0 }
  const ordenado = [...bens].sort((a, b) => b.valor - a.valor)
  return ordenado[0]
}

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

const tituloPagina = computed(() => {
  if (cargoUrl && ufUrl) {
    const nomeCargo = CARGOS[cargoUrl] || 'Candidatos'
    const textoUf = ufUrl === 'BR' ? 'no Brasil' : `em ${ufUrl}`
    return `Candidaturas para ${nomeCargo} ${textoUf}`
  }
  return 'Todos os Candidatos'
})

onMounted(async () => {
  candidatos.value = await buscarCandidatos(ufUrl, cargoUrl)

  try {
    const res = await fetch('https://dadosabertos.camara.leg.br/api/v2/deputados')
    if (res.ok) {
      const data = await res.json()
      deputadosAtuais.value = data.dados
    }
  } catch (e) {
    console.warn('Aviso: Não foi possível carregar a lista prévia da Câmara.', e)
  }

  carregando.value = false
})

const isDeputadoCamara = (candidato) => {
  if (deputadosAtuais.value.length === 0) return true
  const normalizar = (str) =>
    str
      ? str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
          .trim()
      : ''
  const nomeUrnaCand = normalizar(candidato.nomeUrna)

  return deputadosAtuais.value.some((deputado) => {
    const nomeDeputado = normalizar(deputado.nome)
    const ufBate = candidato.uf === 'BR' || deputado.siglaUf === candidato.uf
    return nomeDeputado === nomeUrnaCand && ufBate
  })
}

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

const calcularIdade = (dataStr) => {
  if (!dataStr) return 'Idade N/I'
  let anoNasc = 0
  if (dataStr.includes('/')) anoNasc = parseInt(dataStr.split('/')[2])
  else if (dataStr.includes('-')) anoNasc = parseInt(dataStr.split('-')[0])
  if (anoNasc > 0) return 2026 - anoNasc + ' anos'
  return 'Idade N/I'
}

const verificarStatusEmTempoReal = async (candidato) => {
  if (atualizandoTodos.value) return
  atualizandoId.value = candidato.id
  try {
    const novosDados = await atualizarStatusCandidato(candidato.id, candidato.idTse, candidato.uf)
    candidato.situacaoCandidatura = novosDados.situacaoCandidatura
    candidato.situacaoPartido = novosDados.situacaoPartido
    candidato.totalBens = novosDados.totalBens
    candidato.bens = novosDados.bens
    candidato.limiteGastos1T = novosDados.limiteGastos1T
    candidato.limiteGastos2T = novosDados.limiteGastos2T
    candidato.dataDeNascimento = novosDados.dataDeNascimento
    candidato.vices = [...novosDados.vices]
  } catch (error) {
    alert('Não foi possível sincronizar com o TSE no momento.')
  } finally {
    atualizandoId.value = null
  }
}

const atualizarTodosStatus = async () => {
  const lista = candidatosFiltrados.value
  if (lista.length === 0) return

  atualizandoTodos.value = true
  progressoGlobal.value = { atual: 0, total: lista.length }

  for (const candidato of lista) {
    atualizandoId.value = candidato.id
    try {
      const novosDados = await atualizarStatusCandidato(candidato.id, candidato.idTse, candidato.uf)
      candidato.situacaoCandidatura = novosDados.situacaoCandidatura
      candidato.situacaoPartido = novosDados.situacaoPartido
      candidato.totalBens = novosDados.totalBens
      candidato.bens = novosDados.bens
      candidato.limiteGastos1T = novosDados.limiteGastos1T
      candidato.limiteGastos2T = novosDados.limiteGastos2T
      candidato.dataDeNascimento = novosDados.dataDeNascimento
      candidato.vices = [...novosDados.vices]
    } catch (error) {
      console.warn(`Falha ao sincronizar ${candidato.nomeUrna}`)
    }
    progressoGlobal.value.atual++
  }

  atualizandoId.value = null
  atualizandoTodos.value = false
}

const getCorSituacao = (situacao) => {
  if (!situacao) return 'bg-[#1f6d6d]'
  const sitUpper = situacao.toUpperCase()
  if (
    sitUpper.includes('INDEFERIDO') ||
    sitUpper.includes('CASSADO') ||
    sitUpper.includes('CANCELADO') ||
    sitUpper.includes('INELEGÍVEL')
  ) {
    return 'bg-red-600'
  }
  if (sitUpper.includes('DEFERIDO')) {
    return 'bg-blue-600'
  }
  return 'bg-[#1f6d6d]'
}

const isInelegivel = (situacao) => {
  if (!situacao) return false
  const sitUpper = situacao.toUpperCase()
  return (
    sitUpper.includes('INDEFERIDO') ||
    sitUpper.includes('CASSADO') ||
    sitUpper.includes('CANCELADO') ||
    sitUpper.includes('INELEGÍVEL')
  )
}

const tratarErroFoto = (e, candidato) => {
  if (!e.target.dataset.triedFix) {
    e.target.dataset.triedFix = 'true'
    const idCorreto = candidato.uf === 'BR' ? '2039602022' : '2040602022'
    e.target.src = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${idCorreto}/${candidato.idTse}/${candidato.uf}`
  } else {
    e.target.onerror = null
    e.target.src =
      'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
  }
}

const compartilharWhatsApp = (candidato) => {
  const idade = calcularIdade(candidato.dataDeNascimento)
  const patrimonio = formatarMoeda(candidato.totalBens)
  const limite = formatarMoeda(candidato.limiteGastos1T)

  const isRuim = isInelegivel(candidato.situacaoCandidatura)
  const emojiStatus = isRuim
    ? '🛑'
    : candidato.situacaoCandidatura.toUpperCase().includes('DEFERIDO')
      ? '✅'
      : '⚖️'

  let textoVice = ''
  if (['Presidente', 'Governador'].includes(candidato.cargo)) {
    if (candidato.vices && candidato.vices.length > 0) {
      textoVice = `*Vice:* ${candidato.vices.join(' e ')}\n`
    } else {
      textoVice = `*Vice:* Aguardando liberação da documentação oficial pelo TSE\n`
    }
  }

  const texto =
    `🚨 *FICHA RÁPIDA: ${candidato.nomeUrna.toUpperCase()}* 🚨\nCandidato(a) a ${candidato.cargo} por ${candidato.uf === 'BR' ? 'todo o Brasil' : candidato.uf}\n\n*Número:* ${candidato.numero}\n*Partido:* ${candidato.partido}\n${textoVice}*Idade:* ${idade}\n\n${emojiStatus} *Situação no TSE:* ${candidato.situacaoCandidatura || 'Não informado'}\n\n💰 *Patrimônio Declarado:* ${patrimonio}\n📈 *Limite de Gastos (1º Turno):* ${limite}\n\n🔎 _Fonte: Dados extraídos diretamente do portal do TSE via Explorador Eleitoral_`.trim()

  const textoCodificado = encodeURIComponent(texto)
  window.open(`https://wa.me/?text=${textoCodificado}`, '_blank')
}
</script>

<template>
  <main class="space-y-6 relative pb-20">
    <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-900" tabindex="0">
          {{ tituloPagina }}
        </h1>
        <p class="text-slate-500 text-sm mt-1" aria-live="polite">
          <span v-if="!carregando" class="font-semibold text-blue-600"
            >{{ candidatosFiltrados.length }} candidatos encontrados</span
          >
          <span v-else>Carregando registros...</span>
        </p>
      </div>

      <div class="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center">
        <button
          v-if="candidatosFiltrados.length > 0"
          @click="atualizarTodosStatus"
          :disabled="atualizandoTodos"
          aria-label="Atualizar situação de todos os candidatos exibidos"
          class="px-4 py-2 bg-slate-900 hover:bg-slate-800 focus:ring-4 focus:ring-slate-300 disabled:bg-slate-400 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <svg
            v-if="atualizandoTodos"
            aria-hidden="true"
            class="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <svg
            v-else
            aria-hidden="true"
            class="h-4 w-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            ></path>
          </svg>
          {{
            atualizandoTodos
              ? `Sincronizando ${progressoGlobal.atual}/${progressoGlobal.total}...`
              : 'Sincronizar Tela com TSE'
          }}
        </button>

        <div class="flex flex-col sm:flex-row gap-3">
          <input
            v-model="busca"
            type="search"
            placeholder="Buscar candidato..."
            aria-label="Buscar candidato por nome"
            class="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-full sm:w-auto"
          />
          <select
            v-model="partidoSelecionado"
            aria-label="Filtrar candidatos por partido"
            class="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-slate-700 w-full sm:w-auto"
          >
            <option value="">Todos os partidos</option>
            <option v-for="partido in partidos" :key="partido" :value="partido">
              {{ partido }}
            </option>
          </select>
        </div>
      </div>
    </header>

    <div
      v-if="carregando"
      class="text-center py-20 bg-white rounded-2xl border border-slate-200"
      aria-live="assertive"
    >
      <div
        class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
        aria-hidden="true"
      ></div>
      <p class="text-slate-500 font-medium text-sm">Carregando candidatos do banco de dados...</p>
    </div>

    <section
      v-else-if="candidatosFiltrados.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      aria-label="Lista de Candidatos"
    >
      <article
        v-for="candidato in candidatosFiltrados"
        :key="candidato.id"
        class="relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 overflow-hidden flex flex-col justify-between focus-within:ring-2 focus-within:ring-blue-400"
        :class="{ 'ring-4 ring-indigo-500 shadow-lg': isSelecionadoParaComparar(candidato) }"
      >
        <div class="p-6">
          <div
            class="relative mb-4 flex justify-center bg-slate-50 py-4 rounded-xl border border-slate-100"
            :class="{ 'grayscale opacity-75': isInelegivel(candidato.situacaoCandidatura) }"
          >
            <img
              :src="candidato.fotoUrl"
              :alt="`Foto oficial de urna do candidato ${candidato.nomeUrna}`"
              class="w-32 h-40 object-cover border border-slate-300 shadow-sm rounded"
              @error="(e) => tratarErroFoto(e, candidato)"
            />
          </div>

          <div
            class="flex items-center space-x-4 mb-4"
            :class="{ 'opacity-75': isInelegivel(candidato.situacaoCandidatura) }"
          >
            <div class="w-full">
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  aria-label="Número de urna"
                  >Nº {{ candidato.numero }}</span
                >
                <span
                  class="inline-block bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200"
                  :aria-label="`Idade: ${calcularIdade(candidato.dataDeNascimento)}`"
                >
                  {{ calcularIdade(candidato.dataDeNascimento) }}
                </span>
              </div>
              <h2 class="text-lg font-bold text-slate-900 leading-tight">
                {{ candidato.nomeUrna }}
              </h2>
              <p class="text-xs text-slate-500" :aria-label="`Partido: ${candidato.partido}`">
                {{ candidato.partido }}
              </p>

              <!-- BLOCO DO VICE COM AVISO DE TRANSPARÊNCIA -->
              <div
                v-if="['Presidente', 'Governador'].includes(candidato.cargo)"
                class="mt-3 flex items-start gap-1.5 bg-indigo-50/50 border border-indigo-100 p-2 rounded-lg"
                aria-label="Vice"
              >
                <svg
                  aria-hidden="true"
                  class="w-4 h-4 text-indigo-500 mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  ></path>
                </svg>
                <div class="flex-grow">
                  <p class="text-[10px] font-bold text-indigo-800 leading-tight">
                    <span class="opacity-75 uppercase tracking-wider block mb-0.5">Vice:</span>
                    <template v-if="candidato.vices && candidato.vices.length > 0">
                      {{ candidato.vices.join(' • ') }}
                    </template>
                    <template v-else>
                      <!-- TEXTO PROFISSIONAL CASO O TSE AINDA NÃO TENHA LIBERADO -->
                      <span class="italic opacity-70 block mt-0.5 leading-snug">
                        O TSE ainda não processou a documentação. A informação oficial do vice está
                        indisponível no momento.
                      </span>
                    </template>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-2 mb-6" aria-live="polite">
            <div
              class="p-3 rounded-sm text-white transition-colors duration-300"
              :class="[
                atualizandoId === candidato.id ? 'opacity-70' : '',
                getCorSituacao(candidato.situacaoCandidatura),
              ]"
            >
              <p class="text-sm font-bold truncate">
                {{ candidato.situacaoCandidatura || 'Não informado' }}
              </p>
              <p class="text-[10px] uppercase opacity-90">Situação Candidatura</p>
            </div>
            <div
              class="p-3 rounded-sm text-white transition-colors duration-300"
              :class="[
                atualizandoId === candidato.id ? 'opacity-70' : '',
                getCorSituacao(candidato.situacaoPartido),
              ]"
            >
              <p class="text-sm font-bold truncate">
                {{ candidato.situacaoPartido || 'Não informado' }}
              </p>
              <p class="text-[10px] uppercase opacity-90">Situação Partido/Federação/Coligação</p>
            </div>
            <button
              @click="verificarStatusEmTempoReal(candidato)"
              :disabled="atualizandoId === candidato.id || atualizandoTodos"
              :aria-label="`Sincronizar dados completos de ${candidato.nomeUrna} no TSE`"
              class="w-full flex items-center justify-center gap-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 focus:ring-2 focus:ring-slate-400 text-slate-700 py-2 rounded-sm transition-all disabled:opacity-50 mt-1"
            >
              <svg
                v-if="atualizandoId === candidato.id"
                aria-hidden="true"
                class="animate-spin h-3.5 w-3.5 text-slate-700"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <svg
                v-else
                aria-hidden="true"
                class="h-3.5 w-3.5 text-slate-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                ></path>
              </svg>
              {{ atualizandoId === candidato.id ? 'Baixando dados...' : 'Sincronizar Ficha' }}
            </button>
          </div>

          <div
            class="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100"
            :class="{ 'opacity-75': isInelegivel(candidato.situacaoCandidatura) }"
          >
            <div class="bg-slate-50 p-3 rounded-xl">
              <span
                class="text-[10px] uppercase tracking-wider text-slate-500 block font-bold mb-0.5"
                >Limite 1º Turno</span
              >
              <span
                class="text-sm font-bold text-slate-700 block truncate"
                :title="formatarMoeda(candidato.limiteGastos1T)"
                >{{ formatarMoeda(candidato.limiteGastos1T) }}</span
              >
            </div>
            <div class="bg-slate-50 p-3 rounded-xl">
              <span
                class="text-[10px] uppercase tracking-wider text-slate-500 block font-bold mb-0.5"
                >Limite 2º Turno</span
              >
              <span
                class="text-sm font-bold text-slate-700 block truncate"
                :title="formatarMoeda(candidato.limiteGastos2T)"
                >{{
                  candidato.limiteGastos2T > 0
                    ? formatarMoeda(candidato.limiteGastos2T)
                    : 'Não se aplica'
                }}</span
              >
            </div>
          </div>

          <div
            class="mt-3 bg-slate-50 p-3 rounded-xl flex justify-between items-center"
            :class="{ 'opacity-75': isInelegivel(candidato.situacaoCandidatura) }"
          >
            <span class="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5"
              >Bens Declarados</span
            >
            <span class="text-sm font-bold text-slate-800">{{
              formatarMoeda(candidato.totalBens)
            }}</span>
          </div>
        </div>

        <div
          class="bg-slate-50 px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2"
          :class="{ 'opacity-75': isInelegivel(candidato.situacaoCandidatura) }"
        >
          <button
            @click="abrirModal(candidato, 'bens')"
            :aria-label="`Ver bens de ${candidato.nomeUrna}`"
            class="flex-1 text-center py-2 px-2 bg-white border border-slate-300 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-sm relative z-30"
          >
            Bens
          </button>

          <button
            @click="abrirModal(candidato, 'raiox')"
            :disabled="!isDeputadoCamara(candidato)"
            :title="
              !isDeputadoCamara(candidato)
                ? 'Apenas para Deputados Federais em exercício'
                : 'Ver Raio-X na Câmara'
            "
            :aria-label="`Ver Raio-X da câmara de ${candidato.nomeUrna}`"
            class="flex-1 text-center py-2 px-2 text-xs font-bold rounded-xl transition-colors shadow-sm relative z-30 focus:outline-none focus:ring-2 focus:ring-slate-400"
            :class="
              isDeputadoCamara(candidato)
                ? 'bg-slate-900 hover:bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60 border border-slate-200'
            "
          >
            🏛️ Raio-X
          </button>

          <button
            @click="toggleComparacao(candidato)"
            :aria-pressed="isSelecionadoParaComparar(candidato)"
            :aria-label="
              isSelecionadoParaComparar(candidato)
                ? `Remover ${candidato.nomeUrna} da comparação`
                : `Adicionar ${candidato.nomeUrna} para comparação`
            "
            :class="
              isSelecionadoParaComparar(candidato)
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            "
            class="flex-none text-center py-2 px-3 border text-xs font-black rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors shadow-sm relative z-30"
          >
            VS
          </button>

          <button
            @click="compartilharWhatsApp(candidato)"
            :aria-label="`Compartilhar ficha de ${candidato.nomeUrna} no WhatsApp`"
            class="flex-none flex items-center justify-center py-2 px-3 bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 text-white rounded-xl transition-colors shadow-sm relative z-30"
          >
            <svg
              aria-hidden="true"
              class="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
              />
            </svg>
          </button>
        </div>
      </article>
    </section>

    <div
      v-else
      class="text-center py-16 bg-white rounded-2xl border border-slate-200"
      aria-live="polite"
    >
      <p class="text-slate-500 text-base">
        Nenhum candidato encontrado com os critérios selecionados.
      </p>
    </div>

    <!-- Barra VS -->
    <div
      v-if="candidatosComparacao.length > 0"
      role="region"
      aria-label="Controle de Comparação"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-40 flex items-center justify-between gap-6 animate-fade-in border border-slate-700 w-[90%] max-w-lg"
    >
      <div class="flex items-center gap-3">
        <span
          class="bg-indigo-500 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-inner border border-indigo-400"
          aria-hidden="true"
          >{{ candidatosComparacao.length }}</span
        >
        <span class="text-sm font-semibold tracking-wide"
          >{{ candidatosComparacao.length }} candidatos selecionados para comparar</span
        >
      </div>
      <div class="flex gap-2">
        <button
          v-if="candidatosComparacao.length === 2"
          @click="abrirComparacao"
          aria-label="Abrir janela de comparação direta"
          class="bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-300 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg ring-2 ring-indigo-500/50"
        >
          Comparar Agora
        </button>
        <button
          @click="limparComparacao"
          aria-label="Limpar lista de comparação"
          class="bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors border border-slate-600"
        >
          Limpar
        </button>
      </div>
    </div>
  </main>

  <!-- MODAL ACESSÍVEL -->
  <div
    v-if="modalAberto"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div
      class="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl animate-fade-in"
    >
      <header
        class="p-5 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10"
      >
        <div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
            {{
              tipoModal === 'bens' ? 'Bens do Candidato' : 'Raio-X da Câmara (Atuação Parlamentar)'
            }}
          </span>
          <h3 id="modal-title" class="text-xl font-extrabold text-slate-900 mt-0.5" tabindex="-1">
            {{ candidatoAtivo.nomeUrna || candidatoAtivo.nome }}
          </h3>
        </div>
        <button
          @click="modalAberto = false"
          aria-label="Fechar janela"
          class="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded text-2xl font-bold px-2"
        >
          &times;
        </button>
      </header>

      <div class="p-6 space-y-4">
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
            <ul class="space-y-3">
              <li
                v-for="(bem, i) in candidatoAtivo.bens"
                :key="i"
                class="border-b border-slate-100 pb-3 last:border-0"
              >
                <p class="text-xs font-bold uppercase text-slate-400">{{ bem.tipo }}</p>
                <p class="text-sm font-semibold text-slate-800 mt-0.5">{{ bem.descricao }}</p>
                <p class="text-sm font-bold text-slate-900 mt-1">{{ formatarMoeda(bem.valor) }}</p>
              </li>
            </ul>
          </div>
          <div v-else class="text-center py-6 text-slate-400 text-sm">
            Nenhum detalhe de bem cadastrado.
          </div>
        </div>

        <div v-if="tipoModal === 'raiox'" aria-live="polite">
          <div v-if="raioxLoading" class="text-center py-10">
            <div
              class="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              aria-hidden="true"
            ></div>
            <p class="text-sm font-bold text-slate-700">
              Conectando ao Portal de Dados Abertos da Câmara...
            </p>
            <p class="text-xs text-slate-400 mt-1">
              Buscando despesas (CEAP) e projetos de lei recentes.
            </p>
          </div>
          <div
            v-else-if="!dadosRaioX"
            class="text-center py-10 bg-slate-50 border border-slate-200 rounded-xl"
          >
            <p class="text-sm font-bold text-slate-700 mb-1">Candidato não encontrado na Câmara.</p>
            <p class="text-xs text-slate-500 px-4">
              Esta funcionalidade verifica apenas políticos que estão exercendo mandato de
              <strong>Deputado Federal</strong> atualmente em Brasília.
            </p>
          </div>
          <div v-else class="space-y-6">
            <div class="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <img
                :src="dadosRaioX.foto"
                alt="Foto do deputado na câmara"
                class="w-16 h-20 object-cover rounded-lg shadow-sm border border-slate-300"
              />
              <div>
                <span
                  class="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1 inline-block"
                  >Deputado(a) Encontrado(a)</span
                >
                <p class="text-sm font-bold text-slate-900 leading-tight">{{ dadosRaioX.nome }}</p>
                <p class="text-xs text-slate-500 font-semibold mt-0.5">{{ dadosRaioX.partido }}</p>
              </div>
            </div>
            <div class="bg-rose-50 border border-rose-100 rounded-xl p-4">
              <p
                class="text-xs uppercase tracking-wider text-rose-800 font-bold mb-1 flex items-center gap-2"
              >
                <svg
                  aria-hidden="true"
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                Despesas Registradas
              </p>
              <p class="text-2xl font-black text-rose-900">
                {{ formatarMoeda(dadosRaioX.gasto2026) }}
              </p>
              <p class="text-[10px] text-rose-700 mt-1">
                Soma das últimas 100 notas fiscais lançadas na Cota para Exercício da Atividade
                Parlamentar (CEAP).
              </p>
            </div>
            <div>
              <h4
                class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-200 pb-2"
              >
                Projetos Recentes (Autor)
              </h4>
              <div
                v-if="dadosRaioX.projetosRecentes && dadosRaioX.projetosRecentes.length > 0"
                class="space-y-3"
              >
                <article
                  v-for="projeto in dadosRaioX.projetosRecentes"
                  :key="projeto.id"
                  class="bg-white border border-slate-200 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <p class="text-[10px] font-bold text-slate-400 mb-1 uppercase">
                    {{ projeto.siglaTipo }} {{ projeto.numero }}/{{ projeto.ano }}
                  </p>
                  <p
                    class="text-xs text-slate-700 font-medium leading-snug line-clamp-3"
                    :title="projeto.ementa"
                  >
                    {{ projeto.ementa }}
                  </p>
                </article>
              </div>
              <p v-else class="text-xs text-slate-400">Nenhum projeto de lei recente encontrado.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL DE COMPARAÇÃO "MANO A MANO" -->
  <div
    v-if="modalComparacaoAberto"
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="versus-title"
  >
    <div
      class="bg-slate-50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in flex flex-col relative"
    >
      <header
        class="p-5 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10 border-b border-slate-700"
      >
        <div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-400 block"
            >Modo Versus</span
          >
          <h3
            id="versus-title"
            class="text-xl font-black mt-0.5 flex items-center gap-2"
            tabindex="-1"
          >
            Comparação Direta
          </h3>
        </div>
        <button
          @click="modalComparacaoAberto = false"
          aria-label="Fechar janela de comparação"
          class="text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded text-2xl font-bold px-2"
        >
          &times;
        </button>
      </header>

      <div class="p-4 md:p-8 flex-grow">
        <div class="grid grid-cols-2 gap-4 md:gap-8 relative">
          <div
            aria-hidden="true"
            class="absolute left-1/2 top-24 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black italic shadow-xl z-20 text-xs md:text-base border-4 border-slate-50"
          >
            VS
          </div>

          <article
            v-for="(cand, idx) in candidatosComparacao"
            :key="cand.id"
            class="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col relative z-10"
          >
            <div
              class="bg-slate-100 rounded-t-2xl p-4 border-b border-slate-200 flex flex-col items-center justify-center relative h-48"
            >
              <img
                :src="cand.fotoUrl"
                :alt="`Foto oficial de ${cand.nomeUrna}`"
                class="w-24 h-32 object-cover rounded-xl shadow-md border-2 border-white mb-3"
                @error="
                  (e) => {
                    e.target.onerror = null
                    e.target.src =
                      'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
                  }
                "
              />
              <span
                class="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider absolute top-4 left-4"
                aria-label="Número de urna"
                >Nº {{ cand.numero }}</span
              >
            </div>

            <div class="p-4 md:p-6 space-y-5 flex-grow">
              <div class="text-center border-b border-slate-100 pb-4">
                <h4 class="font-black text-lg text-slate-900 leading-tight mb-1">
                  {{ cand.nomeUrna }}
                </h4>
                <p class="text-sm font-bold text-slate-500">{{ cand.partido }}</p>

                <!-- NOME DO VICE NO VERSUS COM O AVISO CLARO -->
                <div
                  v-if="['Presidente', 'Governador'].includes(cand.cargo)"
                  class="mt-2 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded mx-auto inline-flex items-center gap-1 max-w-[90%] text-center"
                >
                  <template v-if="cand.vices && cand.vices.length > 0">
                    Vice: {{ cand.vices.join(' e ') }}
                  </template>
                  <template v-else>
                    Vice: <span class="italic opacity-70">Aguardando doc. oficial do TSE</span>
                  </template>
                </div>

                <p class="text-xs text-slate-400 mt-2">
                  {{ calcularIdade(cand.dataDeNascimento) }}
                </p>
              </div>
              <div>
                <p
                  class="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 text-center"
                >
                  Situação
                </p>
                <div
                  class="py-2 text-center rounded-lg font-bold text-xs text-white shadow-sm"
                  :class="getCorSituacao(cand.situacaoCandidatura)"
                >
                  {{ cand.situacaoCandidatura }}
                </div>
              </div>
              <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <p class="text-[10px] uppercase tracking-wider text-emerald-600 font-bold mb-0.5">
                  Patrimônio Total
                </p>
                <p class="text-lg font-black text-emerald-900">
                  {{ formatarMoeda(cand.totalBens) }}
                </p>
              </div>
              <div
                class="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center h-full flex flex-col justify-center"
              >
                <p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                  Item Mais Caro Declarado
                </p>
                <p
                  class="text-xs font-semibold text-slate-700 leading-snug line-clamp-2 mb-1"
                  :title="obterMaiorBem(cand.bens).descricao"
                >
                  {{ obterMaiorBem(cand.bens).descricao }}
                </p>
                <p class="text-sm font-black text-slate-900">
                  {{ formatarMoeda(obterMaiorBem(cand.bens).valor) }}
                </p>
              </div>
            </div>
          </article>
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
