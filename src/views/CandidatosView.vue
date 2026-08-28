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

const CARGOS = {
  1: 'Presidente',
  2: 'Vice-Presidente',
  3: 'Governador',
  4: 'Vice-Governador',
  5: 'Senador',
  6: 'Deputado Federal',
  7: 'Deputado Estadual',
  8: 'Deputado Distrital',
}

const carregando = ref(false)
const buscaRealizada = ref(false)

// ====================================================
// VARIÁVEIS DE RASCUNHO (Filtros na interface)
// ====================================================
const inputBusca = ref('')
const inputUf = ref(ufUrl || '')
const inputCargo = ref(cargoUrl ? CARGOS[cargoUrl] || '' : '')
const inputPartido = ref('')
const inputSituacao = ref('')

// ====================================================
// VARIÁVEIS APLICADAS (Confirmadas após clicar em "Filtrar")
// ====================================================
const filtroBusca = ref('')
const filtroUf = ref(ufUrl || '')
const filtroCargo = ref(cargoUrl ? CARGOS[cargoUrl] || '' : '')
const filtroPartido = ref('')
const filtroSituacao = ref('')

const candidatos = ref([])
const atualizandoId = ref(null)
const atualizandoTodos = ref(false)
const progressoGlobal = ref({ atual: 0, total: 0 })

const modalAberto = ref(false)
const tipoModal = ref('')
const candidatoAtivo = ref({})

const dadosRaioX = ref(null)
const raioxLoading = ref(false)
const deputadosAtuais = ref([])

// LISTAS OFICIAIS
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

// ====================================================
// LISTA INTELIGENTE DE CARGOS BASEADA NO ESTADO (UF) (Sem Suplentes)
// ====================================================
const cargosDinamicos = computed(() => {
  if (inputUf.value === 'BR') {
    return ['Presidente', 'Vice-Presidente']
  } else if (inputUf.value === 'DF') {
    return ['Governador', 'Vice-Governador', 'Senador', 'Deputado Federal', 'Deputado Distrital']
  } else if (inputUf.value !== '') {
    // Qualquer outro Estado
    return ['Governador', 'Vice-Governador', 'Senador', 'Deputado Federal', 'Deputado Estadual']
  }

  // Se for "Todos os Estados", mostra tudo
  return [
    'Presidente',
    'Vice-Presidente',
    'Governador',
    'Vice-Governador',
    'Senador',
    'Deputado Federal',
    'Deputado Estadual',
    'Deputado Distrital',
  ]
})

// Corrige o inputCargo caso o usuário troque de UF mas já tenha algo selecionado
const aoMudarUf = () => {
  if (inputUf.value === 'BR') {
    if (inputCargo.value !== 'Presidente' && inputCargo.value !== 'Vice-Presidente')
      inputCargo.value = ''
  } else if (inputUf.value === 'DF') {
    if (inputCargo.value === 'Deputado Estadual') inputCargo.value = 'Deputado Distrital'
    else if (inputCargo.value === 'Presidente' || inputCargo.value === 'Vice-Presidente')
      inputCargo.value = ''
  } else if (inputUf.value !== '') {
    // Outros estados normais
    if (inputCargo.value === 'Deputado Distrital') inputCargo.value = 'Deputado Estadual'
    else if (inputCargo.value === 'Presidente' || inputCargo.value === 'Vice-Presidente')
      inputCargo.value = ''
  }
}

// ====================================================
// FUNÇÃO DE BUSCA E FILTRAGEM
// ====================================================
const aplicarFiltros = async () => {
  if (candidatos.value.length === 0) {
    carregando.value = true
    candidatos.value = await buscarCandidatos()
    carregando.value = false
  }

  filtroBusca.value = inputBusca.value
  filtroUf.value = inputUf.value
  filtroCargo.value = inputCargo.value
  filtroPartido.value = inputPartido.value
  filtroSituacao.value = inputSituacao.value

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
}

