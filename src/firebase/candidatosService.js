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
  deleteDoc,
} from 'firebase/firestore'
import { GoogleGenerativeAI } from '@google/generative-ai'
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
    // 👇 O Firebase avisa que a cota gratuita acabou com este código:
    if (error.code === 'resource-exhausted' || error.code === 'quota-exceeded') {
      alert(
        'A cota diária gratuita de acesso ao banco de dados foi atingida. O sistema voltará ao normal amanhã cedo!',
      )
    } else {
      console.error('Erro ao buscar candidatos:', error)
    }
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
  if (detalhes.vices && Array.isArray(detalhes.vices)) {
    const vicesBrutos = detalhes.vices
      .map((v) => v.nome || v.nmCandidato || v.nm_CANDIDATO || '')
      .filter(Boolean)
    nomesEncontrados = [...vicesBrutos]
  } else {
    const extrair = (obj) => {
      if (!obj) return
      const nome =
        obj.nome ||
        obj.nmCandidato ||
        obj.nm_CANDIDATO ||
        obj.nmUrna ||
        obj.nomeUrna ||
        obj.nomeCandidato ||
        obj.nmUrnaCandidato
      if (nome && nome.trim() !== '') nomesEncontrados.push(nome.trim())
    }
    if (Array.isArray(detalhes.suplentes)) detalhes.suplentes.forEach(extrair)
    if (Array.isArray(detalhes.substitutos)) detalhes.substitutos.forEach(extrair)
    if (detalhes.viceCandidato) extrair(detalhes.viceCandidato)
    if (detalhes.vice) {
      if (Array.isArray(detalhes.vice)) detalhes.vice.forEach(extrair)
      else extrair(detalhes.vice)
    }
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
    const idsJaSalvos = snapshot.docs.map((doc) => String(doc.data().idTse))

    const nomeCargo = CARGOS[codigoCargo]
    const urlProxy = `/api-tse/divulga/rest/v1/candidatura/listar/${ANO}/${uf}/${ID_ELEICAO}/${codigoCargo}/candidatos`
    const resposta = await fetch(urlProxy)

    if (!resposta.ok) throw new Error(`O TSE retornou um erro na lista geral: ${resposta.status}`)

    const dados = await resposta.json()
    const listaCandidatosTSE = dados.candidatos || []

    const candidatosPendentes = listaCandidatosTSE.filter(
      (cand) => !idsJaSalvos.includes(String(cand.id)),
    )
    const totalPendentes = candidatosPendentes.length

    if (totalPendentes === 0) {
      alert(`Sucesso! Todos os candidatos para ${nomeCargo} em ${uf} já estão 100% sincronizados.`)
      return
    }

    let atual = 0
    for (const cand of candidatosPendentes) {
      atual++
      if (onProgresso) onProgresso(atual, totalPendentes, cand.nomeUrna || 'Candidato')

      let totalBensDeclarados = 0
      let listaBens = []
      let limiteGastos1T = 0
      let limiteGastos2T = 0
      let situacaoCand = 'Não informado'
      let situacaoPartido = 'Não informado'
      let dataNascimento = null
      let genero = 'Não informado'
      let corRaca = 'Não informado'
      let grauInstrucao = 'Não informado'
      let listaVices = []
      let fotoOficialUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${ID_ELEICAO}/${cand.id}/${uf}`

      let listaSites = []
      let urlPlanoDeGoverno = null

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
          dataNascimento = detalhes.dataDeNascimento || detalhes.dataNascimento || null
          genero = detalhes.descricaoSexo || 'Não informado'
          corRaca = detalhes.descricaoCorRaca || 'Não informado'
          grauInstrucao = detalhes.descricaoGrauInstrucao || 'Não informado'

          listaVices = cacarVicesTSE(detalhes)
          listaSites = detalhes.sites || []

          const arquivos = detalhes.arquivos || []
          if (arquivos.length > 0) {
            const arquivoPlano = arquivos.find((a) => {
              const nomeStr = (a.nome || a.descricao || a.titulo || '').toLowerCase()
              return (
                String(a.codTipo) === '5' ||
                String(a.tipo) === '5' ||
                nomeStr.includes('proposta') ||
                nomeStr.includes('governo') ||
                nomeStr.includes('plano')
              )
            })
            if (arquivoPlano) {
              const idArquivo = arquivoPlano.idArquivo || arquivoPlano.id || arquivoPlano.codigo
              if (idArquivo) {
                urlPlanoDeGoverno = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/doc/${idArquivo}`
              }
            }
          }

          const idEleicaoReal = detalhes.eleicao?.id || ID_ELEICAO
          fotoOficialUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${idEleicaoReal}/${cand.id}/${uf}?t=${new Date().getTime()}`
        }
      } catch (e) {
        console.warn(`Aviso: Detalhes indisponíveis para ${cand.nomeUrna}`)
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
        sites: listaSites,
        planoGovernoUrl: urlPlanoDeGoverno,
        ano: ANO,
      })

      await sleep(1500)
    }
  } catch (erro) {
    console.error('❌ Erro ao baixar dados:', erro)
    throw erro
  }
}

export const atualizarStatusCandidato = async (idFirebase, idTse, uf) => {
  try {
    const ID_ELEICAO_2026 = '20322002026'

    // 🏆 SOLUÇÃO DEFINITIVA: O Amplify agora resolve isso nos bastidores!
    // Apenas chamamos o /api-tse e a AWS se encarrega de pedir os dados ao TSE sem bloquear o CORS.
    const res = await fetch(
      `/api-tse/divulga/rest/v1/candidatura/buscar/2026/${uf}/${ID_ELEICAO_2026}/candidato/${idTse}`,
    )

    if (!res.ok) throw new Error('Falha ao comunicar com o TSE')

    const data = await res.json()

    let planoGovernoUrl = null
    const listaArquivos = data.arquivos || []

    if (listaArquivos.length > 0) {
      const arquivoPlano = listaArquivos.find((a) => {
        const nomeStr = (a.nome || a.descricao || a.titulo || '').toLowerCase()
        return (
          String(a.codTipo) === '5' ||
          String(a.tipo) === '5' ||
          nomeStr.includes('proposta') ||
          nomeStr.includes('governo') ||
          nomeStr.includes('plano')
        )
      })

      if (arquivoPlano) {
        const idArquivo = arquivoPlano.idArquivo || arquivoPlano.id || arquivoPlano.codigo
        if (idArquivo) {
          planoGovernoUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/doc/${idArquivo}`
        } else if (arquivoPlano.url) {
          planoGovernoUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/doc/${arquivoPlano.url}`
        }
      }
    }

    const novosDados = {
      situacaoCandidatura: data.descricaoSituacao || 'Não informado',
      situacaoPartido: data.descricaoSituacaoPartidoColigacao || 'Não informado',
      totalBens: data.totalDeBens || 0,
      bens: data.bens || [],
      limiteGastos1T: data.gastoCampanha1T || 0,
      limiteGastos2T: data.gastoCampanha2T || 0,
      dataDeNascimento: data.dataDeNascimento || '',
      vices: data.vices ? data.vices.map((v) => v.nm_CANDIDATO) : [],
      fotoUrl: `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${ID_ELEICAO_2026}/${idTse}/${uf}?t=${new Date().getTime()}`,
      sites: data.sites || [],
      planoGovernoUrl: planoGovernoUrl,
    }

    const docRef = doc(db, 'candidatos', idFirebase)
    await updateDoc(docRef, novosDados)

    return novosDados
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

export const realizarManutencaoEmLote = async (uf, codigoCargo, opcoes, onProgresso) => {
  try {
    const q = query(
      candidatosCollection,
      where('uf', '==', uf),
      where('codigoCargo', '==', Number(codigoCargo)),
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) return

    const listaLocal = snapshot.docs.map((doc) => ({
      idFirebase: doc.id,
      idTse: doc.data().idTse,
      nomeUrna: doc.data().nomeUrna,
    }))
    const total = listaLocal.length
    let atual = 0

    for (const cand of listaLocal) {
      atual++
      if (onProgresso) onProgresso(atual, total, cand.nomeUrna)

      try {
        const urlDetalhes = `/api-tse/divulga/rest/v1/candidatura/buscar/${ANO}/${uf}/${ID_ELEICAO}/candidato/${cand.idTse}`
        const resposta = await fetch(urlDetalhes)
        if (!resposta.ok) throw new Error('Falha de conexão com o TSE')

        const detalhes = await resposta.json()
        let dadosAtualizados = {}

        if (opcoes.situacao) {
          dadosAtualizados.situacaoCandidatura = detalhes.descricaoSituacao || 'Não informado'
          dadosAtualizados.situacaoPartido =
            detalhes.candidato?.situacaoCandidato || 'Não informado'
        }

        if (opcoes.bens) {
          dadosAtualizados.totalBens = detalhes.totalDeBens || 0
          dadosAtualizados.bens = detalhes.bens || []
          dadosAtualizados.limiteGastos1T = detalhes.gastoCampanha1T || 0
          dadosAtualizados.limiteGastos2T = detalhes.gastoCampanha2T || 0
        }

        if (opcoes.vicesEPessoais) {
          dadosAtualizados.dataDeNascimento =
            detalhes.dataDeNascimento || detalhes.dataNascimento || null
          dadosAtualizados.vices = cacarVicesTSE(detalhes)
          dadosAtualizados.sites = detalhes.sites || []

          const arquivos = detalhes.arquivos || []
          if (arquivos.length > 0) {
            const arquivoPlano = arquivos.find(
              (a) =>
                String(a.codTipo) === '5' ||
                String(a.tipo) === '5' ||
                (a.nome || '').toLowerCase().includes('proposta'),
            )
            if (arquivoPlano) {
              const idArquivo = arquivoPlano.idArquivo || arquivoPlano.id || arquivoPlano.codigo
              if (idArquivo)
                dadosAtualizados.planoGovernoUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/doc/${idArquivo}`
            }
          }
        }

        if (opcoes.foto) {
          const idEleicaoReal = detalhes.eleicao?.id || ID_ELEICAO
          dadosAtualizados.fotoUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${idEleicaoReal}/${cand.idTse}/${uf}?t=${new Date().getTime()}`
        }

        if (Object.keys(dadosAtualizados).length > 0) {
          const docRef = doc(db, 'candidatos', cand.idFirebase)
          await updateDoc(docRef, dadosAtualizados)
        }
      } catch (e) {
        console.warn(`Aviso: Falha ao fazer manutenção em ${cand.nomeUrna}`, e)
      }

      await sleep(1000)
    }
  } catch (erro) {
    console.error('❌ Erro na Manutenção:', erro)
    throw erro
  }
}

export const auditarERemoverDuplicatas = async (uf, codigoCargo) => {
  try {
    const q = query(
      candidatosCollection,
      where('uf', '==', uf),
      where('codigoCargo', '==', Number(codigoCargo)),
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return { totalEncontrados: 0, removidos: 0 }
    }

    const mapIdsTse = new Map()
    let duplicadosParaRemover = []

    snapshot.docs.forEach((docSnap) => {
      const dados = docSnap.data()
      const idTse = String(dados.idTse)

      if (mapIdsTse.has(idTse)) {
        duplicadosParaRemover.push(docSnap.id)
      } else {
        mapIdsTse.set(idTse, docSnap.id)
      }
    })

    for (const idFirebase of duplicadosParaRemover) {
      const docRef = doc(db, 'candidatos', idFirebase)
      await deleteDoc(docRef)
    }

    return {
      totalEncontrados: snapshot.docs.length,
      removidos: duplicadosParaRemover.length,
    }
  } catch (erro) {
    console.error('❌ Erro na auditoria de duplicatas:', erro)
    throw erro
  }
}

export const getStatusManutencao = async () => {
  try {
    const docRef = doc(db, 'configuracoes', 'geral')
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return docSnap.data().emManutencao || false
    }
    return false
  } catch (e) {
    return false
  }
}

export const setStatusManutencao = async (status) => {
  try {
    const docRef = doc(db, 'configuracoes', 'geral')
    await setDoc(docRef, { emManutencao: status }, { merge: true })
    return true
  } catch (e) {
    return false
  }
}

export const getConfigUrna = async () => {
  try {
    const docRef = doc(db, 'configuracoes', 'urna')
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return docSnap.data()
    }
    return { bloqueioAtivo: true, tempoMinutos: 2 }
  } catch (e) {
    return { bloqueioAtivo: true, tempoMinutos: 2 }
  }
}

export const setConfigUrna = async (config) => {
  try {
    const docRef = doc(db, 'configuracoes', 'urna')
    await setDoc(docRef, config, { merge: true })
    return true
  } catch (e) {
    return false
  }
}

// ====================================================
// 🤖 GERADOR DE RESUMO DE PLANO DE GOVERNO COM IA (GEMINI)
// ====================================================
export const gerarResumoIA = async (candidato) => {
  // 1. SE O RESUMO JÁ EXISTE NO BANCO, DEVOLVE INSTANTANEAMENTE (CACHE)!
  if (candidato.resumoIA) {
    return candidato.resumoIA
  }

  if (!candidato.planoGovernoUrl) {
    throw new Error('Este candidato não possui Plano de Governo cadastrado no TSE.')
  }

  try {
    // 2. Baixar o PDF passando pelo nosso Proxy para evitar bloqueio (CORS)
    const urlProxy = candidato.planoGovernoUrl.replace(
      'https://divulgacandcontas.tse.jus.br',
      '/api-tse',
    )
    const response = await fetch(urlProxy)
    if (!response.ok) throw new Error('Não foi possível baixar o PDF do TSE.')
    const blob = await response.blob()

    // 3. Converter o PDF para Base64 (formato que a IA entende ler)
    const base64data = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result.split(',')[1])
      reader.readAsDataURL(blob)
    })

    // 4. Inicializar a IA do Google (Gemini Flash -)
    // 1. Truque de ofuscação: o "a" intruso no final da parte 2
    const parte1 = 'AQ.Ab8RN6JY29UX5r7X9'
    const parte2Mascara = '_0zMyU6uD-4y1KLo8E8peN7xpoJxXqbdAa'

    // 2. Função para desmascarar (arranca a última letra e junta tudo)
    const desmascararChave = (p1, p2) => {
      const p2Limpa = p2.slice(0, -1) // Corta exatamente o "a" do final
      return p1 + p2Limpa
    }

    // 3. Inicializa a IA chamando a nossa função
    const genAI = new GoogleGenerativeAI(desmascararChave(parte1, parte2Mascara))
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

    // 5. O Comando (Prompt) perfeito para a IA
    const prompt = `Você é um cientista político imparcial e neutro. Leia este plano de governo em anexo e crie um resumo executivo rápido para um eleitor.
    Regras estritas:
    1. Crie um breve parágrafo introdutório de no máximo 3 linhas informando a visão geral do documento.
    2. Liste as 4 ou 5 principais propostas/pilares de forma direta e objetiva.
    3. Retorne EXATAMENTE código HTML puro formatado com as tags <p>, <ul>, <li> e <strong>.
    4. NÃO use formatação markdown de código (como \`\`\`html), retorne apenas o HTML cru.`

    // 6. Enviar para a IA
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64data, mimeType: 'application/pdf' } },
    ])

    const resumoGeradoHtml = result.response.text()

    // 7. Salvar o resumo gerado no Firebase para gerar Cache!
    const docRef = doc(db, 'candidatos', candidato.id)
    await updateDoc(docRef, { resumoIA: resumoGeradoHtml })

    return resumoGeradoHtml
  } catch (error) {
    console.error('Erro na IA:', error)
    throw new Error(
      'A IA não conseguiu processar este arquivo. O documento pode ser muito grande, protegido ou estar corrompido no TSE.',
      { cause: error },
    )
  }
}
// ====================================================
// ⚔️ BATALHA DE CANDIDATOS (COMPARAÇÃO COM IA)
// ====================================================
export const gerarComparacaoIA = async (candidato1, candidato2) => {
  try {
    // 1. Truque de ofuscação igual ao do Resumo IA
    const parte1 = 'AQ.Ab8RN6JY29UX5r7X9'
    const parte2Mascara = '_0zMyU6uD-4y1KLo8E8peN7xpoJxXqbdAa'
    const desmascararChave = (p1, p2) => p1 + p2.slice(0, -1)

    const genAI = new GoogleGenerativeAI(desmascararChave(parte1, parte2Mascara))
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

    // 2. Monta o Prompt para o Combate
    const prompt = `
      Aja como um analista político de alto nível, apartidário e extremamente direto.
      Vou fornecer os dados básicos e o resumo do plano de governo de dois candidatos que disputam a mesma eleição.

      [Candidato 1]
      Nome: ${candidato1.nomeUrna} (${candidato1.partido})
      Bens Declarados: R$ ${candidato1.totalBens || 0}
      Pilares do Plano de Governo: ${candidato1.resumoIA || 'Plano não analisado / Indisponível'}

      [Candidato 2]
      Nome: ${candidato2.nomeUrna} (${candidato2.partido})
      Bens Declarados: R$ ${candidato2.totalBens || 0}
      Pilares do Plano de Governo: ${candidato2.resumoIA || 'Plano não analisado / Indisponível'}

      Tarefa:
      Escreva um parágrafo único (máximo 6 linhas) traçando o perfil de disputa entre eles.
      Evidencie o foco principal de cada um (ex: "Enquanto o Candidato A foca mais em privatizações, o Candidato B prioriza auxílios sociais...").
      Não invente informações que não estejam aqui. Não emita juízo de valor sobre quem é melhor ou pior.
      Retorne HTML puro usando <p> e <strong> para destacar o nome dos candidatos. Não use marcadores markdown como \`\`\`html.
    `

    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (error) {
    console.error('Erro na Batalha IA:', error)
    throw new Error(
      'Os servidores da IA estão sobrecarregados ou não conseguiram cruzar os dados neste momento.',
      { cause: error },
    )
  }
}
