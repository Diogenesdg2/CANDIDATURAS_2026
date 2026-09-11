<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  verificarDadosExistem,
  sincronizarDadosAutomaticamente,
  realizarManutencaoEmLote,
  auditarERemoverDuplicatas,
  getStatusManutencao,
  setStatusManutencao,
  buscarResultadosEnquete,
  buscarCandidatos,
  registrarVoto,
  getConfigUrna, // 🔥 Função nova
  setConfigUrna, // 🔥 Função nova
} from '../firebase/candidatosService'

const router = useRouter()
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

// 📊 VARIÁVEIS DA ENQUETE E URNA
const resultadosEnquete = ref([])
const totalVotosEnquete = ref(0)
const carregandoEnquete = ref(true)

const modalUrnaAberto = ref(false)
const urnaCarregando = ref(false)
const numeroUrna = ref('')
const votoBranco = ref(false)
const votoFim = ref(false)
const candidatosPresidencia = ref([])

// ⚙️ VARIÁVEIS DE BLOQUEIO E CONFIGURAÇÃO DA URNA
const bloqueadoParaVoto = ref(false)
const tempoRestanteVoto = ref(0)
let intervaloBloqueio = null
const configUrna = ref({ bloqueioAtivo: true, tempoMinutos: 2 })

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

const carregarResultadosEnquete = async () => {
  carregandoEnquete.value = true
  const resposta = await buscarResultadosEnquete()
  resultadosEnquete.value = resposta.resultados
  totalVotosEnquete.value = resposta.totalGeral
  carregandoEnquete.value = false
}

const calcularPorcentagem = (votos) => {
  if (totalVotosEnquete.value === 0) return 0
  return ((votos / totalVotosEnquete.value) * 100).toFixed(1).replace('.', ',')
}

