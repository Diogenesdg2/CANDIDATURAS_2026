import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  increment,
} from 'firebase/firestore'
import { db } from './config'

const candidatosCollection = collection(db, 'candidatos')

const ID_ELEICAO = '20322002026'
const ANO = 2026
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// =========================================================================
// 🛡️ FETCH INTELIGENTE (Detecta Localhost vs AWS)
// =========================================================================
const fetchResiliente = async (caminhoTse) => {
  const urlBaseOficial = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1'

  // 1. SE ESTIVER NO LOCALHOST (Vite)
  if (import.meta.env.DEV) {
    // Usa o proxy local perfeito que você já tinha configurado no vite.config.js
    const urlLocal = `/api-tse/divulga/rest/v1${caminhoTse}`
    const resposta = await fetch(urlLocal)
    if (resposta.ok) return await resposta.json()
    throw new Error('Falha no proxy local do Vite.')
  }

  // 2. SE ESTIVER NA AWS (Produção)
  // Tenta as rotas que driblam o Firewall do Governo
  const tentativasNaNuvem = [
    `/api-tse/divulga/rest/v1${caminhoTse}`, // Tenta primeiro a regra de Rewrite da própria AWS
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(urlBaseOficial + caminhoTse)}`, // Proxy fallback 1
    `https://corsproxy.io/?${encodeURIComponent(urlBaseOficial + caminhoTse)}`, // Proxy fallback 2
  ]

  for (const url of tentativasNaNuvem) {
    try {
      const resposta = await fetch(url)
      if (resposta.ok) {
        return await resposta.json()
      }
    } catch (e) {
      console.warn(`AWS: Rota bloqueada (${url}). Pulando para o proxy reserva...`)
    }
  }

  throw new Error('A AWS não conseguiu passar pelo Firewall do TSE neste momento.')
}

// ====================================================

