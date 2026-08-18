import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db } from "./config";

const candidatosCollection = collection(db, "candidatos");

// ============================================================================
// 1. FUNÇÃO DE LEITURA (A que estava faltando)
// Agora ela é inteligente e aceita os filtros vindos da tela inicial
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
// 2. FUNÇÃO DE SINCRONIZAÇÃO VIA PROXY (A que você adicionou)
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
    const q = query(candidatosCollection, where("uf", "==", uf), where("codigoCargo", "==", codigoCargo));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      console.log("✅ Os dados já existem no banco. Acesso liberado.");
      return;
    }

    console.log(`⏳ Baixando dados oficiais do TSE para ${CARGOS[codigoCargo]} (${uf})...`);

    const urlProxy = `/api-tse/divulga/rest/v1/candidatura/listar/${ANO}/${uf}/${ID_ELEICAO}/${codigoCargo}/candidatos`;
    const resposta = await fetch(urlProxy);
    const dados = await resposta.json();

    for (const cand of (dados.candidatos || [])) {
      const nomePartido = (cand.partido && cand.partido.sigla) ? cand.partido.sigla : (cand.siglaPartido || "Sem Partido");

      await addDoc(candidatosCollection, {
        idTse: cand.id,
        nomeUrna: cand.nomeUrna || "Não informado",
        nomeCompleto: cand.nomeCompleto || "Não informado",
        numero: cand.numero || 0,
        partido: nomePartido,
        cargo: CARGOS[codigoCargo],
        codigoCargo: codigoCargo,
        uf: uf,
        totalReceitas: 0, totalDespesas: 0, totalBens: cand.totalBens || 0,
        fotoUrl: `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/foto/2/${ID_ELEICAO}/${cand.id}`,
        ano: ANO
      });
    }
    console.log("✅ Sincronização concluída com sucesso!");

  } catch (erro) {
    console.error("❌ Erro ao baixar dados:", erro);
  }
};