const categorizarBens = (listaDeBens, totalGeral) => {
  if (!listaDeBens || !Array.isArray(listaDeBens) || listaDeBens.length === 0 || totalGeral === 0)
    return null

  let categorias = {
    imoveis: { valor: 0, cor: 'bg-emerald-500', label: 'Imóveis' },
    investimentos: { valor: 0, cor: 'bg-blue-500', label: 'Investimentos & Dinheiro' },
    veiculos: { valor: 0, cor: 'bg-amber-500', label: 'Veículos' },
    animais: { valor: 0, cor: 'bg-orange-600', label: 'Animais & Rebanho' },
    empresas: { valor: 0, cor: 'bg-purple-500', label: 'Empresas & Outros' },
  }

  listaDeBens.forEach((bem) => {
    const desc = (bem.descricao || '').toLowerCase()
    const tipo = (bem.tipo || '').toLowerCase()
    const textoCompleto = desc + ' ' + tipo
    const valor = bem.valor || 0

    if (
      textoCompleto.includes('apartamento') ||
      textoCompleto.includes('casa') ||
      textoCompleto.includes('terreno') ||
      textoCompleto.includes('terra') ||
      textoCompleto.includes('imovel') ||
      textoCompleto.includes('imóvel') ||
      textoCompleto.includes('sala') ||
      textoCompleto.includes('fazenda') ||
      textoCompleto.includes('lote') ||
      textoCompleto.includes('gleba') ||
      textoCompleto.includes('predio') ||
      textoCompleto.includes('prédio') ||
      textoCompleto.includes('chacara') ||
      textoCompleto.includes('chácara') ||
      textoCompleto.includes('rural') ||
      textoCompleto.includes('urbano') ||
      textoCompleto.includes('sitio') ||
      textoCompleto.includes('sítio')
    ) {
      categorias.imoveis.valor += valor
    } else if (
      textoCompleto.includes('veículo') ||
      textoCompleto.includes('veiculo') ||
      textoCompleto.includes('carro') ||
      textoCompleto.includes('moto') ||
      textoCompleto.includes('caminhonete') ||
      textoCompleto.includes('caminhao') ||
      textoCompleto.includes('caminhão') ||
      textoCompleto.includes('embarcacao') ||
      textoCompleto.includes('lancha') ||
      textoCompleto.includes('aeronave') ||
      textoCompleto.includes('kombi') ||
      textoCompleto.includes('golf') ||
      textoCompleto.includes('creta') ||
      textoCompleto.includes('omega') ||
      textoCompleto.includes('up') ||
      textoCompleto.includes('honda') ||
      textoCompleto.includes('toyota') ||
      textoCompleto.includes('fiat') ||
      textoCompleto.includes('volkswagen') ||
      textoCompleto.includes('chevrolet') ||
      textoCompleto.includes('ford') ||
      textoCompleto.includes('hyundai') ||
      textoCompleto.includes('jeep') ||
      textoCompleto.includes('hilux') ||
      textoCompleto.includes('corolla') ||
      textoCompleto.includes('onix') ||
      textoCompleto.includes('strada') ||
      textoCompleto.includes('bis')
    ) {
      categorias.veiculos.valor += valor
    } else if (
      textoCompleto.includes('cavalo') ||
      textoCompleto.includes('égua') ||
      textoCompleto.includes('egua') ||
      textoCompleto.includes('potro') ||
      textoCompleto.includes('mula') ||
      textoCompleto.includes('boi') ||
      textoCompleto.includes('vaca') ||
      textoCompleto.includes('gado') ||
      textoCompleto.includes('rebanho') ||
      textoCompleto.includes('animal') ||
      textoCompleto.includes('mangalarga') ||
      textoCompleto.includes('quartilha') ||
      textoCompleto.includes('touro')
    ) {
      categorias.animais.valor += valor
    } else if (
      textoCompleto.includes('poupanca') ||
      textoCompleto.includes('poupança') ||
      textoCompleto.includes('aplicacao') ||
      textoCompleto.includes('aplicação') ||
      textoCompleto.includes('fundo') ||
      textoCompleto.includes('acoes') ||
      textoCompleto.includes('ações') ||
      textoCompleto.includes('cdb') ||
      textoCompleto.includes('dinheiro') ||
      textoCompleto.includes('especie') ||
      textoCompleto.includes('espécie') ||
      textoCompleto.includes('conta') ||
      textoCompleto.includes('deposito') ||
      textoCompleto.includes('depósito') ||
      textoCompleto.includes('renda fixa') ||
      textoCompleto.includes('tesouro') ||
      textoCompleto.includes('consorcio') ||
      textoCompleto.includes('consórcio') ||
      textoCompleto.includes('banco') ||
      textoCompleto.includes('bco') ||
      textoCompleto.includes('bradesco') ||
      textoCompleto.includes('brasil') ||
      textoCompleto.includes('itau') ||
      textoCompleto.includes('santander') ||
      textoCompleto.includes('caixa')
    ) {
      categorias.investimentos.valor += valor
    } else {
      categorias.empresas.valor += valor
    }
  })

  return Object.values(categorias)
    .filter((cat) => cat.valor > 0)
    .map((cat) => {
      const percentualReal = (cat.valor / totalGeral) * 100
      const percentualFormatado = percentualReal > 0 && percentualReal < 0.1 ? 0.1 : percentualReal

      return {
        ...cat,
        percentual: percentualReal,
        percentualTexto: percentualFormatado.toFixed(1).replace('.', ','),
      }
    })
    .sort((a, b) => b.valor - a.valor)
}