export const buscarCandidatos = async (ufFiltro = null, cargoFiltro = null) => {
  try {
    let q = candidatosCollection
    if (ufFiltro && cargoFiltro) {
      q = query(
        candidatosCollection,
        where('uf', '==', ufFiltro),
        where('codigoCargo', '==', Number(cargoFiltro)),
      )
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Erro ao buscar candidatos:', error)
    return []
  }
}

export const verificarDadosExistem = async (uf, codigoCargo) => {
  try {
    const q = query(
      candidatosCollection,
      where('uf', '==', uf),
      where('codigoCargo', '==', Number(codigoCargo)),
    )
    const snapshot = await getDocs(q)
    return !snapshot.empty
  } catch (error) {
    console.error('Erro ao verificar existência:', error)
    return false
  }
}

const cacarVicesTSE = (detalhes) => {
  let nomesEncontrados = []
  const extrair = (obj) => {
    if (!obj) return
    const nome =
      obj.nmUrna ||
      obj.nomeUrna ||
      obj.nmCandidato ||
      obj.nomeCandidato ||
      obj.nome ||
      obj.nmUrnaCandidato
    if (nome) nomesEncontrados.push(nome)
  }
  if (Array.isArray(detalhes.vices)) detalhes.vices.forEach(extrair)
  if (Array.isArray(detalhes.suplentes)) detalhes.suplentes.forEach(extrair)
  if (Array.isArray(detalhes.substitutos)) detalhes.substitutos.forEach(extrair)
  if (detalhes.viceCandidato) extrair(detalhes.viceCandidato)
  if (detalhes.vice) {
    if (Array.isArray(detalhes.vice)) detalhes.vice.forEach(extrair)
    else extrair(detalhes.vice)
  }
  return [...new Set(nomesEncontrados)]
}

export const sincronizarDadosAutomaticamente = async (uf, codigoCargo, onProgresso) => {
  try {
    const q = query(
      candidatosCollection,
      where('uf', '==', uf),
      where('codigoCargo', '==', Number(codigoCargo)),
    )
    const snapshot = await getDocs(q)
    if (!snapshot.empty) return

    const nomeCargo = CARGOS[codigoCargo]

    // Usa a nova função blindada
    const dadosLista = await fetchResiliente(
      `/candidatura/listar/${ANO}/${uf}/${ID_ELEICAO}/${codigoCargo}/candidatos`,
    )
    const listaCandidatos = dadosLista.candidatos || []
    const totalCandidatos = listaCandidatos.length

    if (totalCandidatos === 0) {
      alert(
        `Atenção: O TSE informou que existem 0 candidatos registrados para ${nomeCargo} em ${uf} neste momento.`,
      )
      return
    }

    let atual = 0
    for (const cand of listaCandidatos) {
      atual++
      if (onProgresso) onProgresso(atual, totalCandidatos, cand.nomeUrna || 'Candidato')

      let totalBensDeclarados = 0
      let listaBens = []
      let historicoEleicoes = []
      let limiteGastos1T = 0
      let limiteGastos2T = 0
      let situacaoCand = 'Não informado'
      let situacaoPartido = 'Não informado'
      let dataNascimento = null
      let genero = 'Não informado'
      let corRaca = 'Não informado'
      let grauInstrucao = 'Não informado'
      let listaVices = []

      // Foto é servida diretamente
      let fotoOficialUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${ID_ELEICAO}/${cand.id}/${uf}`

      try {
        const detalhes = await fetchResiliente(
          `/candidatura/buscar/${ANO}/${uf}/${ID_ELEICAO}/candidato/${cand.id}`,
        )
        totalBensDeclarados = detalhes.totalDeBens || 0
        limiteGastos1T = detalhes.gastoCampanha1T || 0
        limiteGastos2T = detalhes.gastoCampanha2T || 0
        listaBens = detalhes.bens || []
        situacaoCand = detalhes.descricaoSituacao || 'Não informado'
        situacaoPartido = detalhes.candidato?.situacaoCandidato || 'Não informado'
        dataNascimento = detalhes.dataDeNascimento || detalhes.dataNascimento || null
        genero = detalhes.descricaoSexo || 'Não informado'
        corRaca = detalhes.descricaoCorRaca || 'Não informado'
        grauInstrucao = detalhes.descricaoGrauInstrucao || 'Não informado'
        listaVices = cacarVicesTSE(detalhes)

        const idEleicaoReal = detalhes.eleicao?.id || ID_ELEICAO
        fotoOficialUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${idEleicaoReal}/${cand.id}/${uf}`
      } catch (e) {
        console.warn(`Aviso: Detalhes indisponíveis`)
      }

      try {
        historicoEleicoes = await fetchResiliente(`/candidato/${cand.id}/eleicoes-anteriores`)
      } catch (e) {
        historicoEleicoes = [
          {
            ano: ANO,
            cargo: nomeCargo,
            uf: uf,
            partido: cand.siglaPartido || 'PR',
            numero: cand.numero,
          },
        ]
      }

      const nomePartido =
        cand.partido && cand.partido.sigla ? cand.partido.sigla : cand.siglaPartido || 'Sem Partido'

      await addDoc(candidatosCollection, {
        idTse: cand.id,
        nomeUrna: cand.nomeUrna || 'Não informado',
        nomeCompleto: cand.nomeCompleto || 'Não informado',
        numero: cand.numero || 0,
        partido: nomePartido,
        cargo: nomeCargo,
        codigoCargo: Number(codigoCargo),
        uf: uf,
        totalBens: totalBensDeclarados,
        bens: listaBens,
        eleicoesAnteriores: historicoEleicoes,
        limiteGastos1T: limiteGastos1T,
        limiteGastos2T: limiteGastos2T,
        situacaoCandidatura: situacaoCand,
        situacaoPartido: situacaoPartido,
        dataDeNascimento: dataNascimento,
        genero: genero,
        corRaca: corRaca,
        grauInstrucao: grauInstrucao,
        vices: listaVices,
        fotoUrl: fotoOficialUrl,
        ano: ANO,
      })

      // Mantém a pausa de segurança!
      await sleep(800)
    }
  } catch (erro) {
    console.error('❌ Erro ao baixar dados:', erro)
    throw erro
  }
}

