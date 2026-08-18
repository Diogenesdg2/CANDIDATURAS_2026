import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db } from "./config";

const candidatosCollection = collection(db, "candidatos");

// ============================================================================
// 1. FUNÇÃO DE LEITURA (Busca os dados para mostrar na tela)
// ============================================================================
export const buscarCandidatos = async (ufFiltro = null, cargoFiltro = null) => {
  try {
    let q = candidatosCollection;

    // Se a tela enviou um Estado e um Cargo, filtra direto no banco
    if (ufFiltro && cargoFiltro) {
      q = query(
        candidatosCollection,
        where("uf", "==", ufFiltro),
        where("codigoCargo", "==", Number(cargoFiltro))
      );
    }

    const snapshot = await getDocs(q);
    const lista = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return lista;
  } catch (error) {
    console.error("Erro ao buscar candidatos:", error);
    return [];
  }
};

// ============================================================================
// 2. FUNÇÃO DE VERIFICAÇÃO (Checa se já importamos esses dados antes)
// ============================================================================
export const verificarDadosExistem = async (uf, codigoCargo) => {
  try {
    const q = query(
      candidatosCollection,
      where("uf", "==", uf),
      where("codigoCargo", "==", Number(codigoCargo))
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty; // Retorna true se encontrou dados, false se está vazio
  } catch (error) {
    console.error("Erro ao verificar existência:", error);
    return false;
  }
};

// ============================================================================
// 3. FUNÇÃO DE SINCRONIZAÇÃO OFICIAL (O nosso "robô" da API do TSE)
// ============================================================================
const ID_ELEICAO = "20322002026";
const ANO = 2026;
const CARGOS = {
  1: "Presidente", 2: "Vice-Presidente", 3: "Governador", 4: "Vice-Governador",
  5: "Senador", 6: "Deputado Federal", 7: "Deputado Estadual", 8: "Deputado Distrital",
  9: "1º Suplente", 10: "2º Suplente"
};

export const sincronizarDadosAutomaticamente = async (uf, codigoCargo) => {
  try {
    // Evita duplicidade conferindo se os dados já existem
    const q = query(candidatosCollection, where("uf", "==", uf), where("codigoCargo", "==", Number(codigoCargo)));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      console.log("✅ Os dados já existem no banco. Acesso liberado.");
      return;
    }

    const nomeCargo = CARGOS[codigoCargo];
    console.log(`⏳ Iniciando download oficial: ${nomeCargo} (${uf})...`);

    // Passo A: Puxa a lista geral de candidatos para aquele Cargo/Estado
    const urlProxy = `/api-tse/divulga/rest/v1/candidatura/listar/${ANO}/${uf}/${ID_ELEICAO}/${codigoCargo}/candidatos`;
    const resposta = await fetch(urlProxy);

    if (!resposta.ok) {
      throw new Error(`O TSE retornou um erro na lista geral: ${resposta.status}`);
    }

    const dados = await fetch(urlProxy).then(res => res.json());
    const listaCandidatos = dados.candidatos || [];

    console.log(`📦 O TSE retornou ${listaCandidatos.length} candidatos. Buscando detalhes individuais...`);

    if (listaCandidatos.length === 0) {
      alert(`Atenção: O TSE informou que existem 0 candidatos registrados para ${nomeCargo} em ${uf} neste momento.`);
      return;
    }

    // Passo B: Entra no perfil de CADA candidato para extrair os detalhes e finanças
for (const cand of listaCandidatos) {

      let totalBensDeclarados = 0;
      let listaBens = [];
      let historicoEleicoes = [];
      let limiteGastos1T = 0;
      let limiteGastos2T = 0;

      try {
        // 1. Busca os detalhes gerais e os Bens do Candidato
        const urlDetalhes = `/api-tse/divulga/rest/v1/candidatura/buscar/${ANO}/${uf}/${ID_ELEICAO}/candidato/${cand.id}`;
        const respostaDetalhes = await fetch(urlDetalhes);
        if (respostaDetalhes.ok) {
          const detalhes = await respostaDetalhes.json();
          totalBensDeclarados = detalhes.totalDeBens || 0;
          limiteGastos1T = detalhes.gastoCampanha1T || 0;
          limiteGastos2T = detalhes.gastoCampanha2T || 0;
          listaBens = detalhes.bens || []; // Lista detalhada dos bens
        }
      } catch (e) {
        console.warn(`Aviso: Não foi possível baixar os detalhes de ${cand.nomeUrna}`);
      }

      // 2. Busca o Histórico de Eleições Anteriores do Candidato na API do TSE
      try {
        const urlEleicoes = `/api-tse/divulga/rest/v1/candidato/${cand.id}/eleicoes-anteriores`;
        const respostaEleicoes = await fetch(urlEleicoes);
        if (respostaEleicoes.ok) {
          historicoEleicoes = await respostaEleicoes.json();
        }
      } catch (e) {
        // Caso a API não retorne o histórico para algum candidato específico, criamos um padrão simulado baseado no atual
        historicoEleicoes = [
          { ano: ANO, cargo: nomeCargo, uf: uf, partido: cand.siglaPartido || "PR", numero: cand.numero }
        ];
      }

      // 3. Salva tudo estruturado no Firestore
      const nomePartido = (cand.partido && cand.partido.sigla) ? cand.partido.sigla : (cand.siglaPartido || "Sem Partido");

      await addDoc(candidatosCollection, {
        idTse: cand.id,
        nomeUrna: cand.nomeUrna || "Não informado",
        nomeCompleto: cand.nomeCompleto || "Não informado",
        numero: cand.numero || 0,
        partido: nomePartido,
        cargo: nomeCargo,
        codigoCargo: Number(codigoCargo),
        uf: uf,
        totalBens: totalBensDeclarados,
        bens: listaBens, // Array com os bens detalhados (tipo, descrição, valor)
        eleicoesAnteriores: historicoEleicoes, // Histórico de participações
        limiteGastos1T: limiteGastos1T,
        limiteGastos2T: limiteGastos2T,
        fotoUrl: `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/foto/2/${ID_ELEICAO}/${cand.id}`,
        ano: ANO
      });
    }

    console.log("✅ Sincronização completa concluída com sucesso!");

  } catch (erro) {
    console.error("❌ Erro ao baixar dados:", erro);
    alert(`Erro ao tentar baixar os candidatos: ${erro.message}`);
  }
};