const bensClassificadosAtuais = computed(() => {
  if (tipoModal.value === 'bens' && candidatoAtivo.value) {
    return categorizarBens(candidatoAtivo.value.bens, candidatoAtivo.value.totalBens)
  }
  return null
})

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
  } catch (error) {
    alert('A requisição falhou no servidor TSE. Tente novamente mais tarde.')
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
    } catch (error) {
      console.warn(`Falha ao sincronizar ${candidato.nomeUrna}.`)
    }
    progressoGlobal.value.atual++
    await sleep(1000)
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
    `🚨 *FICHA RÁPIDA: ${candidato.nomeUrna.toUpperCase()}* 🚨\nCandidato(a) a ${candidato.cargo} por ${candidato.uf === 'BR' ? 'todo o Brasil' : candidato.uf}\n\n*Número:* ${candidato.numero}\n*Partido:* ${candidato.partido}\n${textoVice}*Idade:* ${idade}\n\n${emojiStatus} *Situação no TSE:* ${candidato.situacaoCandidatura || 'Não informado'}\n\n💰 *Patrimônio Declarado:* ${patrimonio}\n📈 *Limite de Gastos (1º Turno):* ${limite}\n\n🔎 _Fonte: Dados extraídos diretamente do portal do TSE via Explorador Eleitoral_\n🔗 *Acesse o painel completo:* https://main.d19svo3o4axtyl.amplifyapp.com`.trim()

  const textoCodificado = encodeURIComponent(texto)
  window.open(`https://wa.me/?text=${textoCodificado}`, '_blank')
}
</script>