export const atualizarStatusCandidato = async (candidatoFirebaseId, idTse, uf) => {
  try {
    const detalhes = await fetchResiliente(
      `/candidatura/buscar/${ANO}/${uf}/${ID_ELEICAO}/candidato/${idTse}`,
    )

    const idEleicaoReal = detalhes.eleicao?.id || ID_ELEICAO
    const novaFotoUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${idEleicaoReal}/${idTse}/${uf}`

    const dadosAtualizados = {
      situacaoCandidatura: detalhes.descricaoSituacao || 'Não informado',
      situacaoPartido: detalhes.candidato?.situacaoCandidato || 'Não informado',
      totalBens: detalhes.totalDeBens || 0,
      bens: detalhes.bens || [],
      limiteGastos1T: detalhes.gastoCampanha1T || 0,
      limiteGastos2T: detalhes.gastoCampanha2T || 0,
      dataDeNascimento: detalhes.dataDeNascimento || detalhes.dataNascimento || null,
      genero: detalhes.descricaoSexo || 'Não informado',
      corRaca: detalhes.descricaoCorRaca || 'Não informado',
      grauInstrucao: detalhes.descricaoGrauInstrucao || 'Não informado',
      vices: cacarVicesTSE(detalhes),
      fotoUrl: novaFotoUrl,
    }

    const docRef = doc(db, 'candidatos', candidatoFirebaseId)
    await updateDoc(docRef, dadosAtualizados)

    return dadosAtualizados
  } catch (error) {
    console.error('Erro ao atualizar dados:', error)
    throw error
  }
}

export const buscarRaioXCamara = async (nomeBusca, uf) => {
  try {
    const nomeEncode = encodeURIComponent(nomeBusca)
    const res = await fetch(
      `https://dadosabertos.camara.leg.br/api/v2/deputados?nome=${nomeEncode}&siglaUf=${uf}`,
    )
    const data = await res.json()
    if (!data.dados || data.dados.length === 0) return null

    const deputado = data.dados[0]
    const id = deputado.id

    const resDespesas = await fetch(
      `https://dadosabertos.camara.leg.br/api/v2/deputados/${id}/despesas?ordem=DESC&ordenarPor=ano&itens=100`,
    )
    const dataDespesas = await resDespesas.json()
    const totalGasto = dataDespesas.dados.reduce((acc, despesa) => acc + despesa.valorDocumento, 0)

    const resProjetos = await fetch(
      `https://dadosabertos.camara.leg.br/api/v2/proposicoes?idDeputadoAutor=${id}&ordem=DESC&ordenarPor=id&itens=5`,
    )
    const dataProjetos = await resProjetos.json()

    return {
      encontrado: true,
      nome: deputado.nome,
      foto: deputado.urlFoto,
      partido: deputado.siglaPartido,
      gasto2026: totalGasto,
      projetosRecentes: dataProjetos.dados,
    }
  } catch (e) {
    console.error('Erro ao buscar dados na Câmara:', e)
    return null
  }
}

// ====================================================
// MÓDULO DE VOTAÇÃO (ENQUETE)
// ====================================================

export const registrarVoto = async (candidatoId, nomeUrna, partido, fotoUrl) => {
  try {
    const votoRef = doc(db, 'enquete_presidente', candidatoId)
    const votoSnap = await getDoc(votoRef)

    if (votoSnap.exists()) {
      await updateDoc(votoRef, { totalVotos: increment(1) })
    } else {
      await setDoc(votoRef, { nomeUrna, partido, fotoUrl, totalVotos: 1 })
    }
    return true
  } catch (error) {
    console.error('Erro ao registrar voto:', error)
    return false
  }
}

export const buscarResultadosEnquete = async () => {
  try {
    const q = query(collection(db, 'enquete_presidente'))
    const snapshot = await getDocs(q)
    let resultados = []
    let totalGeral = 0

    snapshot.forEach((doc) => {
      const data = doc.data()
      resultados.push({ id: doc.id, ...data })
      totalGeral += data.totalVotos || 0
    })

    return { resultados: resultados.sort((a, b) => b.totalVotos - a.totalVotos), totalGeral }
  } catch (error) {
    console.error('Erro ao buscar resultados:', error)
    return { resultados: [], totalGeral: 0 }
  }
}
