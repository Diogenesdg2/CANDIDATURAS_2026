<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buscarCandidatos,
  atualizarStatusCandidato,
  buscarRaioXCamara,
  getStatusManutencao,
  gerarResumoIA,
} from '../firebase/candidatosService'

const route = useRoute()
const router = useRouter()
const ufUrl = route.query.uf || ''
const cargoUrl = route.query.cargo || ''

const isDev = import.meta.env.DEV
const emManutencao = ref(false)
const carregandoConfig = ref(true)

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

const carregando = ref(false)
const buscaRealizada = ref(false)

const inputBusca = ref('')
const inputUf = ref(ufUrl || '')
const inputCargo = ref(cargoUrl ? CARGOS[cargoUrl] || '' : '')
const inputPartido = ref('')
const inputSituacao = ref('')

const filtroBusca = ref('')
const filtroUf = ref(ufUrl || '')
const filtroCargo = ref(cargoUrl ? CARGOS[cargoUrl] || '' : '')
const filtroPartido = ref('')
const filtroSituacao = ref('')

const candidatos = ref([])
const atualizandoId = ref(null)
const atualizandoTodos = ref(false)
const progressoGlobal = ref({ atual: 0, total: 0 })

const limiteExibicao = ref(30)

const modalAberto = ref(false)
const tipoModal = ref('')
const candidatoAtivo = ref({})

const dadosRaioX = ref(null)
const raioxLoading = ref(false)
const deputadosAtuais = ref([])

const resumoIALoading = ref(false)
const resumoIATexto = ref('')