<template>
  <main class="space-y-6 relative pb-20 transition-colors duration-300">
    <header class="flex flex-col gap-5">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white" tabindex="0">
            {{ tituloPagina }}
          </h1>
          <p class="text-slate-500 dark:text-slate-400 text-sm mt-1" aria-live="polite">
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
          class="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 focus:ring-4 focus:ring-slate-300 dark:focus:ring-slate-600 disabled:bg-slate-400 dark:disabled:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 self-start md:self-auto"
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
      </div>

      <!-- BARRA DE FILTROS COM SELEÇÃO DE ESTADO (UF) -->
      <div
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col xl:flex-row gap-3 items-stretch xl:items-center"
      >
        <input
          v-model="inputBusca"
          @keyup.enter="aplicarFiltros"
          type="search"
          placeholder="Buscar por nome..."
          class="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />

        <!-- FILTRO DE ESTADO (UF) DISPARA A FUNÇÃO PARA AJUSTAR O CARGO -->
        <select
          v-model="inputUf"
          @change="aoMudarUf"
          class="w-full xl:w-44 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <option value="">Todos os Estados</option>
          <option v-for="u in ufsOficiais" :key="u.sigla" :value="u.sigla">{{ u.nome }}</option>
        </select>

        <!-- O SELECT DE CARGO AGORA LÊ DA LISTA DINÂMICA (Sem Suplentes) -->
        <select
          v-model="inputCargo"
          class="w-full xl:w-44 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <option value="">Todos os Cargos</option>
          <option v-for="c in cargosDinamicos" :key="c" :value="c">{{ c }}</option>
        </select>

        <select
          v-model="inputPartido"
          class="w-full xl:w-36 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <option value="">Partidos (Todos)</option>
          <option v-for="p in partidosOficiais" :key="p" :value="p">{{ p }}</option>
        </select>

        <select
          v-model="inputSituacao"
          class="w-full xl:w-44 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <option value="">Qualquer Situação</option>
          <option v-for="s in situacoesOficiais" :key="s" :value="s">{{ s }}</option>
        </select>

        <div
          class="flex gap-2 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-slate-700 xl:pl-3"
        >
          <button
            @click="aplicarFiltros"
            class="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            Filtrar
          </button>
          <button
            v-if="buscaRealizada"
            @click="limparFiltros"
            class="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition-all shadow-sm"
            title="Limpar todos os filtros"
          >
            Limpar
          </button>
        </div>
      </div>
    </header>

    <!-- TELA INICIAL: MENSAGEM PEDINDO PARA PESQUISAR -->
    <div
      v-if="!buscaRealizada && !carregando"
      class="text-center py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors shadow-sm"
    >
      <div
        class="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <svg
          class="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          ></path>
        </svg>
      </div>
      <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
        Painel de Filtros Avançado
      </h2>
      <p class="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto px-4">
        Cruze informações de Estado, Cargo, Partido e Situação da Candidatura, e clique em
        <strong>"Filtrar"</strong>.
      </p>
    </div>

    <!-- TELA DE LOADING -->
    <div
      v-else-if="carregando"
      class="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors"
      aria-live="assertive"
    >
      <div
        class="w-10 h-10 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"
        aria-hidden="true"
      ></div>
      <p class="text-slate-500 dark:text-slate-400 font-medium text-sm">
        Carregando candidatos do banco de dados...
      </p>
    </div>

    <!-- GRID DE CANDIDATOS -->
    <section
      v-else-if="candidatosFiltrados.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      aria-label="Lista de Candidatos"
    >
      <article
        v-for="candidato in candidatosFiltrados"
        :key="candidato.id"
        class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md dark:hover:shadow-slate-800/50 transition-all border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between focus-within:ring-2 focus-within:ring-blue-400"
        :class="{ 'ring-4 ring-indigo-500 shadow-lg': isSelecionadoParaComparar(candidato) }"
      >
        <div class="p-6">
          <div
            class="relative mb-4 flex justify-center bg-slate-50 dark:bg-slate-800/50 py-4 rounded-xl border border-slate-100 dark:border-slate-700/50"
            :class="{ 'grayscale opacity-75': isInelegivel(candidato.situacaoCandidatura) }"
          >
            <img
              :src="candidato.fotoUrl"
              :alt="`Foto oficial de urna do candidato ${candidato.nomeUrna}`"
              class="w-32 h-40 object-cover border border-slate-300 dark:border-slate-600 shadow-sm rounded bg-slate-200 dark:bg-slate-700"
              @error="(e) => tratarErroFoto(e, candidato)"
            />
          </div>

          <div
            class="flex items-center space-x-4 mb-4"
            :class="{ 'opacity-75': isInelegivel(candidato.situacaoCandidatura) }"
          >
            <div class="w-full">
              <div class="flex items-center gap-1.5 flex-wrap mb-1.5">
                <span
                  class="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                >
                  Nº {{ candidato.numero }}
                </span>

                <span
                  class="inline-block bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
                >
                  {{ candidato.uf === 'BR' ? 'Brasil' : candidato.uf }}
                </span>

                <span
                  class="inline-block bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700"
                >
                  {{ calcularIdade(candidato.dataDeNascimento) }}
                </span>
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

              <div
                v-if="['Presidente', 'Governador'].includes(candidato.cargo)"
                class="mt-3 flex items-start gap-1.5 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 p-2 rounded-lg"
                aria-label="Vice"
              >
                <svg
                  aria-hidden="true"
                  class="w-4 h-4 text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0"
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
                  <p
                    class="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 leading-tight"
                  >
                    <span class="opacity-75 uppercase tracking-wider block mb-0.5">Vice:</span>
                    <template v-if="candidato.vices && candidato.vices.length > 0">
                      {{ candidato.vices.join(' • ') }}
                    </template>
                    <template v-else>
                      <span class="italic opacity-70 block mt-0.5 leading-snug">
                        O TSE ainda não processou a documentação.
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
              <p class="text-[10px] uppercase opacity-90">Situação Coligação</p>
            </div>
            <button
              @click="verificarStatusEmTempoReal(candidato)"
              :disabled="atualizandoId === candidato.id || atualizandoTodos"
              :aria-label="`Sincronizar dados completos de ${candidato.nomeUrna} no TSE`"
              class="w-full flex items-center justify-center gap-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 focus:ring-2 focus:ring-slate-400 text-slate-700 dark:text-slate-300 py-2 rounded-sm transition-all disabled:opacity-50 mt-1"
            >
              <svg
                v-if="atualizandoId === candidato.id"
                aria-hidden="true"
                class="animate-spin h-3.5 w-3.5 text-slate-700 dark:text-slate-400"
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
                class="h-3.5 w-3.5 text-slate-700 dark:text-slate-400"
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
            class="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800"
            :class="{ 'opacity-75': isInelegivel(candidato.situacaoCandidatura) }"
          >
            <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <span
                class="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-bold mb-0.5"
                >Limite 1º Turno</span
              >
              <span
                class="text-sm font-bold text-slate-700 dark:text-slate-300 block truncate"
                :title="formatarMoeda(candidato.limiteGastos1T)"
                >{{ formatarMoeda(candidato.limiteGastos1T) }}</span
              >
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <span
                class="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-bold mb-0.5"
                >Limite 2º Turno</span
              >
              <span
                class="text-sm font-bold text-slate-700 dark:text-slate-300 block truncate"
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
            class="mt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl flex justify-between items-center"
            :class="{ 'opacity-75': isInelegivel(candidato.situacaoCandidatura) }"
          >
            <span
              class="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-0.5"
              >Bens Declarados</span
            >
            <span class="text-sm font-bold text-slate-800 dark:text-slate-200">{{
              formatarMoeda(candidato.totalBens)
            }}</span>
          </div>
        </div>

        <div
          class="bg-slate-50 dark:bg-slate-800/30 px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2"
          :class="{ 'opacity-75': isInelegivel(candidato.situacaoCandidatura) }"
        >
          <button
            @click="abrirModal(candidato, 'bens')"
            :aria-label="`Ver bens de ${candidato.nomeUrna}`"
            class="flex-1 text-center py-2 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors shadow-sm relative z-30"
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
                ? 'bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60 border border-slate-200 dark:border-slate-700'
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
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            "
            class="flex-none text-center py-2 px-3 border text-xs font-black rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors shadow-sm relative z-30"
          >
            VS
          </button>

          <button
            @click="compartilharWhatsApp(candidato)"
            :aria-label="`Compartilhar ficha de ${candidato.nomeUrna} no WhatsApp`"
            class="flex-none flex items-center justify-center py-2 px-3 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-white rounded-xl transition-colors shadow-sm relative z-30"
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

    <!-- CASO NÃO ENCONTRE NADA -->
    <div
      v-else-if="buscaRealizada"
      class="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors shadow-sm"
      aria-live="polite"
    >
      <p class="text-slate-500 dark:text-slate-400 text-base">
        Nenhum candidato encontrado com os critérios selecionados.
      </p>
    </div>

    <!-- Barra VS -->
    <div
      v-if="candidatosComparacao.length > 0"
      role="region"
      aria-label="Controle de Comparação"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 dark:bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl z-40 flex items-center justify-between gap-6 animate-fade-in border border-slate-700 dark:border-slate-600 w-[90%] max-w-lg"
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
          class="bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors border border-slate-600 dark:border-slate-500"
        >
          Limpar
        </button>
      </div>
    </div>
  </main>

  <!-- MODAL DE BENS -->
  <div
    v-if="modalAberto"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl animate-fade-in flex flex-col border border-slate-200 dark:border-slate-800 transition-colors"
    >
      <header
        class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start sticky top-0 bg-white dark:bg-slate-900 z-10 shrink-0"
      >
        <div>
          <span
            class="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block"
          >
            {{
              tipoModal === 'bens'
                ? 'Detalhamento de Bens Declarados'
                : 'Raio-X da Câmara (Atuação Parlamentar)'
            }}
          </span>
          <h3
            id="modal-title"
            class="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5"
            tabindex="-1"
          >
            {{ candidatoAtivo.nomeUrna || candidatoAtivo.nome }}
          </h3>
        </div>
        <button
          @click="modalAberto = false"
          aria-label="Fechar janela"
          class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded text-2xl font-bold px-2"
        >
          &times;
        </button>
      </header>

      <div class="p-6 space-y-4 overflow-y-auto custom-scrollbar">
        <div v-if="tipoModal === 'bens'">
          <div
            class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-4 border border-slate-200 dark:border-slate-800 flex flex-col gap-3"
          >
            <div class="flex justify-between items-center w-full">
              <span
                class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold"
                >Total Declarado</span
              >
              <span class="text-lg text-slate-900 dark:text-white font-black">{{
                formatarMoeda(candidatoAtivo.totalBens)
              }}</span>
            </div>

            <div
              v-if="bensClassificadosAtuais && bensClassificadosAtuais.length > 0"
              class="w-full"
            >
              <div
                class="w-full h-3 rounded-full flex overflow-hidden mb-2 shadow-inner border border-slate-200/50 dark:border-slate-700"
              >
                <div
                  v-for="cat in bensClassificadosAtuais"
                  :key="cat.label"
                  :class="cat.cor"
                  :style="{ width: `${cat.percentual}%` }"
                  class="h-full"
                ></div>
              </div>

              <div class="flex flex-wrap gap-x-4 gap-y-1">
                <div
                  v-for="cat in bensClassificadosAtuais"
                  :key="'leg-' + cat.label"
                  class="flex items-center gap-1.5"
                >
                  <span class="w-2.5 h-2.5 rounded-full inline-block" :class="cat.cor"></span>
                  <span class="text-[10px] font-bold text-slate-600 dark:text-slate-400"
                    >{{ cat.label }} ({{ cat.percentualTexto }}%)</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div v-if="candidatoAtivo.bens && candidatoAtivo.bens.length > 0">
            <div
              v-for="(bem, i) in candidatoAtivo.bens"
              :key="i"
              class="border-b border-slate-100 dark:border-slate-800 pb-3 mb-3 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded transition-colors"
            >
              <p class="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">
                {{ bem.tipo }}
              </p>
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-300 mt-0.5">
                {{ bem.descricao }}
              </p>
              <p class="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {{ formatarMoeda(bem.valor) }}
              </p>
            </div>
          </div>
          <div v-else class="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
            Nenhum detalhe de bem cadastrado para este candidato.
          </div>
        </div>

        <div v-if="tipoModal === 'raiox'" aria-live="polite">
          <div v-if="raioxLoading" class="text-center py-10">
            <div
              class="w-8 h-8 border-4 border-slate-800 dark:border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              aria-hidden="true"
            ></div>
            <p class="text-sm font-bold text-slate-700 dark:text-slate-300">
              Conectando ao Portal de Dados Abertos da Câmara...
            </p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Buscando despesas (CEAP) e projetos de lei recentes.
            </p>
          </div>
          <div
            v-else-if="!dadosRaioX"
            class="text-center py-10 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl"
          >
            <p class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              Candidato não encontrado na Câmara.
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400 px-4">
              Esta funcionalidade verifica apenas políticos que estão exercendo mandato de
              <strong>Deputado Federal</strong> atualmente em Brasília.
            </p>
          </div>
          <div v-else class="space-y-6">
            <div
              class="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <img
                :src="dadosRaioX.foto"
                alt="Foto do deputado na câmara"
                class="w-16 h-20 object-cover rounded-lg shadow-sm border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700"
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
            <div
              class="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/50 rounded-xl p-4"
            >
              <p
                class="text-xs uppercase tracking-wider text-rose-800 dark:text-rose-400 font-bold mb-1 flex items-center gap-2"
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
              <p class="text-2xl font-black text-rose-900 dark:text-rose-300">
                {{ formatarMoeda(dadosRaioX.gasto2026) }}
              </p>
              <p class="text-[10px] text-rose-700 dark:text-rose-500 mt-1">
                Soma das últimas 100 notas fiscais lançadas na Cota para Exercício da Atividade
                Parlamentar (CEAP).
              </p>
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
                  class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors"
                >
                  <p
                    class="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase"
                  >
                    {{ projeto.siglaTipo }} {{ projeto.numero }}/{{ projeto.ano }}
                  </p>
                  <p
                    class="text-xs text-slate-700 dark:text-slate-300 font-medium leading-snug line-clamp-3"
                    :title="projeto.ementa"
                  >
                    {{ projeto.ementa }}
                  </p>
                </article>
              </div>
              <p v-else class="text-xs text-slate-400 dark:text-slate-500">
                Nenhum projeto de lei recente encontrado.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL DE COMPARAÇÃO VS -->
  <div
    v-if="modalComparacaoAberto"
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="versus-title"
  >
    <div
      class="bg-slate-50 dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in flex flex-col relative border border-slate-200 dark:border-slate-800"
    >
      <header
        class="p-5 bg-slate-900 dark:bg-black text-white flex justify-between items-center sticky top-0 z-10 border-b border-slate-700 dark:border-slate-800"
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
                @error="
                  (e) => {
                    e.target.onerror = null
                    e.target.src =
                      'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
                  }
                "
              />
              <span
                class="bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider absolute top-4 left-4"
                aria-label="Número de urna"
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

                <div
                  v-if="['Presidente', 'Governador'].includes(cand.cargo)"
                  class="mt-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold px-2 py-1 rounded mx-auto inline-flex items-center gap-1 max-w-[90%] text-center border border-indigo-100 dark:border-indigo-800/50"
                >
                  <template v-if="cand.vices && cand.vices.length > 0">
                    Vice: {{ cand.vices.join(' e ') }}
                  </template>
                  <template v-else>
                    Vice: <span class="italic opacity-70">Aguardando doc. oficial do TSE</span>
                  </template>
                </div>

                <p class="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  {{ calcularIdade(cand.dataDeNascimento) }}
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
                class="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-center h-full flex flex-col justify-center"
              >
                <p
                  class="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1"
                >
                  Item Mais Caro Declarado
                </p>
                <p
                  class="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug line-clamp-2 mb-1"
                  :title="obterMaiorBem(cand.bens).descricao"
                >
                  {{ obterMaiorBem(cand.bens).descricao }}
                </p>
                <p class="text-sm font-black text-slate-900 dark:text-white">
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
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}
.dark .custom-scrollbar::-webkit-scrollbar-track {
  background: #1e293b;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>
