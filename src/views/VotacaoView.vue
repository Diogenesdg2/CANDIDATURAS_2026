<script setup>
import { ref, onMounted } from 'vue'
import {
  buscarCandidatos,
  registrarVoto,
  buscarResultadosEnquete,
} from '../firebase/candidatosService'

const carregando = ref(true)
const enviandoVoto = ref(false)
const candidatosPresidente = ref([])

// Estados da Enquete
const jaVotou = ref(false)
const resultados = ref([])
const totalVotos = ref(0)
const tempoRestante = ref(0) // Contagem regressiva em segundos
let intervaloContagem = null

// Tempo de bloqueio (em milissegundos). Ex: 60000 = 1 minuto
const TEMPO_BLOQUEIO = 60000

const verificarBloqueioTempo = () => {
  const ultimaVotacao = localStorage.getItem('hora_ultimo_voto')
  if (!ultimaVotacao) return false

  const tempoPassado = Date.now() - parseInt(ultimaVotacao)
  if (tempoPassado < TEMPO_BLOQUEIO) {
    tempoRestante.value = Math.ceil((TEMPO_BLOQUEIO - tempoPassado) / 1000)
    iniciarContagem()
    return true
  }

  localStorage.removeItem('hora_ultimo_voto')
  return false
}

const iniciarContagem = () => {
  if (intervaloContagem) clearInterval(intervaloContagem)

  intervaloContagem = setInterval(() => {
    tempoRestante.value--
    if (tempoRestante.value <= 0) {
      clearInterval(intervaloContagem)
      jaVotou.value = false
    }
  }, 1000)
}

onMounted(async () => {
  if (verificarBloqueioTempo()) {
    jaVotou.value = true
    await carregarResultados()
  } else {
    candidatosPresidente.value = await buscarCandidatos('BR', 1)
  }
  carregando.value = false
})

const carregarResultados = async () => {
  const dados = await buscarResultadosEnquete()
  resultados.value = dados.resultados
  totalVotos.value = dados.totalGeral
}

const votar = async (candidato) => {
  const confirmacao = confirm(
    `Confirmar voto simbólico em ${candidato.nomeUrna} (${candidato.partido})?`,
  )
  if (!confirmacao) return

  enviandoVoto.value = true

  const sucesso = await registrarVoto(
    candidato.id,
    candidato.nomeUrna,
    candidato.partido,
    candidato.fotoUrl,
  )

  if (sucesso) {
    localStorage.setItem('hora_ultimo_voto', Date.now().toString())
    verificarBloqueioTempo()

    jaVotou.value = true
    await carregarResultados()
  } else {
    alert('Erro ao computar voto. Tente novamente.')
  }

  enviandoVoto.value = false
}

const calcularPorcentagem = (votos) => {
  if (totalVotos.value === 0) return 0
  return ((votos / totalVotos.value) * 100).toFixed(1)
}

const formatarTempo = (segundos) => {
  const min = Math.floor(segundos / 60)
  const seg = segundos % 60
  return `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`
}
</script>