// ====================================================
// ⚙️ LÓGICA DE CONTROLE DE SPAM E CONFIGURAÇÃO
// ====================================================
const tempoBloqueioFormatado = computed(() => {
  const min = Math.floor(tempoRestanteVoto.value / 60)
  const seg = tempoRestanteVoto.value % 60
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`
})

const iniciarContagemRegressiva = (msRestantes) => {
  bloqueadoParaVoto.value = true
  tempoRestanteVoto.value = Math.ceil(msRestantes / 1000)

  if (intervaloBloqueio) clearInterval(intervaloBloqueio)

  intervaloBloqueio = setInterval(() => {
    tempoRestanteVoto.value--
    if (tempoRestanteVoto.value <= 0) {
      clearInterval(intervaloBloqueio)
      bloqueadoParaVoto.value = false
      localStorage.removeItem('bloqueioVotoUrna')
    }
  }, 1000)
}

const checarBloqueioVoto = () => {
  // Se o bloqueio estiver desativado pelo dev, ele cancela instantaneamente e limpa tudo
  if (!configUrna.value.bloqueioAtivo) {
    bloqueadoParaVoto.value = false
    localStorage.removeItem('bloqueioVotoUrna')
    if (intervaloBloqueio) clearInterval(intervaloBloqueio)
    return
  }

  // Se estiver ativado, usa o tempo em minutos dinâmico que vem do Firebase
  const minutos = parseInt(configUrna.value.tempoMinutos) || 2
  const tempoBloqueioMs = minutos * 60 * 1000
  const ultimoVoto = localStorage.getItem('bloqueioVotoUrna')

  if (ultimoVoto) {
    const tempoPassado = Date.now() - parseInt(ultimoVoto)
    if (tempoPassado < tempoBloqueioMs) {
      iniciarContagemRegressiva(tempoBloqueioMs - tempoPassado)
    } else {
      localStorage.removeItem('bloqueioVotoUrna')
    }
  }
}

// 🔥 Salva as configurações feitas pelo Administrador/Dev
const salvarConfigUrna = async () => {
  configUrna.value.tempoMinutos = parseInt(configUrna.value.tempoMinutos) || 2
  const sucesso = await setConfigUrna(configUrna.value)

  if (sucesso) {
    alert('Configurações da Urna atualizadas para todos os usuários na AWS!')
    checarBloqueioVoto() // Atualiza a tela imediatamente (bloqueia ou libera na hora)
  } else {
    alert('Erro ao salvar as configurações no Firebase.')
  }
}

onUnmounted(() => {
  if (intervaloBloqueio) clearInterval(intervaloBloqueio)
})

// 🚀 O PRIMEIRO PASSO AO ABRIR O SITE
onMounted(async () => {
  carregandoConfig.value = true
  // Puxa as configurações da Urna (bloqueios e minutos) do banco e depois checa se a pessoa tem trava
  configUrna.value = await getConfigUrna()
  checarBloqueioVoto()

  emManutencao.value = await getStatusManutencao()
  carregandoConfig.value = false

  if (!emManutencao.value || isDev) {
    checarBanco()
    await carregarResultadosEnquete()
  }
})

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
    await checarBanco()
    importando.value = false
    alert(
      `✅ Importação concluída com sucesso!\n\nForam salvos ${progressoTotal.value} candidatos no seu banco de dados.`,
    )
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
  if (!confirm(`Deseja varrer o banco de dados em busca de candidatos duplicados?`)) return
  try {
    verificando.value = true
    const resultado = await auditarERemoverDuplicatas(ufSelecionada.value, cargoSelecionado.value)
    verificando.value = false
    if (resultado.removidos > 0)
      alert(`🔍 Auditoria concluída!\n\n${resultado.removidos} duplicata(s) removida(s).`)
    else alert(`🔍 Auditoria concluída!\n\nNENHUMA duplicata encontrada. Base limpa!`)
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

// ====================================================
// 🗳️ LÓGICA DO SIMULADOR DE URNA ELETRÔNICA
// ====================================================

const playSomTecla = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime)
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime)
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    oscillator.start()
    oscillator.stop(audioCtx.currentTime + 0.05)
  } catch (e) {}
}

const playSomConfirma = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const playBeep = (freq, startTime, duration) => {
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(freq, startTime)
      gainNode.gain.setValueAtTime(0.08, startTime)
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    }
    const now = audioCtx.currentTime
    playBeep(2600, now, 0.08)
    playBeep(2600, now + 0.12, 0.08)
    playBeep(2600, now + 0.24, 0.08)
    playBeep(2600, now + 0.36, 0.4)
  } catch (e) {}
}

const candidatoSelecionadoUrna = computed(() => {
  if (numeroUrna.value.length === 2) {
    return candidatosPresidencia.value.find((c) => String(c.numero) === numeroUrna.value)
  }
  return null
})

const abrirUrna = async () => {
  if (bloqueadoParaVoto.value) return

  modalUrnaAberto.value = true
  numeroUrna.value = ''
  votoBranco.value = false
  votoFim.value = false

  if (candidatosPresidencia.value.length === 0) {
    urnaCarregando.value = true
    candidatosPresidencia.value = await buscarCandidatos('BR', 1)
    urnaCarregando.value = false
  }
}

const fecharUrna = () => {
  modalUrnaAberto.value = false
  numeroUrna.value = ''
  votoBranco.value = false
  votoFim.value = false
}

const teclarUrna = (num) => {
  if (votoFim.value) return
  playSomTecla()
  if (votoBranco.value) return
  if (numeroUrna.value.length < 2) {
    numeroUrna.value += String(num)
  }
}

const corrigirUrna = () => {
  if (votoFim.value) return
  playSomTecla()
  numeroUrna.value = ''
  votoBranco.value = false
}

const votarBrancoUrna = () => {
  if (votoFim.value) return
  playSomTecla()
  numeroUrna.value = ''
  votoBranco.value = true
}

const confirmarUrna = async () => {
  if (votoFim.value) return
  if (numeroUrna.value.length < 2 && !votoBranco.value) return

  let votoRegistrado = false

  if (votoBranco.value) {
    await registrarVoto(
      'branco',
      'VOTO EM BRANCO',
      'Nenhum',
      'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
    )
    votoRegistrado = true
  } else if (candidatoSelecionadoUrna.value) {
    const cand = candidatoSelecionadoUrna.value
    await registrarVoto(String(cand.id), cand.nomeUrna, cand.partido, cand.fotoUrl)
    votoRegistrado = true
  } else if (numeroUrna.value.length === 2) {
    await registrarVoto(
      'nulo',
      'VOTO NULO',
      'Nenhum',
      'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
    )
    votoRegistrado = true
  }

  if (votoRegistrado) {
    playSomConfirma()
    votoFim.value = true
    await carregarResultadosEnquete()

    // 🔒 Checa a configuração no Firebase antes de bloquear a sessão
    if (configUrna.value.bloqueioAtivo) {
      const minutos = parseInt(configUrna.value.tempoMinutos) || 2
      localStorage.setItem('bloqueioVotoUrna', Date.now().toString())
      iniciarContagemRegressiva(minutos * 60 * 1000)
    }

    setTimeout(() => {
      fecharUrna()
    }, 2800)
  }
}
</script>

<template>
  <div class="space-y-8 max-w-5xl mx-auto pb-12 transition-colors duration-300 relative">
    <!-- TELA DE LOADING INICIAL -->
    <div v-if="carregandoConfig" class="flex flex-col items-center justify-center py-32 space-y-4">
      <div
        class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
      ></div>
      <p class="text-slate-500 font-bold tracking-widest uppercase text-sm">
        Verificando Servidores...
      </p>
    </div>

    <!-- 🛑 TELA DE MANUTENÇÃO (AWS) -->
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

      <!-- FILTROS -->
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

      <!-- 🌟 SEÇÃO DE PLACAR DA ENQUETE -->
      <div class="pt-8 mt-8 border-t border-slate-200 dark:border-slate-800">
        <div class="flex flex-col md:flex-row md:items-center gap-3 mb-6">
          <span
            class="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-2 self-start"
          >
            <span
              class="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse"
            ></span>
            Enquete Simbólica
          </span>
          <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Pesquisa de Intenção de Voto (Presidência)
          </h2>
        </div>

        <div
          v-if="carregandoEnquete"
          class="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800"
        >
          <div
            class="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
          ></div>
          <p class="text-slate-500 dark:text-slate-400 text-sm font-bold">Apurando votos...</p>
        </div>

        <div
          v-else-if="resultadosEnquete.length === 0"
          class="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800"
        >
          <p class="text-slate-500 dark:text-slate-400 text-sm font-bold">
            Nenhum voto registrado ainda. Seja o primeiro a votar!
          </p>
        </div>

        <div
          v-else
          class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm"
        >
          <div class="space-y-6">
            <div
              v-for="(candidato, index) in resultadosEnquete.slice(0, 5)"
              :key="candidato.id"
              class="flex items-center gap-4"
            >
              <div class="relative shrink-0">
                <img
                  :src="candidato.fotoUrl"
                  alt="Foto do candidato"
                  class="w-12 h-16 sm:w-16 sm:h-20 object-cover rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                />
                <div
                  v-if="index === 0"
                  class="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-md"
                >
                  1º
                </div>
                <div
                  v-else
                  class="absolute -top-2 -right-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-md"
                >
                  {{ index + 1 }}º
                </div>
              </div>

              <div class="flex-grow min-w-0">
                <div class="flex justify-between items-end mb-1">
                  <div>
                    <h4
                      class="font-black text-slate-900 dark:text-white text-base sm:text-lg truncate"
                    >
                      {{ candidato.nomeUrna }}
                    </h4>
                    <p
                      class="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase"
                    >
                      {{ candidato.partido }}
                    </p>
                  </div>
                  <div class="text-right">
                    <span class="text-lg sm:text-xl font-black text-purple-700 dark:text-purple-400"
                      >{{ calcularPorcentagem(candidato.totalVotos) }}%</span
                    >
                  </div>
                </div>

                <div
                  class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-1 overflow-hidden"
                >
                  <div
                    class="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-1000 ease-out"
                    :style="{
                      width: `${calcularPorcentagem(candidato.totalVotos).replace(',', '.')}%`,
                    }"
                  ></div>
                </div>
                <p class="text-[10px] text-right text-slate-400 dark:text-slate-500 font-bold">
                  {{ candidato.totalVotos }} {{ candidato.totalVotos === 1 ? 'voto' : 'votos' }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4"
          >
            <p
              class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest"
            >
              Total computado:
              <span class="text-slate-900 dark:text-white">{{ totalVotosEnquete }} votos</span>
            </p>

            <!-- 🔥 BOTÃO DA URNA OU MENSAGEM DE BLOQUEIO -->
            <div class="w-full md:w-auto">
              <button
                v-if="!bloqueadoParaVoto"
                @click="abrirUrna"
                class="w-full px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-[0_4px_15px_rgba(147,51,234,0.4)] transition-all flex items-center justify-center gap-3 animate-pulse hover:animate-none"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  ></path>
                </svg>
                Votar na Urna Virtual
              </button>

              <div
                v-else
                class="w-full px-6 py-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-widest rounded-xl shadow-inner flex items-center justify-center gap-3 cursor-not-allowed cursor-wait"
              >
                <svg
                  class="w-5 h-5 animate-spin text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                Novo voto em: {{ tempoBloqueioFormatado }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CAIXA DE STATUS E IMPORTAÇÃO -->
      <div
        class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors mt-8"
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

            <!-- PAINEL DE MANUTENÇÃO GRANULAR -->
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
                <label class="flex items-center gap-2 cursor-pointer"
                  ><input
                    type="checkbox"
                    v-model="opcoesManutencao.situacao"
                    class="w-4 h-4 text-indigo-600 rounded"
                  /><span class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >Situação Judicial</span
                  ></label
                >
                <label class="flex items-center gap-2 cursor-pointer"
                  ><input
                    type="checkbox"
                    v-model="opcoesManutencao.foto"
                    class="w-4 h-4 text-indigo-600 rounded"
                  /><span class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >Fotos / Imagens</span
                  ></label
                >
                <label class="flex items-center gap-2 cursor-pointer"
                  ><input
                    type="checkbox"
                    v-model="opcoesManutencao.bens"
                    class="w-4 h-4 text-indigo-600 rounded"
                  /><span class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >Bens & Limites</span
                  ></label
                >
                <label class="flex items-center gap-2 cursor-pointer"
                  ><input
                    type="checkbox"
                    v-model="opcoesManutencao.vicesEPessoais"
                    class="w-4 h-4 text-indigo-600 rounded"
                  /><span class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >Vices & Pessoais</span
                  ></label
                >
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

            <!-- 🔥 NOVO PAINEL DE CONFIGURAÇÃO DA URNA (DEV) -->
            <div
              v-if="isDev"
              class="mt-4 p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl"
            >
              <div class="flex items-center gap-2 mb-3">
                <svg
                  class="w-5 h-5 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  ></path>
                </svg>
                <h4 class="font-bold text-slate-800 dark:text-slate-200">
                  Configurações da Urna (Global)
                </h4>
              </div>

              <div class="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="configUrna.bloqueioAtivo"
                    class="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >Ativar bloqueio de votos (Cooldown)</span
                  >
                </label>

                <div
                  class="flex items-center gap-2"
                  :class="{ 'opacity-50 pointer-events-none': !configUrna.bloqueioAtivo }"
                >
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >Minutos:</span
                  >
                  <input
                    type="number"
                    v-model="configUrna.tempoMinutos"
                    min="1"
                    class="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-sm text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <button
                  @click="salvarConfigUrna"
                  class="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all focus:ring-4 focus:ring-purple-300"
                >
                  💾 Salvar Configurações
                </button>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-3">
                Estas configurações são aplicadas imediatamente a todos os usuários da AWS. Desative
                e clique em salvar para poder testar votos infinitamente no localhost.
              </p>
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

    <!-- 🔥 MODAL: SIMULADOR DE URNA ELETRÔNICA -->
    <div
      v-if="modalUrnaAberto"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div
        class="bg-[#dcdcdc] rounded-xl flex flex-col sm:flex-row w-full max-w-3xl overflow-hidden shadow-2xl relative border-[8px] border-slate-700"
      >
        <button
          @click="fecharUrna"
          class="absolute top-2 right-2 sm:right-auto sm:left-2 w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-md z-10 transition-colors"
        >
          X
        </button>

        <!-- LADO ESQUERDO: TELA -->
        <div class="flex-grow p-4 sm:p-8">
          <div
            class="bg-[#f0f0f0] border-4 border-slate-300 w-full h-[320px] p-4 flex flex-col font-mono text-slate-800 shadow-inner relative overflow-hidden"
          >
            <div v-if="urnaCarregando" class="flex flex-col items-center justify-center h-full">
              <div
                class="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin"
              ></div>
              <p class="mt-4 font-bold text-sm uppercase">Carregando candidatos...</p>
            </div>

            <div v-else-if="votoFim" class="flex items-center justify-center h-full">
              <span class="text-6xl font-black tracking-widest text-slate-800">FIM</span>
            </div>

            <div v-else class="flex flex-col h-full">
              <h3 class="text-sm font-bold uppercase tracking-widest mb-4">Presidente</h3>

              <div v-if="votoBranco" class="flex-grow flex items-center justify-center">
                <span class="text-4xl font-black uppercase tracking-widest animate-pulse"
                  >Voto em Branco</span
                >
              </div>

              <div v-else class="flex flex-col flex-grow">
                <div class="flex items-center gap-3 mb-4">
                  <span class="text-sm font-bold uppercase">Número:</span>
                  <div class="flex gap-1">
                    <div
                      class="w-10 h-12 border-2 border-slate-800 flex items-center justify-center text-3xl font-bold bg-white shadow-inner"
                    >
                      {{ numeroUrna[0] || '' }}
                    </div>
                    <div
                      class="w-10 h-12 border-2 border-slate-800 flex items-center justify-center text-3xl font-bold bg-white shadow-inner"
                    >
                      {{ numeroUrna[1] || '' }}
                    </div>
                  </div>
                </div>

                <div
                  v-if="candidatoSelecionadoUrna"
                  class="flex justify-between items-start flex-grow"
                >
                  <div class="space-y-2 mt-2">
                    <p class="text-sm uppercase font-bold">
                      Nome: <span class="font-normal">{{ candidatoSelecionadoUrna.nomeUrna }}</span>
                    </p>
                    <p class="text-sm uppercase font-bold">
                      Partido:
                      <span class="font-normal">{{ candidatoSelecionadoUrna.partido }}</span>
                    </p>
                    <p
                      v-if="
                        candidatoSelecionadoUrna.vices && candidatoSelecionadoUrna.vices.length > 0
                      "
                      class="text-xs uppercase font-bold mt-4 text-slate-600"
                    >
                      Vice: <span class="font-normal">{{ candidatoSelecionadoUrna.vices[0] }}</span>
                    </p>
                  </div>
                  <img
                    :src="candidatoSelecionadoUrna.fotoUrl"
                    class="w-20 h-28 border border-slate-400 object-cover grayscale brightness-110"
                  />
                </div>

                <div v-else-if="numeroUrna.length === 2" class="flex flex-col flex-grow mt-2">
                  <p class="text-xl font-bold uppercase">Número Errado</p>
                  <p class="text-2xl font-black uppercase mt-4 animate-pulse">Voto Nulo</p>
                </div>
              </div>

              <div
                class="border-t-2 border-slate-800 pt-2 text-[10px] uppercase font-bold flex flex-col gap-0.5 mt-auto"
              >
                <p>Aperte a tecla:</p>
                <p>VERDE para CONFIRMAR</p>
                <p>LARANJA para CORRIGIR</p>
              </div>
            </div>
          </div>
        </div>

        <!-- LADO DIREITO: TECLADO NUMÉRICO -->
        <div
          class="w-full sm:w-[320px] bg-[#292a2a] p-6 flex flex-col justify-center items-center shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.3)]"
        >
          <div class="w-full flex justify-end mb-6">
            <span class="text-white/50 font-black text-xs tracking-widest uppercase"
              >Justiça Eleitoral</span
            >
          </div>

          <div class="grid grid-cols-3 gap-3 mb-8 w-full max-w-[220px]">
            <button
              v-for="n in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
              :key="n"
              @click="teclarUrna(n)"
              class="bg-[#111111] text-white hover:bg-black font-bold text-2xl py-3 rounded-md shadow-[0_5px_0_#000] active:shadow-none active:translate-y-[5px] transition-all"
            >
              {{ n }}
            </button>
            <div class="col-start-2">
              <button
                @click="teclarUrna('0')"
                class="bg-[#111111] text-white hover:bg-black font-bold text-2xl w-full py-3 rounded-md shadow-[0_5px_0_#000] active:shadow-none active:translate-y-[5px] transition-all"
              >
                0
              </button>
            </div>
          </div>

          <div class="flex gap-2 w-full max-w-[260px]">
            <button
              @click="votarBrancoUrna"
              class="flex-1 bg-white hover:bg-slate-200 text-black font-bold text-[10px] sm:text-xs uppercase pt-2 pb-1 px-1 rounded shadow-[0_4px_0_#9ca3af] active:shadow-none active:translate-y-[4px] transition-all leading-tight"
            >
              Branco
            </button>
            <button
              @click="corrigirUrna"
              class="flex-1 bg-[#ff6b00] hover:bg-[#ff8000] text-black font-bold text-[10px] sm:text-xs uppercase pt-2 pb-1 px-1 rounded shadow-[0_4px_0_#cc5500] active:shadow-none active:translate-y-[4px] transition-all leading-tight"
            >
              Corrige
            </button>
            <button
              @click="confirmarUrna"
              class="flex-1 bg-[#00c853] hover:bg-[#00e676] text-black font-bold text-[10px] sm:text-xs uppercase pt-2 pb-1 px-1 rounded shadow-[0_4px_0_#009624] active:shadow-none active:translate-y-[4px] transition-all leading-tight"
            >
              Confirma
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
