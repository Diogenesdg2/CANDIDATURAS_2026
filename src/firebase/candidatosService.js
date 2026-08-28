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

// =========================================================================
// 🌟 TENTATIVA 2: allOrigins (Proxy que burla firewalls governamentais)
// =========================================================================
const montarUrlTse = (caminho) => {
  const baseUrl = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1'
  // allOrigins precisa buscar o link cru (raw)
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl + caminho)}`
}

// Função auxiliar para evitar bloqueio por excesso de velocidade
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

    // Usando o Proxy Neutro
    const urlLista = montarUrlTse(
      `/candidatura/listar/${ANO}/${uf}/${ID_ELEICAO}/${codigoCargo}/candidatos`,
    )
    const resposta = await fetch(urlLista)

    if (!resposta.ok) throw new Error(`O TSE retornou um erro na lista geral: ${resposta.status}`)

    const dados = await resposta.json()
    const listaCandidatos = dados.candidatos || []
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

      // A FOTO não precisa de Proxy, o navegador baixa direto sem problemas de CORS
      let fotoOficialUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${ID_ELEICAO}/${cand.id}/${uf}`

      try {
        const urlDetalhes = montarUrlTse(
          `/candidatura/buscar/${ANO}/${uf}/${ID_ELEICAO}/candidato/${cand.id}`,
        )
        const respostaDetalhes = await fetch(urlDetalhes)
        if (respostaDetalhes.ok) {
          const detalhes = await respostaDetalhes.json()
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
        }
      } catch (e) {
        console.warn(`Aviso: Detalhes indisponíveis`)
      }

      try {
        const urlEleicoes = montarUrlTse(`/candidato/${cand.id}/eleicoes-anteriores`)
        const respostaEleicoes = await fetch(urlEleicoes)
        if (respostaEleicoes.ok) historicoEleicoes = await respostaEleicoes.json()
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

      // Pausa para não estressar o servidor
      await sleep(500)
    }
  } catch (erro) {
    console.error('❌ Erro ao baixar dados:', erro)
    throw erro
  }
}

export const atualizarStatusCandidato = async (candidatoFirebaseId, idTse, uf) => {
  try {
    const urlDetalhes = montarUrlTse(
      `/candidatura/buscar/${ANO}/${uf}/${ID_ELEICAO}/candidato/${idTse}`,
    )
    const respostaDetalhes = await fetch(urlDetalhes)
    if (!respostaDetalhes.ok) throw new Error('Falha ao comunicar com o TSE')

    const detalhes = await respostaDetalhes.json()

    const novaSitCand = detalhes.descricaoSituacao || 'Não informado'
    const novaSitPart = detalhes.candidato?.situacaoCandidato || 'Não informado'
    const totalBens = detalhes.totalDeBens || 0
    const bens = detalhes.bens || []
    const limiteGastos1T = detalhes.gastoCampanha1T || 0
    const limiteGastos2T = detalhes.gastoCampanha2T || 0
    const dataDeNascimento = detalhes.dataDeNascimento || detalhes.dataNascimento || null
    const genero = detalhes.descricaoSexo || 'Não informado'
    const corRaca = detalhes.descricaoCorRaca || 'Não informado'
    const grauInstrucao = detalhes.descricaoGrauInstrucao || 'Não informado'

    const vicesCacados = cacarVicesTSE(detalhes)

    const dadosAtualizados = {
      situacaoCandidatura: novaSitCand,
      situacaoPartido: novaSitPart,
      totalBens: totalBens,
      bens: bens,
      limiteGastos1T: limiteGastos1T,
      limiteGastos2T: limiteGastos2T,
      dataDeNascimento: dataDeNascimento,
      genero: genero,
      corRaca: corRaca,
      grauInstrucao: grauInstrucao,
      vices: vicesCacados,
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
    // A Câmara dos Deputados TEM o CORS aberto, então não precisa de proxy!
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
      await setDoc(votoRef, {
        nomeUrna,
        partido,
        fotoUrl,
        totalVotos: 1,
      })
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

    return {
      resultados: resultados.sort((a, b) => b.totalVotos - a.totalVotos),
      totalGeral,
    }
  } catch (error) {
    console.error('Erro ao buscar resultados:', error)
    return { resultados: [], totalGeral: 0 }
  }
}
