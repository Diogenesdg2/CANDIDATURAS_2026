import { collection, getDocs, addDoc, query, where } from 'firebase/firestore'
import { db } from './config'

const candidatosCollection = collection(db, 'candidatos')

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

// ============================================================================
// 2. FUNÇÃO DE VERIFICAÇÃO (Checa se já importamos esses dados antes)
// ============================================================================
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

// ============================================================================
// 3. FUNÇÃO DE SINCRONIZAÇÃO OFICIAL
// ============================================================================
export const sincronizarDadosAutomaticamente = async (uf, codigoCargo, onProgresso) => {
  try {
    const q = query(
      candidatosCollection,
      where('uf', '==', uf),
      where('codigoCargo', '==', Number(codigoCargo)),
    )
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      return
    }

    const nomeCargo = CARGOS[codigoCargo]
    const urlProxy = `/api-tse/divulga/rest/v1/candidatura/listar/${ANO}/${uf}/${ID_ELEICAO}/${codigoCargo}/candidatos`
    const resposta = await fetch(urlProxy)

    if (!resposta.ok) {
      throw new Error(`O TSE retornou um erro na lista geral: ${resposta.status}`)
    }

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

      if (onProgresso) {
        onProgresso(atual, totalCandidatos, cand.nomeUrna || 'Candidato')
      }

      let totalBensDeclarados = 0
      let listaBens = []
      let historicoEleicoes = []
      let limiteGastos1T = 0
      let limiteGastos2T = 0
      let situacaoCand = 'Não informado'
      let situacaoPartido = 'Não informado'

      // Montagem inicial usando o ID padrão
      let fotoOficialUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${ID_ELEICAO}/${cand.id}/${uf}`

      // 1. Busca os detalhes gerais do candidato
      try {
        const urlDetalhes = `/api-tse/divulga/rest/v1/candidatura/buscar/${ANO}/${uf}/${ID_ELEICAO}/candidato/${cand.id}`
        const respostaDetalhes = await fetch(urlDetalhes)

        if (respostaDetalhes.ok) {
          const detalhes = await respostaDetalhes.json()
          totalBensDeclarados = detalhes.totalDeBens || 0
          limiteGastos1T = detalhes.gastoCampanha1T || 0
          limiteGastos2T = detalhes.gastoCampanha2T || 0
          listaBens = detalhes.bens || []
          situacaoCand = detalhes.descricaoSituacao || 'Não informado'
          situacaoPartido = detalhes.candidato?.situacaoCandidato || 'Não informado'

          // SOLUÇÃO DAS FOTOS: Pegamos o ID da Eleição específico DESTE candidato
          const idEleicaoReal = detalhes.eleicao?.id || ID_ELEICAO
          fotoOficialUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${idEleicaoReal}/${cand.id}/${uf}`
        }
      } catch (e) {
        console.warn(`Aviso: Detalhes de ${cand.nomeUrna} indisponíveis`)
      }

      // 2. Busca o Histórico de Eleições Anteriores
      try {
        const urlEleicoes = `/api-tse/divulga/rest/v1/candidato/${cand.id}/eleicoes-anteriores`
        const respostaEleicoes = await fetch(urlEleicoes)
        if (respostaEleicoes.ok) {
          historicoEleicoes = await respostaEleicoes.json()
        }
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

      // 3. Salva no Firebase
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
        fotoUrl: fotoOficialUrl,
        ano: ANO,
      })
    }
  } catch (erro) {
    console.error('❌ Erro ao baixar dados:', erro)
    throw erro
  }
}
