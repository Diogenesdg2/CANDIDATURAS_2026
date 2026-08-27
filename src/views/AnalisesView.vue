<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { buscarCandidatos } from '../firebase/candidatosService'

const carregando = ref(true)

const ufSelecionada = ref('BR')
const cargoSelecionado = ref(1)

const candidatos = ref([])

const modalAberto = ref(false)
const tipoModal = ref('bens')
const candidatoAtivo = ref({})
const partidoAtivo = ref('')

// Novo estado para o modal de demografia
const filtroDemografico = ref({ tipo: '', valor: '' })

const abrirModal = (candidato, tipo = 'bens') => {
  candidatoAtivo.value = candidato
  tipoModal.value = tipo
  modalAberto.value = true
}

const abrirModalPartido = (partido) => {
  partidoAtivo.value = partido
  tipoModal.value = 'partido'
  modalAberto.value = true
}

// Nova função para abrir o modal de demografia
const abrirModalDemografia = (tipoRef, valor) => {
  filtroDemografico.value = { tipo: tipoRef, valor: valor }
  tipoModal.value = 'demografia'
  modalAberto.value = true
}

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

const aoMudarUf = () => {
  if (ufSelecionada.value === 'BR') {
    cargoSelecionado.value = 1
  } else {
    cargoSelecionado.value = 3
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

    // 1. REGRAS DE IMÓVEIS
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
    }
    // 2. REGRAS DE VEÍCULOS
    else if (
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
      textoCompleto.includes('UP') ||
      textoCompleto.includes('up') ||
      textoCompleto.includes('creta') ||
      textoCompleto.includes('omega') ||
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
    }
    // 3. REGRAS DE ANIMAIS & REBANHO
    else if (
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
    }
    // 4. REGRAS DE INVESTIMENTOS & DINHEIRO
    else if (
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
    }
    // 5. TUDO O RESTO
    else {
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

const kpis = computed(() => {
  const total = candidatos.value.length
  if (total === 0) return { total: 0, patrimonioSomado: 0, mediaBens: 0 }
  const soma = candidatos.value.reduce((acc, c) => acc + (c.totalBens || 0), 0)
  return { total, patrimonioSomado: soma, mediaBens: soma / total }
})

const rankingRicos = computed(() => {
  const lista = [...candidatos.value].sort((a, b) => (b.totalBens || 0) - (a.totalBens || 0))
  const top10 = lista.slice(0, 10)
  const maiorPatrimonio = top10.length > 0 ? top10[0].totalBens : 1
  return { top10, maiorPatrimonio }
})

const contagemPartidos = computed(() => {
  const mapPartidos = {}
  candidatos.value.forEach((c) => {
    const p = c.partido || 'Sem Partido'
    mapPartidos[p] = (mapPartidos[p] || 0) + 1
  })
  const lista = Object.keys(mapPartidos)
    .map((key) => ({
      partido: key,
      total: mapPartidos[key],
    }))
    .sort((a, b) => b.total - a.total)
  const maiorTotal = lista.length > 0 ? lista[0].total : 1
  return { lista, maiorTotal }
})

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
  const maiorTotal = lista.length > 0 ? lista[0].total : 1
  return { lista, maiorTotal }
})

const extremosIdade = computed(() => {
  const validos = candidatos.value.filter((c) => c.dataDeNascimento)
  if (validos.length === 0) return { possuiDados: false }

  const parseDate = (dateStr) => {
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/')
      return new Date(y, m - 1, d).getTime()
    } else if (dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('-')
      return new Date(y, m - 1, d).getTime()
    }
    return 0
  }

  const ordenados = [...validos].sort(
    (a, b) => parseDate(a.dataDeNascimento) - parseDate(b.dataDeNascimento),
  )
  const maisVelho = ordenados[0]
  const maisNovo = ordenados[ordenados.length - 1]

  const calculaIdade = (dataStr) => {
    let anoNasc = 0
    if (dataStr.includes('/')) anoNasc = parseInt(dataStr.split('/')[2])
    else if (dataStr.includes('-')) anoNasc = parseInt(dataStr.split('-')[0])
    return 2026 - anoNasc
  }

  return {
    possuiDados: true,
    maisVelho: { ...maisVelho, idade: calculaIdade(maisVelho.dataDeNascimento) },
    maisNovo: { ...maisNovo, idade: calculaIdade(maisNovo.dataDeNascimento) },
  }
})