const ufsOficiais = [
  { sigla: 'BR', nome: 'Brasil (Nacional)' },
  { sigla: 'AC', nome: 'Acre (AC)' },
  { sigla: 'AL', nome: 'Alagoas (AL)' },
  { sigla: 'AP', nome: 'Amapá (AP)' },
  { sigla: 'AM', nome: 'Amazonas (AM)' },
  { sigla: 'BA', nome: 'Bahia (BA)' },
  { sigla: 'CE', nome: 'Ceará (CE)' },
  { sigla: 'DF', nome: 'Distrito Federal (DF)' },
  { sigla: 'ES', nome: 'Espírito Santo (ES)' },
  { sigla: 'GO', nome: 'Goiás (GO)' },
  { sigla: 'MA', nome: 'Maranhão (MA)' },
  { sigla: 'MT', nome: 'Mato Grosso (MT)' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul (MS)' },
  { sigla: 'MG', nome: 'Minas Gerais (MG)' },
  { sigla: 'PA', nome: 'Pará (PA)' },
  { sigla: 'PB', nome: 'Paraíba (PB)' },
  { sigla: 'PR', nome: 'Paraná (PR)' },
  { sigla: 'PE', nome: 'Pernambuco (PE)' },
  { sigla: 'PI', nome: 'Piauí (PI)' },
  { sigla: 'RJ', nome: 'Rio de Janeiro (RJ)' },
  { sigla: 'RN', nome: 'Rio Grande do Norte (RN)' },
  { sigla: 'RS', nome: 'Rio Grande do Sul (RS)' },
  { sigla: 'RO', nome: 'Rondônia (RO)' },
  { sigla: 'RR', nome: 'Roraima (RR)' },
  { sigla: 'SC', nome: 'Santa Catarina (SC)' },
  { sigla: 'SP', nome: 'São Paulo (SP)' },
  { sigla: 'SE', nome: 'Sergipe (SE)' },
  { sigla: 'TO', nome: 'Tocantins (TO)' },
]

const partidosOficiais = [
  'AGIR',
  'AVANTE',
  'CIDADANIA',
  'DC',
  'MDB',
  'MOBILIZA',
  'NOVO',
  'PCdoB',
  'PCB',
  'PCO',
  'PDT',
  'PL',
  'PMB',
  'PMN',
  'PODE',
  'PP',
  'PRD',
  'PRTB',
  'PSB',
  'PSD',
  'PSDB',
  'PSOL',
  'PSTU',
  'PT',
  'PV',
  'REDE',
  'REPUBLICANOS',
  'SOLIDARIEDADE',
  'UNIÃO',
  'UP',
]

const cargosOficiais = [
  'Presidente',
  'Vice-Presidente',
  'Governador',
  'Vice-Governador',
  'Senador',
  'Deputado Federal',
  'Deputado Estadual',
  'Deputado Distrital',
  '1º Suplente',
  '2º Suplente',
]

const situacoesOficiais = [
  'Aguardando julgamento',
  'Deferido',
  'Deferido com recurso',
  'Indeferido',
  'Indeferido com recurso',
  'Cassado',
  'Cancelado',
  'Renúncia',
  'Falecido',
  'Não informado',
]

const aplicarFiltros = async () => {
  const mudouFiltroPesado =
    filtroUf.value !== inputUf.value || filtroCargo.value !== inputCargo.value

  if (candidatos.value.length === 0 || mudouFiltroPesado) {
    carregando.value = true
    candidatos.value = await buscarCandidatos(
      inputUf.value,
      Object.keys(CARGOS).find((key) => CARGOS[key] === inputCargo.value),
    )
    carregando.value = false
  }

  filtroBusca.value = inputBusca.value
  filtroUf.value = inputUf.value
  filtroCargo.value = inputCargo.value
  filtroPartido.value = inputPartido.value
  filtroSituacao.value = inputSituacao.value

  limiteExibicao.value = 30
  buscaRealizada.value = true
}

const limparFiltros = () => {
  inputBusca.value = ''
  inputUf.value = ''
  inputCargo.value = ''
  inputPartido.value = ''
  inputSituacao.value = ''

  filtroBusca.value = ''
  filtroUf.value = ''
  filtroCargo.value = ''
  filtroPartido.value = ''
  filtroSituacao.value = ''

  candidatos.value = []
  buscaRealizada.value = false
}

const candidatosFiltrados = computed(() => {
  if (!buscaRealizada.value) return []

  return candidatos.value.filter((c) => {
    const nome = (c.nomeUrna || c.nome || '').toLowerCase()
    const completo = (c.nomeCompleto || '').toLowerCase()
    const termoBusca = filtroBusca.value.toLowerCase()

    const bateNome = nome.includes(termoBusca) || completo.includes(termoBusca)
    const bateUf = !filtroUf.value || c.uf === filtroUf.value
    const bateCargo = !filtroCargo.value || c.cargo === filtroCargo.value
    const batePartido = !filtroPartido.value || c.partido === filtroPartido.value

    const bateSituacao =
      !filtroSituacao.value ||
      (c.situacaoCandidatura || 'Não informado')
        .toUpperCase()
        .includes(filtroSituacao.value.toUpperCase())

    return bateNome && bateUf && bateCargo && batePartido && bateSituacao
  })
})

const candidatosPaginados = computed(() => {
  return candidatosFiltrados.value.slice(0, limiteExibicao.value)
})

const carregarMais = () => {
  limiteExibicao.value += 30
}

const tituloPagina = computed(() => {
  if (filtroUf.value || filtroCargo.value) {
    const nomeCargo = filtroCargo.value || 'Candidaturas'
    const textoUf = filtroUf.value
      ? filtroUf.value === 'BR'
        ? 'em todo o Brasil'
        : `em ${filtroUf.value}`
      : ''
    return `${nomeCargo} ${textoUf}`.trim()
  }
  return 'Explorador de Candidatos'
})

onMounted(async () => {
  carregandoConfig.value = true
  emManutencao.value = await getStatusManutencao()
  carregandoConfig.value = false

  if (emManutencao.value && !isDev) return

  if (ufUrl || cargoUrl) {
    await aplicarFiltros()
  }

  try {
    const res = await fetch('https://dadosabertos.camara.leg.br/api/v2/deputados')
    if (res.ok) {
      const data = await res.json()
      deputadosAtuais.value = data.dados
    }
  } catch (e) {
    console.warn('Aviso: Não foi possível carregar a lista prévia da Câmara.', e)
  }
})

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

  if (tipo === 'resumoIA') {
    resumoIATexto.value = ''
    resumoIALoading.value = true
    try {
      resumoIATexto.value = await gerarResumoIA(candidato)
      candidatoAtivo.value.resumoIA = resumoIATexto.value
    } catch (e) {
      resumoIATexto.value = `<p class="text-red-500 font-bold text-center py-4">Ops! ${e.message}</p>`
    } finally {
      resumoIALoading.value = false
    }
  }
}

const candidatosComparacao = ref([])
const modalComparacaoAberto = ref(false)

