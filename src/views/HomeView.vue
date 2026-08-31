<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  verificarDadosExistem,
  sincronizarDadosAutomaticamente,
  realizarManutencaoEmLote,
  auditarERemoverDuplicatas,
  getStatusManutencao,
  setStatusManutencao,
} from '../firebase/candidatosService'

const router = useRouter()

// 🌟 DETECTA SE ESTÁ NO LOCALHOST (DEV) OU NA AWS (PRODUÇÃO)
const isDev = import.meta.env.DEV

// 🔒 VARIÁVEIS DA CHAVE MESTRA
const emManutencao = ref(false)
const carregandoConfig = ref(true)

const regiaoSelecionada = ref('BR')
const ufSelecionada = ref('BR')
const cargoSelecionado = ref(1)

const dadosExistemNoBanco = ref(false)
const verificando = ref(true)

const importando = ref(false)
const modoManutencao = ref(false)
const progressoAtual = ref(0)
const progressoTotal = ref(100)
const textoStatus = ref('')

const opcoesManutencao = ref({
  situacao: true,
  foto: false,
  bens: false,
  vicesEPessoais: false,
})

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

const cargos = computed(() => {
  if (regiaoSelecionada.value === 'BR') {
    return [
      { id: 1, nome: 'Presidente' },
      { id: 2, nome: 'Vice-Presidente' },
    ]
  } else if (ufSelecionada.value === 'DF') {
    return [
      { id: 3, nome: 'Governador' },
      { id: 4, nome: 'Vice-Governador' },
      { id: 5, nome: 'Senador' },
      { id: 6, nome: 'Deputado Federal' },
      { id: 8, nome: 'Deputado Distrital' },
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
  if (estados && estados.length > 0) ufSelecionada.value = estados[0].sigla
  if (idRegiao === 'BR') cargoSelecionado.value = 1
  else cargoSelecionado.value = 3
  checarBanco()
}

const selecionarUf = (sigla) => {
  ufSelecionada.value = sigla
  if (sigla === 'DF' && cargoSelecionado.value === 7) cargoSelecionado.value = 8
  else if (sigla !== 'DF' && cargoSelecionado.value === 8) cargoSelecionado.value = 7
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

// 🚀 O PRIMEIRO PASSO AO ABRIR O SITE É CHECAR O STATUS
onMounted(async () => {
  carregandoConfig.value = true
  emManutencao.value = await getStatusManutencao()
  carregandoConfig.value = false

  // Só carrega as verificações de banco pesado se o app estiver liberado ou for desenvolvedor
  if (!emManutencao.value || isDev) {
    checarBanco()
  }
})

// 🚀 LIGA E DESLIGA A MANUTENÇÃO (SOMENTE LOCALHOST)
const alternarManutencao = async () => {
  const novoStatus = !emManutencao.value
  const confirmacao = confirm(
    novoStatus
      ? 'ATENÇÃO: Você está prestes a bloquear o acesso de todos os usuários da AWS. Confirmar?'
      : 'Você está liberando o acesso ao site público na AWS. Confirmar?',
  )

  if (!confirmacao) return

  const sucesso = await setStatusManutencao(novoStatus)
  if (sucesso) {
    emManutencao.value = novoStatus
    alert(`Modo Manutenção ${novoStatus ? 'ATIVADO 🔴' : 'DESATIVADO 🟢'}.`)
  } else {
    alert('Erro ao alterar o status no Firebase.')
  }
}

const iniciarImportacao = async () => {
  importando.value = true
  modoManutencao.value = false
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

    // Atualiza a interface informando que os dados agora existem
    await checarBanco()
    importando.value = false

    // 🌟 MENSAGEM DE SUCESSO EXIBINDO O TOTAL
    // Usamos o progressoTotal.value porque ele armazena exatamente a quantidade que o TSE nos enviou
    alert(
      `✅ Importação concluída com sucesso!\n\nForam salvos ${progressoTotal.value} candidatos no seu banco de dados. A tela não será redirecionada automaticamente para economizar leituras no Firebase.`,
    )

    // ATENÇÃO: Se havia um router.push(...) aqui, ele foi removido!
  } catch (e) {
    alert('Erro ao importar. O servidor do TSE pode ter bloqueado temporariamente.')
    importando.value = false
  }
}

const iniciarManutencao = async () => {
  const marcouAlgo = Object.values(opcoesManutencao.value).some((v) => v === true)
  if (!marcouAlgo) return alert('Selecione pelo menos uma informação para sincronizar!')

  importando.value = true
  modoManutencao.value = true
  try {
    await realizarManutencaoEmLote(
      ufSelecionada.value,
      cargoSelecionado.value,
      opcoesManutencao.value,
      (atual, total, nome) => {
        progressoAtual.value = atual
        progressoTotal.value = total
        textoStatus.value = `Sincronizando ${nome}... (${atual}/${total})`
      },
    )
    importando.value = false
    modoManutencao.value = false
    alert('Manutenção finalizada com sucesso! Seu banco de dados está atualizado.')
  } catch (e) {
    alert('Erro durante a manutenção. Verifique o console.')
    importando.value = false
    modoManutencao.value = false
  }
}

const executarAuditoriaDuplicatas = async () => {
  if (
    !confirm(
      `Deseja varrer o banco de dados para o cargo selecionado em ${ufSelecionada.value} em busca de candidatos duplicados?`,
    )
  )
    return
  try {
    verificando.value = true
    const resultado = await auditarERemoverDuplicatas(ufSelecionada.value, cargoSelecionado.value)
    verificando.value = false
    if (resultado.removidos > 0)
      alert(
        `🔍 Auditoria concluída!\n\nForam encontrados ${resultado.totalEncontrados} registros analisados e ${resultado.removidos} duplicata(s) removida(s).`,
      )
    else
      alert(
        `🔍 Auditoria concluída!\n\nForam analisados ${resultado.totalEncontrados} registros e NENHUMA duplicata encontrada. Base limpa!`,
      )
    await checarBanco()
  } catch (e) {
    verificando.value = false
    alert('Erro ao executar a auditoria. Verifique o console.')
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
    <!-- TELA DE LOADING INICIAL -->
    <div v-if="carregandoConfig" class="flex flex-col items-center justify-center py-32 space-y-4">
      <div
        class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
      ></div>
      <p class="text-slate-500 font-bold tracking-widest uppercase text-sm">
        Verificando Servidores...
      </p>
    </div>

    <!-- 🛑 TELA DE MANUTENÇÃO (EXIBIDA APENAS NA AWS QUANDO A CHAVE MESTRA ESTIVER ATIVA) -->
    <div
      v-else-if="emManutencao && !isDev"
      class="flex flex-col items-center justify-center py-20 px-4 text-center"
    >
      <div
        class="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6 border-4 border-amber-200 dark:border-amber-800"
      >
        <svg
          class="w-12 h-12 text-amber-600 dark:text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          ></path>
        </svg>
      </div>
      <h1
        class="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4"
      >
        Site em Manutenção
      </h1>
      <p class="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
        Estamos realizando a sincronização de dados eleitorais e atualizando nossos servidores para
        proteger a cota diária de leitura do sistema.
      </p>
      <div
        class="mt-8 bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-full text-slate-500 dark:text-slate-400 font-bold text-sm tracking-widest animate-pulse"
      >
        Por favor, volte em alguns minutos.
      </div>
    </div>

    <!-- ✅ TELA NORMAL DO APLICATIVO -->
    <div v-else class="space-y-8">
      <!-- CABEÇALHO -->
      <div>
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1
              class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight"
            >
              Explorador Eleitoral 2026
            </h1>
            <p class="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-2">
              Selecione a região, o estado e o cargo que deseja analisar.
            </p>
          </div>

          <!-- 🛠 BOTÃO DE LIGAR/DESLIGAR MANUTENÇÃO (SOMENTE PARA VOCÊ) -->
          <button
            v-if="isDev"
            @click="alternarManutencao"
            class="px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-xl shadow-md transition-all border-2 flex items-center gap-2"
            :class="
              emManutencao
                ? 'bg-red-100 text-red-700 border-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-emerald-100 text-emerald-700 border-emerald-500 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
            "
          >
            <span
              class="w-3 h-3 rounded-full animate-pulse"
              :class="emManutencao ? 'bg-red-500' : 'bg-emerald-500'"
            ></span>
            {{ emManutencao ? 'AWS Bloqueada (Manutenção ON)' : 'AWS Liberada (Manutenção OFF)' }}
          </button>
        </div>

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
              Todas as informações são extraídas da API pública oficial do
              <strong class="dark:text-blue-100">TSE</strong>.
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
                ? 'bg-white dark:bg-slate-800 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-600/20'
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
                ? 'bg-white dark:bg-slate-800 border-blue-600 dark:border-blue-500 text-blue-900 dark:text-blue-300 ring-2 ring-blue-600/20'
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

      <!-- 3. QUAL CARGO -->
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
          <div v-if="dadosExistemNoBanco && !importando">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div>
                <span
                  class="inline-block bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full mb-1"
                  >Pronto para consulta</span
                >
                <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
                  Os dados deste cargo já estão sincronizados!
                </h3>
              </div>

              <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  v-if="isDev"
                  @click="iniciarImportacao"
                  class="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700"
                  title="Procurar novos candidatos que entraram na lista"
                >
                  ➕ Importar Novos
                </button>
                <button
                  @click="avancarParaLista"
                  class="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-md transition-all"
                >
                  Acessar Candidatos →
                </button>
              </div>
            </div>

            <!-- 🌟 PAINEL DE MANUTENÇÃO GRANULAR -->
            <div
              v-if="isDev"
              class="mt-4 p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl"
            >
              <div class="flex items-center gap-2 mb-3">
                <svg
                  class="w-5 h-5 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  ></path>
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                </svg>
                <h4 class="font-bold text-slate-800 dark:text-slate-200">
                  Painel de Manutenção Granular & Auditoria
                </h4>
              </div>

              <div
                class="flex flex-wrap gap-4 mb-5 border-b border-slate-200 dark:border-slate-700/50 pb-4"
              >
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="opcoesManutencao.situacao"
                    class="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >Situação Judicial</span
                  >
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="opcoesManutencao.foto"
                    class="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >Fotos / Imagens</span
                  >
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="opcoesManutencao.bens"
                    class="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >Bens & Limites</span
                  >
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="opcoesManutencao.vicesEPessoais"
                    class="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >Vices & Pessoais</span
                  >
                </label>
              </div>

              <div class="flex flex-wrap items-center gap-3 pt-2">
                <button
                  @click="iniciarManutencao"
                  class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all focus:ring-4 focus:ring-indigo-300"
                >
                  🔄 Iniciar Manutenção Lote
                </button>

                <button
                  @click="executarAuditoriaDuplicatas"
                  class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all focus:ring-4 focus:ring-amber-300 flex items-center gap-2"
                >
                  🧹 Auditar e Remover Duplicatas
                </button>
              </div>
            </div>
          </div>

          <div v-else>
            <div v-if="isDev">
              <div
                v-if="!importando"
                class="flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div>
                  <span
                    class="inline-block bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full mb-1"
                    >Novos dados encontrados no TSE!</span
                  >
                  <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
                    Dados ainda não salvos no seu painel local.
                  </h3>
                </div>
                <button
                  @click="iniciarImportacao"
                  class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md"
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
                    :class="
                      modoManutencao
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-blue-600 dark:text-blue-400'
                    "
                    class="animate-pulse flex items-center gap-2"
                  >
                    <span
                      :class="
                        modoManutencao
                          ? 'bg-indigo-600 dark:bg-indigo-400'
                          : 'bg-blue-600 dark:bg-blue-400'
                      "
                      class="w-2.5 h-2.5 rounded-full animate-ping"
                    ></span>
                    {{ modoManutencao ? 'Realizando Manutenção...' : 'Baixando do TSE...' }}
                  </span>
                  <span>{{ Math.round((progressoAtual / progressoTotal) * 100) || 0 }}%</span>
                </div>

                <div
                  class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden border border-slate-200 dark:border-slate-700"
                >
                  <div
                    :class="
                      modoManutencao
                        ? 'bg-indigo-600 dark:bg-indigo-500'
                        : 'bg-blue-600 dark:bg-blue-500'
                    "
                    class="h-full transition-all duration-300"
                    :style="{ width: `${(progressoAtual / progressoTotal) * 100}%` }"
                  ></div>
                </div>

                <p class="text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
                  {{ textoStatus }}
                </p>
              </div>
            </div>

            <div v-else class="text-center py-4">
              <span
                class="inline-block bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                >⏳ Aguardando Importação</span
              >
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                O administrador do painel ainda não sincronizou os dados deste estado.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