const demografia = computed(() => {
  const validos = candidatos.value.filter((c) => c.genero && c.genero !== 'Não informado')
  if (validos.length === 0) return { possuiDados: false }

  const agrupar = (propriedade) => {
    const map = {}
    validos.forEach((c) => {
      const key = c[propriedade] || 'Não informado'
      map[key] = (map[key] || 0) + 1
    })
    const total = validos.length
    return Object.keys(map)
      .map((k) => ({
        label: k,
        count: map[k],
        percentual: (map[k] / total) * 100,
      }))
      .sort((a, b) => b.count - a.count)
  }

  return {
    possuiDados: true,
    genero: agrupar('genero'),
    raca: agrupar('corRaca'),
  }
})

const candidatosDoPartidoSelecionado = computed(() => {
  if (tipoModal.value !== 'partido' || !partidoAtivo.value) return []
  return candidatos.value
    .filter((c) => c.partido === partidoAtivo.value)
    .sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna))
})

const candidatosDemografiaSelecionada = computed(() => {
  if (tipoModal.value !== 'demografia' || !filtroDemografico.value.tipo) return []
  const { tipo, valor } = filtroDemografico.value
  return candidatos.value
    .filter((c) => c[tipo] === valor)
    .sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna))
})
</script>

<template>
  <div class="space-y-8 pb-12 transition-colors duration-300">
    <!-- CABEÇALHO E FILTROS -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Análise de Dados
        </h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Comparativos baseados nos candidatos importados para o seu painel.
        </p>
      </div>

      <div
        class="flex gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors"
      >
        <select
          v-model="ufSelecionada"
          @change="aoMudarUf"
          class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="est in estados" :key="est.sigla" :value="est.sigla">
            {{ est.sigla }} - {{ est.nome }}
          </option>
        </select>

        <select
          v-model="cargoSelecionado"
          @change="aoMudarCargo"
          class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="carg in cargos" :key="carg.id" :value="carg.id">{{ carg.nome }}</option>
        </select>
      </div>
    </div>

    <!-- ESTADOS DE LOADING E VAZIO -->
    <div
      v-if="carregando"
      class="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"
    >
      <div
        class="w-10 h-10 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"
      ></div>
      <p class="text-slate-500 dark:text-slate-400 font-medium text-sm">
        Calculando estatísticas...
      </p>
    </div>
    <div
      v-else-if="candidatos.length === 0"
      class="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
    >
      <p class="text-slate-500 dark:text-slate-400 text-base font-bold mb-2">
        Nenhum dado importado para esta seleção.
      </p>
      <p class="text-sm text-slate-400 dark:text-slate-500">
        Vá até a página Inicial e importe os candidatos do TSE para gerar análises.
      </p>
    </div>

    <!-- DASHBOARD PRINCIPAL -->
    <div v-else class="space-y-6">
      <!-- 1. KPIS GRID -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors"
        >
          <p
            class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1"
          >
            Candidatos Analisados
          </p>
          <p class="text-3xl font-black text-slate-900 dark:text-white">{{ kpis.total }}</p>
        </div>
        <div
          class="bg-emerald-50/30 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm transition-colors"
        >
          <p
            class="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-1"
          >
            Patrimônio Declarado (Total)
          </p>
          <p class="text-2xl font-black text-emerald-900 dark:text-emerald-300">
            {{ formatarMoeda(kpis.patrimonioSomado) }}
          </p>
        </div>
        <div
          class="bg-blue-50/30 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm transition-colors"
        >
          <p
            class="text-xs font-bold text-blue-600 dark:text-blue-500 uppercase tracking-wider mb-1"
          >
            Média de Bens por Candidato
          </p>
          <p class="text-2xl font-black text-blue-900 dark:text-blue-300">
            {{ formatarMoeda(kpis.mediaBens) }}
          </p>
        </div>
      </div>

      <!-- BLOCO: RAIO-X DEMOGRÁFICO -->
      <div
        class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors"
      >
        <h2
          class="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3"
        >
          <span class="w-2 h-6 bg-purple-600 dark:bg-purple-500 rounded-full inline-block"></span>
          Raio-X Demográfico
        </h2>

        <div
          v-if="!demografia.possuiDados"
          class="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
        >
          <p class="text-sm text-amber-800 dark:text-amber-400 font-bold flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              ></path>
            </svg>
            Faltam dados demográficos!
          </p>
          <p class="text-xs text-amber-700 dark:text-amber-500 mt-1 leading-relaxed">
            Seu banco de dados foi importado antes da atualização do robô.
            <strong>Exclua os documentos na coleção 'candidatos' no Firebase</strong> e importe
            novamente para ativar os gráficos abaixo.
          </p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Gênero -->
          <div>
            <h3
              class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4"
            >
              Gênero
            </h3>
            <div class="space-y-4">
              <div v-for="gen in demografia.genero" :key="gen.label" class="group">
                <div class="flex justify-between text-xs mb-1 items-center">
                  <button
                    @click="abrirModalDemografia('genero', gen.label)"
                    class="font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none flex items-center gap-1 transition-colors"
                  >
                    {{ gen.label }}
                    <svg
                      class="w-3 h-3 opacity-0 group-hover:opacity-100"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      ></path>
                    </svg>
                  </button>
                  <span class="font-bold text-slate-900 dark:text-slate-200"
                    >{{ Math.round(gen.percentual) }}% ({{ gen.count }})</span
                  >
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div
                    class="h-2 rounded-full"
                    :class="
                      gen.label === 'FEMININO'
                        ? 'bg-pink-500 dark:bg-pink-600'
                        : 'bg-blue-500 dark:bg-blue-600'
                    "
                    :style="{ width: `${gen.percentual}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cor/Raça -->
          <div>
            <h3
              class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4"
            >
              Cor/Raça Declarada
            </h3>
            <div class="space-y-3">
              <div v-for="raca in demografia.raca" :key="raca.label" class="group">
                <div class="flex justify-between text-xs mb-1 items-center">
                  <button
                    @click="abrirModalDemografia('corRaca', raca.label)"
                    class="font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none flex items-center gap-1 transition-colors"
                  >
                    {{ raca.label }}
                    <svg
                      class="w-3 h-3 opacity-0 group-hover:opacity-100"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      ></path>
                    </svg>
                  </button>
                  <span class="font-bold text-slate-900 dark:text-slate-200"
                    >{{ Math.round(raca.percentual) }}% ({{ raca.count }})</span
                  >
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div
                    class="bg-indigo-500 dark:bg-indigo-600 h-1.5 rounded-full"
                    :style="{ width: `${raca.percentual}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- RANKING DE RICOS -->
        <div
          class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col transition-colors"
        >
          <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <span class="w-2 h-6 bg-blue-600 dark:bg-blue-500 rounded-full inline-block"></span> Top
            10 Maiores Patrimônios
          </h2>

          <div class="space-y-4 flex-grow">
            <div v-for="(cand, index) in rankingRicos.top10" :key="cand.id" class="relative group">
              <div class="flex justify-between text-sm mb-1">
                <button
                  @click="abrirModal(cand, 'bens')"
                  class="font-bold text-slate-800 dark:text-slate-200 text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none flex items-center gap-2"
                  title="Clique para ver os bens detalhados"
                >
                  {{ index + 1 }}. {{ cand.nomeUrna }}
                  <span
                    class="text-slate-400 dark:text-slate-500 font-normal group-hover:text-blue-400 dark:group-hover:text-blue-300 transition-colors"
                    >({{ cand.partido }})</span
                  >
                </button>
                <span class="font-bold text-slate-900 dark:text-white">{{
                  formatarMoeda(cand.totalBens)
                }}</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  class="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all"
                  :style="{ width: `${(cand.totalBens / rankingRicos.maiorPatrimonio) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- COLUNA DA DIREITA -->
        <div class="space-y-6">
          <!-- EXTREMOS DE IDADE -->
          <div
            class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors"
          >
            <h2
              class="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800 pb-2"
            >
              Perfil de Idade
            </h2>
            <div
              v-if="!extremosIdade.possuiDados"
              class="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
            >
              <p class="text-sm text-amber-800 dark:text-amber-400 font-bold">
                Faltam dados de idade! Reimporte os candidatos.
              </p>
            </div>
            <div v-else class="space-y-4 mt-4">
              <div
                class="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <div
                  class="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 p-2 rounded-lg"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Candidato Mais Velho
                  </p>
                  <p class="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {{ extremosIdade.maisVelho.nomeUrna }} ({{ extremosIdade.maisVelho.partido }})
                  </p>
                  <p class="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {{ extremosIdade.maisVelho.idade }} anos
                  </p>
                </div>
              </div>

              <div
                class="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800"
                v-if="extremosIdade.maisVelho.id !== extremosIdade.maisNovo.id"
              >
                <div
                  class="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 p-2 rounded-lg"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Candidato Mais Novo
                  </p>
                  <p class="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {{ extremosIdade.maisNovo.nomeUrna }} ({{ extremosIdade.maisNovo.partido }})
                  </p>
                  <p class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {{ extremosIdade.maisNovo.idade }} anos
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- CONTAGEM DE CANDIDATOS POR PARTIDO -->
          <div
            class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col max-h-[350px] transition-colors"
          >
            <h2
              class="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800 pb-2 shrink-0"
            >
              Candidatos por Partido
            </h2>

            <div class="space-y-3 mt-2 overflow-y-auto pr-2 custom-scrollbar">
              <div
                v-for="partido in contagemPartidos.lista"
                :key="'count-' + partido.partido"
                class="group"
              >
                <div class="flex justify-between text-xs mb-1 items-center">
                  <button
                    @click="abrirModalPartido(partido.partido)"
                    class="font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none flex items-center gap-1 transition-colors"
                  >
                    {{ partido.partido }}
                  </button>
                  <span class="font-bold text-slate-900 dark:text-slate-200"
                    >{{ partido.total }} candidato(s)</span
                  >
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div
                    class="bg-blue-500 dark:bg-blue-600 h-1.5 rounded-full"
                    :style="{ width: `${(partido.total / contagemPartidos.maiorTotal) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- PATRIMÔNIO POR PARTIDO -->
          <div
            class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col max-h-[350px] transition-colors"
          >
            <h2
              class="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800 pb-2 shrink-0"
            >
              Patrimônio por Partido
            </h2>

            <div class="space-y-3 mt-2 overflow-y-auto pr-2 custom-scrollbar">
              <div v-for="partido in rankingPartidos.lista" :key="'patr-' + partido.partido">
                <div class="flex justify-between text-xs mb-1">
                  <span class="font-bold text-slate-700 dark:text-slate-300">{{
                    partido.partido
                  }}</span>
                  <span class="font-bold text-slate-900 dark:text-slate-200">{{
                    formatarMoeda(partido.total)
                  }}</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div
                    class="bg-slate-800 dark:bg-slate-500 h-1.5 rounded-full"
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

  <!-- MODAL FLUTUANTE DE DETALHES -->
  <div
    v-if="modalAberto"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
  >
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl animate-fade-in flex flex-col border border-slate-200 dark:border-slate-800"
    >
      <div
        class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start sticky top-0 bg-white dark:bg-slate-900 z-10 shrink-0"
      >
        <div>
          <!-- Título Dinâmico do Modal -->
          <span
            class="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block"
          >
            {{
              tipoModal === 'bens'
                ? 'Detalhamento de Bens Declarados'
                : tipoModal === 'partido'
                  ? 'Candidatos do Partido'
                  : 'Filtro Demográfico'
            }}
          </span>
          <h3 class="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            {{
              tipoModal === 'bens'
                ? candidatoAtivo.nomeUrna || candidatoAtivo.nome
                : tipoModal === 'partido'
                  ? partidoAtivo
                  : `${filtroDemografico.valor}`
            }}
          </h3>
        </div>
        <button
          @click="modalAberto = false"
          class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-2xl font-bold px-2"
        >
          &times;
        </button>
      </div>

      <div class="p-6 space-y-4 overflow-y-auto custom-scrollbar">
        <!-- Conteúdo dos Bens -->
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

        <!-- Conteúdo da Lista de Candidatos do Partido -->
        <div v-if="tipoModal === 'partido'">
          <div
            class="flex items-center justify-between px-3 pb-2 mb-3 border-b border-slate-200 dark:border-slate-800"
          >
            <div class="flex items-center">
              <span
                class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase inline-block w-[60px] text-center mr-2"
                >Número</span
              >
              <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase"
                >Nome na Urna</span
              >
            </div>
            <div
              class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase text-right pl-2"
            >
              Bens Declarados
            </div>
          </div>
          <div class="space-y-3">
            <div
              v-for="candidato in candidatosDoPartidoSelecionado"
              :key="candidato.id"
              class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div class="flex items-center">
                <span
                  class="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded mr-2 inline-block w-[60px] text-center"
                >
                  Nº {{ candidato.numero }}
                </span>
                <span class="text-sm font-bold text-slate-800 dark:text-slate-200">{{
                  candidato.nomeUrna
                }}</span>
              </div>
              <div
                class="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
              >
                {{ formatarMoeda(candidato.totalBens) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Conteúdo da Lista Demográfica -->
        <div v-if="tipoModal === 'demografia'">
          <div
            class="flex items-center justify-between px-3 pb-2 mb-3 border-b border-slate-200 dark:border-slate-800"
          >
            <div class="flex items-center">
              <span
                class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase inline-block w-[60px] text-center mr-2"
                >Número</span
              >
              <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase"
                >Candidato / Partido</span
              >
            </div>
            <div
              class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase text-right pl-2"
            >
              Bens Declarados
            </div>
          </div>
          <div class="space-y-3">
            <div
              v-for="candidato in candidatosDemografiaSelecionada"
              :key="candidato.id"
              class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div class="flex items-center">
                <span
                  class="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded mr-2 inline-block w-[60px] text-center"
                >
                  Nº {{ candidato.numero }}
                </span>
                <div class="flex flex-col">
                  <span
                    class="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight"
                    >{{ candidato.nomeUrna }}</span
                  >
                  <span class="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{{
                    candidato.partido
                  }}</span>
                </div>
              </div>
              <div
                class="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
              >
                {{ formatarMoeda(candidato.totalBens) }}
              </div>
            </div>
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