<template>
  <main class="max-w-5xl mx-auto py-8 transition-colors duration-300 px-4 sm:px-0">
    <header class="text-center mb-10">
      <span
        class="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-3 inline-block"
      >
        Enquete Simbólica
      </span>
      <h1 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-2">
        Quem seria seu Presidente?
      </h1>
      <p class="text-slate-500 dark:text-slate-400">
        Participe da nossa pesquisa de intenção de voto com os eleitores que utilizam a plataforma.
      </p>
    </header>

    <div v-if="carregando || enviandoVoto" class="text-center py-20">
      <div
        class="w-10 h-10 border-4 border-purple-600 dark:border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"
      ></div>
      <p class="text-slate-500 dark:text-slate-400 font-bold">
        {{ enviandoVoto ? 'Computando seu voto na urna...' : 'Carregando dados...' }}
      </p>
    </div>

    <!-- TELA 1: LISTA PARA VOTAR -->
    <div v-else-if="!jaVotou">
      <div
        v-if="candidatosPresidente.length === 0"
        class="text-center p-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <p class="text-slate-500 dark:text-slate-400">
          Você precisa ir na tela Inicial e Importar os candidatos a Presidente antes de iniciar a
          enquete!
        </p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <article
          v-for="cand in candidatosPresidente"
          :key="cand.id"
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all p-5 flex flex-col items-center text-center"
        >
          <img
            :src="cand.fotoUrl"
            :alt="cand.nomeUrna"
            class="w-24 h-24 object-cover rounded-full border-4 border-slate-50 dark:border-slate-800 shadow-sm mb-4 bg-slate-200 dark:bg-slate-800"
          />
          <span
            class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2"
            >Nº {{ cand.numero }}</span
          >
          <h2 class="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1">
            {{ cand.nomeUrna }}
          </h2>
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">
            {{ cand.partido }}
          </p>

          <button
            @click="votar(cand)"
            class="mt-auto w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-black py-3 rounded-xl transition-colors focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-900 shadow-md"
          >
            VOTAR NESTE
          </button>
        </article>
      </div>
    </div>

    <!-- TELA 2: RESULTADOS -->
    <div
      v-else
      class="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-10 shadow-lg relative overflow-hidden"
    >
      <div class="text-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div
          class="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>
        <h2 class="text-2xl font-black text-slate-900 dark:text-white">
          Voto computado com sucesso!
        </h2>
        <p class="text-slate-500 dark:text-slate-400 mt-2">
          Acompanhe a intenção de votos dos usuários em tempo real.
        </p>
        <p class="text-sm font-bold text-purple-600 dark:text-purple-400 mt-4">
          {{ totalVotos }} votos registrados no total
        </p>
      </div>

      <div class="space-y-6 mb-10">
        <!-- RESULTADO INDIVIDUAL CORRIGIDO -->
        <div
          v-for="(resultado, index) in resultados"
          :key="resultado.id"
          class="flex items-start gap-4"
        >
          <!-- Lado Esquerdo: Posição e Foto (Tamanho fixo) -->
          <div class="flex items-center gap-3 shrink-0 mt-0.5">
            <span class="text-lg font-black text-slate-300 dark:text-slate-600 w-5 text-right"
              >{{ index + 1 }}º</span
            >
            <img
              :src="resultado.fotoUrl"
              class="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
              :alt="resultado.nomeUrna"
            />
          </div>

          <!-- Lado Direito: Informações, Barra e Quantidade (100% do que sobra) -->
          <div class="flex-grow min-w-0">
            <div class="flex justify-between items-end mb-1">
              <h3 class="font-bold text-slate-900 dark:text-white leading-none truncate">
                {{ resultado.nomeUrna }}
                <span class="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1">{{
                  resultado.partido
                }}</span>
              </h3>
              <span
                class="font-black text-lg text-slate-900 dark:text-white leading-none shrink-0 ml-2"
              >
                {{ calcularPorcentagem(resultado.totalVotos) }}%
              </span>
            </div>

            <div
              class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mt-2 overflow-hidden"
            >
              <div
                class="h-3 rounded-full transition-all duration-1000 ease-out"
                :class="
                  index === 0
                    ? 'bg-purple-600 dark:bg-purple-500'
                    : index === 1
                      ? 'bg-blue-500 dark:bg-blue-400'
                      : 'bg-slate-400 dark:bg-slate-600'
                "
                :style="{ width: `${calcularPorcentagem(resultado.totalVotos)}%` }"
              ></div>
            </div>

            <p class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1 text-right">
              {{ resultado.totalVotos }} {{ resultado.totalVotos === 1 ? 'voto' : 'votos' }}
            </p>
          </div>
        </div>
      </div>

      <!-- BOTÃO DE VOTAR NOVAMENTE -->
      <div
        class="bg-slate-50 dark:bg-slate-800/50 -mx-6 md:-mx-10 -mb-6 md:-mb-10 p-6 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center"
      >
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-3 text-center">
          Para evitar spam, liberamos um novo voto em:
        </p>
        <button
          disabled
          class="bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-black py-3 px-8 rounded-xl cursor-not-allowed flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          {{ formatarTempo(tempoRestante) }}
        </button>
      </div>
    </div>
  </main>
</template>