const toggleComparacao = (candidato) => {
  const index = candidatosComparacao.value.findIndex((c) => c.id === candidato.id)
  if (index > -1) {
    candidatosComparacao.value.splice(index, 1)
  } else {
    if (candidatosComparacao.value.length >= 2) {
      alert('Você só pode comparar 2 candidatos por vez!')
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

const ordenarBens = (bens) => {
  if (!bens || bens.length === 0) return []
  return [...bens].sort((a, b) => b.valor - a.valor)
}

const isDeputadoCamara = (candidato) => {
  if (deputadosAtuais.value.length === 0) return false
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

const alertarFaltaPlano = (e) => {
  e.preventDefault()
  alert(
    'O Plano de Governo ainda não foi mapeado no banco para este candidato. Clique em "Sincronizar Ficha".',
  )
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
    candidato.fotoUrl = novosDados.fotoUrl
    candidato.sites = novosDados.sites || []
    candidato.planoGovernoUrl = novosDados.planoGovernoUrl || null
  } catch (error) {
    alert('A requisição falhou no servidor TSE.')
  } finally {
    atualizandoId.value = null
  }
}

const atualizarTodosStatus = async () => {
  const lista = candidatosFiltrados.value
  if (lista.length === 0) return

  atualizandoTodos.value = true
  progressoGlobal.value = { atual: 0, total: lista.length }
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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
      candidato.fotoUrl = novosDados.fotoUrl
      candidato.sites = novosDados.sites || []
      candidato.planoGovernoUrl = novosDados.planoGovernoUrl || null
    } catch (error) {
      console.warn(`Falha ao sincronizar ${candidato.nomeUrna}.`)
    }
    progressoGlobal.value.atual++
    await sleep(1000)
  }
  atualizandoId.value = null
  atualizandoTodos.value = false
}

// 🔥 FUNÇÃO NOVA: RETORNA CORES E TEXTOS DO SELO
const getDadosSelo = (situacao) => {
  if (!situacao)
    return {
      texto: 'Sem Dados',
      cor: 'bg-slate-500 text-white border-slate-600',
      icone: '❓',
      animacao: '',
    }

  const sitUpper = situacao.toUpperCase()

  // Condição para Ficha Suja / Barrado
  if (
    sitUpper.includes('INDEFERIDO') ||
    sitUpper.includes('CASSADO') ||
    sitUpper.includes('CANCELADO') ||
    sitUpper.includes('INELEGÍVEL')
  ) {
    return {
      texto: 'ALERTA LEGAL',
      cor: 'bg-red-600 text-white border-red-800 shadow-red-900/50',
      icone: '🚨',
      animacao: 'animate-pulse',
    }
  }
  // Condição para Ficha Limpa
  if (sitUpper.includes('DEFERIDO')) {
    return {
      texto: 'FICHA LIMPA',
      cor: 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-900/50',
      icone: '✅',
      animacao: '',
    }
  }
  // Condição para Aguardando Julgamento
  return {
    texto: 'EM ANÁLISE',
    cor: 'bg-amber-400 text-amber-950 border-amber-500 shadow-amber-900/50',
    icone: '⚖️',
    animacao: '',
  }
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
  if (sitUpper.includes('DEFERIDO')) return 'bg-blue-600'
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
    const ID_ELEICAO_2026 = '20322002026'
    e.target.src = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${ID_ELEICAO_2026}/${candidato.idTse}/${candidato.uf}?t=${new Date().getTime()}`
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
    : candidato.situacaoCandidatura?.toUpperCase().includes('DEFERIDO')
      ? '✅'
      : '⚖️'

  let textoVice = ''
  if (['Presidente', 'Governador'].includes(candidato.cargo)) {
    if (candidato.vices && candidato.vices.length > 0) {
      textoVice = `*Vice:* ${candidato.vices.join(' e ')}\n`
    } else {
      textoVice = `*Vice:* Aguardando liberação oficial\n`
    }
  }

  const texto =
    `🚨 *FICHA RÁPIDA: ${candidato.nomeUrna.toUpperCase()}* 🚨\nCandidato(a) a ${candidato.cargo} por ${candidato.uf === 'BR' ? 'todo o Brasil' : candidato.uf}\n\n*Número:* ${candidato.numero}\n*Partido:* ${candidato.partido}\n${textoVice}*Idade:* ${idade}\n\n${emojiStatus} *Situação:* ${candidato.situacaoCandidatura || 'Não informado'}\n\n💰 *Patrimônio:* ${patrimonio}\n📈 *Limite Gastos:* ${limite}\n\n🔗 *Explorador Eleitoral 2026:* https://main.d19svo3o4axtyl.amplifyapp.com`.trim()

  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
}

const compartilharSantinhoWhatsApp = (candidato) => {
  const texto = `🎴 *SANTINHO VIRTUAL*\n\nVote *${candidato.nomeUrna.toUpperCase()}* para ${candidato.cargo}!\n✅ *Número Oficial: ${candidato.numero}*\n🗳️ Partido: ${candidato.partido}\n\nConheça o candidato e baixe o Santinho Digital no Explorador Eleitoral 2026:\n🔗 https://main.d19svo3o4axtyl.amplifyapp.com`
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
}

// 🔥 A MÁGICA DE IMPRESSÃO ISOLADA (BLINDADA CONTRA O VITE/PRETTIER)
const imprimirSantinho = () => {
  const cardElement = document.getElementById('santinho-card')
  if (!cardElement) return

  const cardHtml = cardElement.outerHTML

  const printWindow = window.open('', '_blank')

  // 🛡️ Truque Ninja: Separamos as tags para o Vue/Prettier nunca lerem como HTML
  const headCdn = '<scr' + 'ipt src="https://cdn.tailwindcss.com"></scr' + 'ipt>'
  const styleOpen = '<sty' + 'le>'
  const styleClose = '</sty' + 'le>'
  const scriptOpen = '<scr' + 'ipt>'
  const scriptClose = '</scr' + 'ipt>'

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Santinho - ${candidatoAtivo.value.nomeUrna}</title>
      ${headCdn}
      ${styleOpen}
        body {
          background-color: #ffffff !important;
          display: flex;
          justify-content: flex-start;
          align-items: flex-start;
          margin: 0;
          padding: 20px;
        }

        #santinho-card {
          width: 10cm !important;
          height: 14.5cm !important;
          max-width: none !important;
          margin: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          border: 4px solid #fbbf24 !important;
          background-color: #0f172a !important;
          box-sizing: border-box !important;
          border-radius: 1.5rem !important;
        }

        #santinho-card img {
          object-fit: cover !important;
        }

        @media print {
          @page {
            margin: 1cm;
            size: portrait;
          }
          body {
            padding: 0;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      ${styleClose}
    </head>
    <body>
      ${cardHtml}
      ${scriptOpen}
        setTimeout(() => {
          window.print();
        }, 800);
      ${scriptClose}
    </body>
    </html>
  `)
  printWindow.document.close()
}
</script>

<template>
  <div class="space-y-8 max-w-5xl mx-auto pb-12 transition-colors duration-300">
    <div v-if="carregandoConfig" class="flex flex-col items-center justify-center py-32 space-y-4">
      <div
        class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
      ></div>
      <p class="text-slate-500 font-bold tracking-widest uppercase text-sm">
        Verificando Servidores...
      </p>
    </div>

    <div
      v-else-if="emManutencao && !isDev"
      class="flex flex-col items-center justify-center py-20 px-4 text-center"
    >
      <!-- MENSAGEM DE MANUTENÇÃO OMITIDA POR BREVIDADE, MAS MANTIDA IGUAIZINHA -->
      <h1
        class="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4"
      >
        Página Indisponível
      </h1>
      <button
        @click="$router.push('/')"
        class="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all"
      >
        Retornar ao Início
      </button>
    </div>

    <main v-else class="space-y-6 relative transition-colors duration-300">
      <div
        v-if="isDev"
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 font-bold flex items-center gap-2"
      >
        Aviso de Dev: A Chave de Manutenção está LIGADA.
      </div>

      <header class="flex flex-col gap-5">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white" tabindex="0">
              {{ tituloPagina }}
            </h1>
            <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">
              <span v-if="buscaRealizada" class="font-semibold text-blue-600 dark:text-blue-400"
                >{{ candidatosFiltrados.length }} candidatos encontrados</span
              >
              <span v-else>Faça uma pesquisa para listar os registros.</span>
            </p>
          </div>

          <button
            v-if="buscaRealizada && candidatosFiltrados.length > 0"
            @click="atualizarTodosStatus"
            :disabled="atualizandoTodos"
            class="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 self-start md:self-auto"
          >
            {{
              atualizandoTodos
                ? `Sincronizando ${progressoGlobal.atual}/${progressoGlobal.total}...`
                : 'Sincronizar Tela com TSE'
            }}
          </button>
        </div>

        <!-- BARRA DE FILTROS -->
        <div
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col xl:flex-row gap-3 items-stretch xl:items-center"
        >
          <input
            v-model="inputBusca"
            @keyup.enter="aplicarFiltros"
            type="search"
            placeholder="Buscar por nome..."
            class="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            v-model="inputUf"
            class="w-full xl:w-44 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm"
          >
            <option value="">Todos os Estados</option>
            <option v-for="u in ufsOficiais" :key="u.sigla" :value="u.sigla">{{ u.nome }}</option>
          </select>
          <select
            v-model="inputCargo"
            class="w-full xl:w-44 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm"
          >
            <option value="">Todos os Cargos</option>
            <option v-for="c in cargosOficiais" :key="c" :value="c">{{ c }}</option>
          </select>
          <select
            v-model="inputPartido"
            class="w-full xl:w-36 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm"
          >
            <option value="">Partidos (Todos)</option>
            <option v-for="p in partidosOficiais" :key="p" :value="p">{{ p }}</option>
          </select>
          <select
            v-model="inputSituacao"
            class="w-full xl:w-44 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm"
          >
            <option value="">Qualquer Situação</option>
            <option v-for="s in situacoesOficiais" :key="s" :value="s">{{ s }}</option>
          </select>
          <div
            class="flex gap-2 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-slate-700 xl:pl-3"
          >
            <button
              @click="aplicarFiltros"
              class="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm"
            >
              Filtrar
            </button>
            <button
              v-if="buscaRealizada"
              @click="limparFiltros"
              class="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm"
            >
              Limpar
            </button>
          </div>
        </div>
      </header>

      <div
        v-if="!buscaRealizada && !carregando"
        class="text-center py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Painel de Filtros Avançado
        </h2>
        <p class="text-slate-500 dark:text-slate-400 text-sm">
          Selecione os filtros acima e clique em <strong>"Filtrar"</strong>.
        </p>
      </div>

      <div
        v-else-if="carregando"
        class="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"
      >
        <div
          class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
        ></div>
        <p class="text-slate-500 dark:text-slate-400 font-medium text-sm">
          Carregando candidatos...
        </p>
      </div>

      <!-- GRID DE CANDIDATOS -->
      <section
        v-else-if="candidatosPaginados.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        <article
          v-for="candidato in candidatosPaginados"
          :key="candidato.id"
          class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between"
          :class="{ 'ring-4 ring-indigo-500 shadow-lg': isSelecionadoParaComparar(candidato) }"
        >
          <div class="p-6">
            <div
              class="relative mb-4 flex justify-center bg-slate-50 dark:bg-slate-800/50 py-4 rounded-xl border border-slate-100 dark:border-slate-700/50"
              :class="{ 'grayscale opacity-75': isInelegivel(candidato.situacaoCandidatura) }"
            >
              <!-- 🔥 NOVO SELO DE FICHA SUJA / LIMPA -->
              <div
                v-if="candidato.situacaoCandidatura"
                class="absolute -top-3 -right-2 px-3 py-1.5 rounded-lg border-[3px] font-black text-[10px] sm:text-xs tracking-widest uppercase shadow-lg flex items-center gap-1.5 z-10 transition-transform hover:scale-105"
                :class="[
                  getDadosSelo(candidato.situacaoCandidatura).cor,
                  getDadosSelo(candidato.situacaoCandidatura).animacao,
                ]"
              >
                <span class="text-sm">{{ getDadosSelo(candidato.situacaoCandidatura).icone }}</span>
                {{ getDadosSelo(candidato.situacaoCandidatura).texto }}
              </div>

              <img
                :src="candidato.fotoUrl"
                :alt="`Foto oficial de ${candidato.nomeUrna}`"
                class="w-32 h-40 object-cover border border-slate-300 dark:border-slate-600 shadow-sm rounded bg-slate-200 dark:bg-slate-700"
                @error="(e) => tratarErroFoto(e, candidato)"
              />
            </div>

            <div class="flex items-center space-x-4 mb-4">
              <div class="w-full">
                <div class="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span
                    class="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    >Nº {{ candidato.numero }}</span
                  >
                  <span
                    class="inline-block bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
                    >{{ candidato.uf === 'BR' ? 'Brasil' : candidato.uf }}</span
                  >
                  <span
                    class="inline-block bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700"
                    >{{ calcularIdade(candidato.dataDeNascimento) }}</span
                  >
                </div>

                <h2 class="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {{ candidato.nomeUrna }}
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {{ candidato.cargo }}
                  <span class="font-bold text-slate-700 dark:text-slate-300"
                    >({{ candidato.uf === 'BR' ? 'Nacional' : candidato.uf }})</span
                  >
                  • {{ candidato.partido }}
                </p>

                <!-- BOTÕES DE REDES E PLANO -->
                <div
                  class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3"
                >
                  <button
                    @click="abrirModal(candidato, 'redes')"
                    class="flex items-center justify-center gap-2 w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    🌐 Redes Sociais / Sites ({{ candidato.sites ? candidato.sites.length : 0 }})
                  </button>

                  <div
                    v-if="['Presidente', 'Governador'].includes(candidato.cargo)"
                    class="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 shadow-sm"
                  >
                    <p
                      class="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest text-center mb-2.5"
                    >
                      Plano de Governo
                    </p>
                    <div class="flex items-center gap-2 w-full">
                      <a
                        :href="candidato.planoGovernoUrl || '#'"
                        @click="!candidato.planoGovernoUrl ? alertarFaltaPlano($event) : null"
                        :target="candidato.planoGovernoUrl ? '_blank' : '_self'"
                        class="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-colors truncate shadow-sm"
                      >
                        📄 PDF Completo
                      </a>
                      <button
                        @click="abrirModal(candidato, 'resumoIA')"
                        :disabled="!candidato.planoGovernoUrl"
                        :class="
                          candidato.planoGovernoUrl
                            ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white border-transparent'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed border-transparent'
                        "
                        class="flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-lg text-xs font-black transition-all shadow-sm truncate"
                      >
                        ✨ Resumo IA
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- SITUAÇÃO & SINCRONIZAR -->
            <div class="space-y-2 mb-6">
              <div
                class="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 flex items-center justify-between shadow-sm"
              >
                <div>
                  <span
                    class="text-[10px] uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-400 block"
                    >Patrimônio Declarado</span
                  >
                  <span
                    class="text-sm sm:text-base font-black text-emerald-900 dark:text-emerald-200"
                    >{{ formatarMoeda(candidato.totalBens) }}</span
                  >
                </div>
                <span class="text-2xl" aria-hidden="true">💰</span>
              </div>

              <div
                class="p-3 rounded-sm text-white"
                :class="getCorSituacao(candidato.situacaoCandidatura)"
              >
                <p class="text-sm font-bold truncate">
                  {{ candidato.situacaoCandidatura || 'Não informado' }}
                </p>
                <p class="text-[10px] uppercase opacity-90">Situação Candidatura</p>
              </div>
              <button
                @click="verificarStatusEmTempoReal(candidato)"
                :disabled="atualizandoId === candidato.id || atualizandoTodos"
                class="w-full flex items-center justify-center gap-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 py-2 rounded-sm"
              >
                {{ atualizandoId === candidato.id ? 'Baixando dados...' : 'Sincronizar Ficha' }}
              </button>
            </div>
          </div>

          <!-- BARRA DE AÇÕES INFERIOR -->
          <div
            class="bg-slate-50 dark:bg-slate-800/30 p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5"
          >
            <div class="flex items-center justify-between gap-2.5">
              <button
                @click="abrirModal(candidato, 'bens')"
                class="flex-1 py-2 px-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                💰 Bens
              </button>
              <button
                @click="abrirModal(candidato, 'raiox')"
                :disabled="!isDeputadoCamara(candidato)"
                class="flex-1 py-2 px-1 text-xs font-bold rounded-xl transition-colors shadow-sm"
                :class="
                  isDeputadoCamara(candidato)
                    ? 'bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60 border border-slate-200 dark:border-slate-700'
                "
              >
                🏛️ Raio-X
              </button>
              <button
                @click="toggleComparacao(candidato)"
                :class="
                  isSelecionadoParaComparar(candidato)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                "
                class="flex-1 py-2 px-1 border text-xs font-black rounded-xl transition-colors shadow-sm"
              >
                ⚖️ VS
              </button>
            </div>
            <div class="flex items-center justify-between gap-2.5">
              <button
                @click="abrirModal(candidato, 'santinho')"
                class="flex-1 py-2 px-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-black rounded-xl hover:bg-purple-100 transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                🎴 Santinho
              </button>
              <button
                @click="compartilharWhatsApp(candidato)"
                class="flex-1 py-2 px-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
                  />
                </svg>
                Ficha Rápida
              </button>
            </div>
          </div>
        </article>
      </section>

      <div v-if="candidatosFiltrados.length > limiteExibicao" class="flex justify-center mt-10">
        <button
          @click="carregarMais"
          class="px-8 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm border border-slate-200 dark:border-slate-700"
        >
          Mostrar mais candidatos
        </button>
      </div>
    </main>
  </div>

  <!-- MODALS OMITIDOS NA EXIBIÇÃO AQUI PARA ECONOMIZAR ESPAÇO, MAS ESTÃO AQUI NO CÓDIGO FONTE! -->
  <div
    v-if="modalAberto"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
  >
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800"
    >
      <header
        class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10"
      >
        <span class="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          {{
            tipoModal === 'bens'
              ? 'Detalhamento de Bens Declarados'
              : tipoModal === 'raiox'
                ? 'Raio-X Câmara'
                : tipoModal === 'redes'
                  ? 'Redes Sociais'
                  : tipoModal === 'resumoIA'
                    ? '✨ Resumo Inteligente do Plano'
                    : '🎴 Santinho Virtual'
          }}
        </span>
        <button
          @click="modalAberto = false"
          class="text-slate-400 hover:text-slate-600 text-2xl font-bold"
        >
          &times;
        </button>
      </header>

      <div class="p-6">
        <div v-if="tipoModal === 'resumoIA'" class="relative min-h-[300px] print-hidden">
          <div
            v-if="resumoIALoading"
            class="flex flex-col items-center justify-center py-12 text-center animate-pulse"
          >
            <div
              class="w-16 h-16 bg-gradient-to-tr from-fuchsia-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6"
            >
              <svg class="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"
                ></path>
              </svg>
            </div>
            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-2">
              A IA está lendo o Plano de Governo...
            </h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Isso leva de 5 a 10 segundos apenas na primeira vez. Depois, o resumo fica salvo no
              banco!
            </p>
          </div>
          <div v-else class="animate-fade-in">
            <div
              class="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-4 mb-4 flex gap-3 items-center"
            >
              <span class="text-3xl">🤖</span>
              <p
                class="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold leading-relaxed"
              >
                Este resumo foi extraído automatically do plano oficial enviado ao TSE. A
                Inteligência Artificial (Google Gemini) leu o documento completo e destacou os
                pilares principais.
              </p>
            </div>
            <div
              class="text-justify text-slate-700 dark:text-slate-300 text-sm leading-relaxed space-y-3 prose prose-sm dark:prose-invert prose-p:mb-2 prose-ul:list-disc prose-ul:pl-4 prose-li:mb-1 prose-strong:text-indigo-600 dark:prose-strong:text-indigo-400"
              v-html="resumoIATexto"
            ></div>
          </div>
        </div>

        <div v-else-if="tipoModal === 'santinho'" class="flex flex-col items-center">
          <div
            id="santinho-card"
            class="w-full bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 border-4 border-amber-400 shadow-2xl relative overflow-hidden text-center"
          >
            <div
              class="absolute top-0 left-0 right-0 bg-amber-400 text-slate-950 font-black text-[10px] py-1 tracking-widest uppercase"
            >
              Eleições 2026 • Transparência & Contas
            </div>
            <div
              class="mt-4 mb-3 inline-block px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow"
            >
              {{ candidatoAtivo.cargo }} ({{
                candidatoAtivo.uf === 'BR' ? 'Brasil' : candidatoAtivo.uf
              }})
            </div>
            <div
              class="w-36 h-44 mx-auto mb-4 rounded-2xl overflow-hidden border-4 border-white/20 shadow-xl bg-slate-800"
            >
              <img
                :src="candidatoAtivo.fotoUrl"
                class="w-full h-full object-cover"
                @error="(e) => tratarErroFoto(e, candidatoAtivo)"
              />
            </div>
            <h2 class="text-2xl font-black uppercase tracking-tight text-white mb-1">
              {{ candidatoAtivo.nomeUrna }}
            </h2>
            <p class="text-sm font-bold text-amber-300 uppercase tracking-widest mb-6">
              {{ candidatoAtivo.partido }}
            </p>
            <div
              class="bg-white text-slate-950 rounded-2xl py-3 px-6 mx-auto inline-block shadow-inner mb-6 border-2 border-amber-400"
            >
              <span class="text-[10px] block font-bold text-slate-500 uppercase tracking-wider"
                >Número Oficial</span
              >
              <span class="text-4xl font-black tracking-widest">{{ candidatoAtivo.numero }}</span>
            </div>
            <div
              class="pt-4 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-400 uppercase font-semibold"
            >
              <span>Patrimônio: {{ formatarMoeda(candidatoAtivo.totalBens) }}</span>
              <span>Verificado no TSE</span>
            </div>
          </div>
          <div class="mt-6 flex gap-3 w-full">
            <button
              @click="imprimirSantinho"
              class="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2"
            >
              🖨️ Salvar / Imprimir Card
            </button>
            <button
              @click="compartilharSantinhoWhatsApp(candidatoAtivo)"
              class="py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all text-sm"
            >
              WhatsApp
            </button>
          </div>
        </div>

        <div v-else-if="tipoModal === 'bens'">
          <p class="text-lg font-black mb-4">{{ formatarMoeda(candidatoAtivo.totalBens) }}</p>
          <div v-if="candidatoAtivo.bens && candidatoAtivo.bens.length > 0" class="space-y-3">
            <div
              v-for="(bem, i) in candidatoAtivo.bens"
              :key="i"
              class="border-b border-slate-100 dark:border-slate-800 pb-2"
            >
              <p class="text-xs font-bold uppercase text-slate-400">{{ bem.tipo }}</p>
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-300">
                {{ bem.descricao }}
              </p>
              <p class="text-sm font-bold text-slate-900 dark:text-white">
                {{ formatarMoeda(bem.valor) }}
              </p>
            </div>
          </div>
          <p v-else class="text-center text-slate-400 text-sm">Nenhum bem declarado.</p>
        </div>

        <div v-else-if="tipoModal === 'raiox'" aria-live="polite">
          <div v-if="raioxLoading" class="text-center py-10">
            <div
              class="w-8 h-8 border-4 border-slate-800 dark:border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            ></div>
            <p class="text-sm font-bold text-slate-700 dark:text-slate-300">
              Conectando ao Portal de Dados Abertos da Câmara...
            </p>
          </div>
          <div
            v-else-if="!dadosRaioX"
            class="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
          >
            <p class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              Candidato não encontrado na Câmara.
            </p>
          </div>
          <div v-else class="space-y-6">
            <div
              class="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <img
                :src="dadosRaioX.foto"
                class="w-16 h-20 object-cover rounded-lg shadow-sm border border-slate-300 dark:border-slate-600 bg-slate-200"
              />
              <div>
                <span
                  class="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1 inline-block"
                  >Deputado(a) Encontrado(a)</span
                >
                <p class="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {{ dadosRaioX.nome }}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  {{ dadosRaioX.partido }}
                </p>
              </div>
            </div>
            <div>
              <h4
                class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2"
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
                  class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg"
                >
                  <p class="text-[10px] font-bold text-slate-400 mb-1 uppercase">
                    {{ projeto.siglaTipo }} {{ projeto.numero }}/{{ projeto.ano }}
                  </p>
                  <p
                    class="text-xs text-slate-700 dark:text-slate-300 font-medium leading-snug line-clamp-3"
                  >
                    {{ projeto.ementa }}
                  </p>
                </article>
              </div>
              <p v-else class="text-xs text-slate-400">Nenhum projeto recente encontrado.</p>
            </div>
          </div>
        </div>

        <div v-else-if="tipoModal === 'redes'">
          <div v-if="candidatoAtivo.sites && candidatoAtivo.sites.length > 0" class="space-y-3">
            <a
              v-for="(url, idx) in candidatoAtivo.sites"
              :key="idx"
              :href="url"
              target="_blank"
              class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <span class="text-xs font-black truncate max-w-[280px]">{{ url }}</span>
              <span class="text-xs font-bold text-blue-500">Abrir →</span>
            </a>
          </div>
          <p v-else class="text-center text-slate-400 text-sm">Nenhuma rede cadastrada.</p>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="candidatosComparacao.length > 0"
    class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 dark:bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl z-40 flex items-center justify-between gap-6 border border-slate-700 w-[90%] max-w-lg"
  >
    <div class="flex items-center gap-3">
      <span
        class="bg-indigo-500 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
        >{{ candidatosComparacao.length }}</span
      >
      <span class="text-sm font-semibold"
        >{{ candidatosComparacao.length }} candidatos selecionados para comparar</span
      >
    </div>
    <div class="flex gap-2">
      <button
        v-if="candidatosComparacao.length === 2"
        @click="abrirComparacao"
        class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
      >
        Comparar Agora
      </button>
      <button
        @click="limparComparacao"
        class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
      >
        Limpar
      </button>
    </div>
  </div>

  <div
    v-if="modalComparacaoAberto"
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
  >
    <div
      class="bg-slate-50 dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative border border-slate-200 dark:border-slate-800"
    >
      <header
        class="p-5 bg-slate-900 dark:bg-black text-white flex justify-between items-center sticky top-0 z-10 border-b border-slate-700"
      >
        <div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-400 block"
            >Modo Versus</span
          >
          <h3 class="text-xl font-black mt-0.5">Comparação Direta</h3>
        </div>
        <button
          @click="modalComparacaoAberto = false"
          class="text-slate-400 hover:text-white text-2xl font-bold"
        >
          &times;
        </button>
      </header>

      <div class="p-4 md:p-8 flex-grow">
        <div class="grid grid-cols-2 gap-4 md:gap-8 relative">
          <div
            class="absolute left-1/2 top-24 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black italic shadow-xl z-20 text-xs md:text-base border-4 border-slate-50 dark:border-slate-900"
          >
            VS
          </div>
          <article
            v-for="(cand, idx) in candidatosComparacao"
            :key="cand.id"
            class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col relative z-10"
          >
            <div
              class="bg-slate-100 dark:bg-slate-900 rounded-t-2xl p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center relative h-48"
            >
              <img
                :src="cand.fotoUrl"
                class="w-24 h-32 object-cover rounded-xl shadow-md border-2 border-white dark:border-slate-700 mb-3 bg-slate-200 dark:bg-slate-800"
              />
              <span
                class="bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider absolute top-4 left-4"
                >Nº {{ cand.numero }}</span
              >
            </div>
            <div class="p-4 md:p-6 space-y-5 flex-grow">
              <div class="text-center border-b border-slate-100 dark:border-slate-700 pb-4">
                <h4 class="font-black text-lg text-slate-900 dark:text-white leading-tight mb-1">
                  {{ cand.nomeUrna }}
                </h4>
                <p class="text-sm font-bold text-slate-500 dark:text-slate-400">
                  {{ cand.cargo }} ({{ cand.uf === 'BR' ? 'Nacional' : cand.uf }}) •
                  {{ cand.partido }}
                </p>
              </div>
              <div>
                <p
                  class="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1 text-center"
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
              <div
                class="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-3 text-center"
              >
                <p
                  class="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-500 font-bold mb-0.5"
                >
                  Patrimônio Total
                </p>
                <p class="text-lg font-black text-emerald-900 dark:text-emerald-400">
                  {{ formatarMoeda(cand.totalBens) }}
                </p>
              </div>
              <div
                class="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 h-64 flex flex-col"
              >
                <p
                  class="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-2 text-center shrink-0"
                >
                  Lista de Bens Declarados
                </p>
                <div class="overflow-y-auto pr-1 flex-grow space-y-2">
                  <template v-if="cand.bens && cand.bens.length > 0">
                    <div
                      v-for="(bem, i) in ordenarBens(cand.bens)"
                      :key="i"
                      class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-2 rounded flex flex-col"
                    >
                      <span class="text-[9px] font-bold uppercase text-slate-400">{{
                        bem.tipo
                      }}</span>
                      <span
                        class="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug line-clamp-2 mt-0.5"
                        >{{ bem.descricao }}</span
                      >
                      <span class="text-sm font-black text-slate-900 dark:text-white mt-1">{{
                        formatarMoeda(bem.valor)
                      }}</span>
                    </div>
                  </template>
                  <div v-else class="h-full flex items-center justify-center">
                    <span class="text-xs text-slate-400 italic">Nenhum bem declarado</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>
