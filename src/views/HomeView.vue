<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  verificarDadosExistem,
  sincronizarDadosAutomaticamente,
} from '../firebase/candidatosService'

const router = useRouter()

// 🌟 DETECTA SE ESTÁ NO LOCALHOST (DEV) OU NA AWS (PRODUÇÃO)
const isDev = import.meta.env.DEV

// 1. INICIANDO NO PADRÃO NACIONAL (BRASIL / PRESIDENTE)
const regiaoSelecionada = ref('BR')
const ufSelecionada = ref('BR')
const cargoSelecionado = ref(1)

const dadosExistemNoBanco = ref(false)
const verificando = ref(true)

const importando = ref(false)
const progressoAtual = ref(0)
const progressoTotal = ref(100)
const textoStatus = ref('')

const regioes = [
  { id: 'BR', nome: 'Brasil (Nacional)' },
  { id: 'Sudeste', nome: 'Sudeste' },
  { id: 'Sul', nome: 'Sul' },
  { id: 'Nordeste', nome: 'Nordeste' },
  { id: 'Centro-Oeste', nome: 'Centro-Oeste' },
  { id: 'Norte', nome: 'Norte' },
]

const estadosPorRegiao = {
  BR: [{ sigla: 'BR', nome: 'Nacional' }],
  Sudeste: [
    { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'ES', nome: 'Espírito Santo' },
  ],
  Sul: [
    { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' },
  ],
  Nordeste: [
    { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'PI', nome: 'Piauí' },
  ],
  'Centro-Oeste': [
    { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'DF', nome: 'Distrito Federal' },
  ],
  Norte: [
    { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'PA', nome: 'Pará' },
    { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'TO', nome: 'Tocantins' },
  ],
}

// Cargos dinâmicos dependendo se é Nacional (BR) ou Estadual
const cargos = computed(() => {
  if (regiaoSelecionada.value === 'BR') {
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

const selecionarRegiao = (idRegiao) => {
  regiaoSelecionada.value = idRegiao
  const estados = estadosPorRegiao[idRegiao]
  if (estados && estados.length > 0) {
    ufSelecionada.value = estados[0].sigla
  }

  if (idRegiao === 'BR') {
    cargoSelecionado.value = 1 // Presidente
  } else {
    cargoSelecionado.value = 3 // Governador
  }
  checarBanco()
}

const selecionarUf = (sigla) => {
  ufSelecionada.value = sigla
  checarBanco()
}

const selecionarCargo = (idCargo) => {
  cargoSelecionado.value = idCargo
  checarBanco()
}

const checarBanco = async () => {
  verificando.value = true
  dadosExistemNoBanco.value = await verificarDadosExistem(
    ufSelecionada.value,
    cargoSelecionado.value,
  )
  verificando.value = false
}

onMounted(() => {
  checarBanco()
})

const iniciarImportacao = async () => {
  importando.value = true
  try {
    await sincronizarDadosAutomaticamente(
      ufSelecionada.value,
      cargoSelecionado.value,
      (atual, total, nome) => {
        progressoAtual.value = atual
        progressoTotal.value = total
        textoStatus.value = `Baixando do TSE: ${atual} de ${total} (${nome})`
      },
    )
    router.push({
      path: '/candidatos',
      query: { uf: ufSelecionada.value, cargo: cargoSelecionado.value },
    })
  } catch (e) {
    alert(
      'Erro ao importar dados. O servidor do TSE pode ter bloqueado temporariamente (Erro 429). Tente reiniciar seu roteador.',
    )
    importando.value = false
  }
}

const avancarParaLista = () => {
  router.push({
    path: '/candidatos',
    query: { uf: ufSelecionada.value, cargo: cargoSelecionado.value },
  })
}
</script>

<template>
  <div class="space-y-8 max-w-5xl mx-auto pb-12 transition-colors duration-300">
    <!-- CABEÇALHO -->
    <div>
      <h1 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
        Explorador Eleitoral 2026
      </h1>
      <p class="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-2">
        Selecione a região, o estado e o cargo que deseja analisar as contas e candidaturas.
      </p>

      <!-- AVISO DE TRANSPARÊNCIA (API TSE) -->
      <div
        class="mt-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-4 flex items-start gap-3 shadow-sm transition-colors"
      >
        <svg
          class="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <div>
          <p class="text-sm text-blue-900 dark:text-blue-300 font-bold tracking-wide">
            Fonte de Dados Oficial
          </p>
          <p class="text-xs text-blue-800 dark:text-blue-200/80 mt-1 leading-relaxed">
            Todas as informações, fotos, lista de bens e status apresentados neste explorador são
            extraídos em tempo real e de forma automatizada do portal de dados abertos do
            <strong class="dark:text-blue-100">TSE (Tribunal Superior Eleitoral)</strong>,
            utilizando a API pública oficial <i>divulgacandcontas.tse.jus.br</i>.
          </p>
        </div>
      </div>
    </div>

    <!-- 1. ESCOLHA A REGIÃO -->
    <div class="space-y-3">
      <h2 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        1. Escolha a Região
      </h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <button
          v-for="reg in regioes"
          :key="reg.id"
          @click="selecionarRegiao(reg.id)"
          :class="[
            'p-3 rounded-2xl border text-sm font-semibold transition-all shadow-sm text-center',
            regiaoSelecionada === reg.id
              ? 'bg-white dark:bg-slate-800 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-600/20 dark:ring-blue-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
          ]"
        >
          {{ reg.nome }}
        </button>
      </div>
    </div>

    <!-- 2. SELECIONE O ESTADO -->
    <div class="space-y-3">
      <h2 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        2. Selecione o Estado
      </h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          v-for="est in estadosPorRegiao[regiaoSelecionada]"
          :key="est.sigla"
          @click="selecionarUf(est.sigla)"
          :class="[
            'p-4 rounded-2xl border text-left transition-all shadow-sm flex items-center justify-between',
            ufSelecionada === est.sigla
              ? 'bg-white dark:bg-slate-800 border-blue-600 dark:border-blue-500 text-blue-900 dark:text-blue-300 ring-2 ring-blue-600/20 dark:ring-blue-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
          ]"
        >
          <div>
            <p class="font-bold text-sm">{{ est.nome }}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ est.sigla }}</p>
          </div>
          <span
            class="w-3 h-3 rounded-full"
            :class="
              ufSelecionada === est.sigla
                ? 'bg-blue-600 dark:bg-blue-500'
                : 'bg-slate-200 dark:bg-slate-700'
            "
          ></span>
        </button>
      </div>
    </div>

    <!-- 3. QUAL CARGO DESEJA ANALISAR -->
    <div class="space-y-3">
      <h2 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        3. Qual cargo deseja analisar?
      </h2>
      <div class="flex flex-wrap gap-3">
        <button
          v-for="carg in cargos"
          :key="carg.id"
          @click="selecionarCargo(carg.id)"
          :class="[
            'px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm',
            cargoSelecionado === carg.id
              ? 'bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
          ]"
        >
          {{ carg.nome }}
        </button>
      </div>
    </div>

    <!-- CAIXA DE STATUS E IMPORTAÇÃO -->
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors"
    >
      <div v-if="verificando" class="text-center py-4 text-slate-400 dark:text-slate-500 text-sm">
        Verificando status no banco de dados...
      </div>

      <div v-else>
        <!-- SE TEM DADOS: BOTÃO DE ACESSAR -->
        <div
          v-if="dadosExistemNoBanco && !importando"
          class="flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div>
            <span
              class="inline-block bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full mb-1"
            >
              Pronto para consulta
            </span>
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
              Os dados deste cargo já estão sincronizados!
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Você pode explorar os perfis, bens e limites imediatamente.
            </p>
          </div>
          <button
            @click="avancarParaLista"
            class="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-md transition-all"
          >
            Acessar Candidatos →
          </button>
        </div>

        <!-- SE NÃO TEM DADOS -->
        <div v-else>
          <!-- SÓ MOSTRA SE FOR LOCALHOST (isDev === true) -->
          <div v-if="isDev">
            <div
              v-if="!importando"
              class="flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div>
                <span
                  class="inline-block bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full mb-1"
                >
                  Novos dados encontrados no TSE!
                </span>
                <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
                  Dados ainda não salvos no seu painel local.
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  Ao clicar, o sistema fará a importação oficial do TSE em tempo real.
                </p>
              </div>
              <button
                @click="iniciarImportacao"
                class="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                Importar do TSE
              </button>
            </div>

            <!-- BARRA DE PROGRESSO -->
            <div v-else class="space-y-3 py-2">
              <div
                class="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <span
                  class="animate-pulse text-blue-600 dark:text-blue-400 flex items-center gap-2"
                >
                  <span
                    class="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping"
                  ></span>
                  Baixando do TSE...
                </span>
                <span>{{ Math.round((progressoAtual / progressoTotal) * 100) || 0 }}%</span>
              </div>

              <div
                class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden border border-slate-200 dark:border-slate-700"
              >
                <div
                  class="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-300"
                  :style="{ width: `${(progressoAtual / progressoTotal) * 100}%` }"
                ></div>
              </div>

              <p class="text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
                {{ textoStatus }}
              </p>
            </div>
          </div>

          <!-- SE FOR PRODUÇÃO (NA AWS) E NÃO TIVER DADOS AINDA -->
          <div v-else class="text-center py-4">
            <span
              class="inline-block bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-2.5 py-1 rounded-lg"
            >
              ⏳ Aguardando Importação
            </span>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
              O administrador do painel ainda não sincronizou os dados deste estado. Tente novamente
              mais tarde.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
