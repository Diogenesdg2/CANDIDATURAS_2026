import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./src/firebase/config.js";

// A URL correta que você encontrou!
const urlTSE = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/2026/BR/20322002026/1/candidatos";
const candidatosCollection = collection(db, "candidatos");

async function importarCandidatosDoTSE() {
  console.log("Iniciando conexão com a API do TSE (Eleições 2026)...");

  try {
    const resposta = await fetch(urlTSE);

    if (!resposta.ok) {
      throw new Error(`Erro na API do TSE: Status ${resposta.status}`);
    }

    const dados = await resposta.json();
    const listaCandidatos = dados.candidatos;

    console.log(`Encontrados ${listaCandidatos.length} candidatos presidenciais registrados em 2026.`);
    console.log("Sincronizando com o Firestore...");

    let inseridos = 0;

    for (const cand of listaCandidatos) {
      const q = query(candidatosCollection, where("idTse", "==", cand.id));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {

        // Validação segura para encontrar o nome do partido
        const nomePartido = (cand.partido && cand.partido.sigla)
                             ? cand.partido.sigla
                             : (cand.siglaPartido || "Sem Partido");

        await addDoc(candidatosCollection, {
          idTse: cand.id,
          nomeUrna: cand.nomeUrna || "Nome não informado",
          nomeCompleto: cand.nomeCompleto || "Nome não informado",
          numero: cand.numero || 0,
          partido: nomePartido,
          cargo: "Presidente",
          totalReceitas: 0,
          totalDespesas: 0,
          totalBens: cand.totalBens || 0,
          fotoUrl: `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/foto/2/20322002026/${cand.id}`,
          ano: 2026,
          atualizadoEm: new Date().toISOString()
        });
        inseridos++;
        console.log(`✅ Salvo: ${cand.nomeUrna || 'Sem nome'} (${nomePartido})`);
      } else {
        console.log(`⚠️ Ignorado (Já existe no banco): ${cand.nomeUrna || 'Sem nome'}`);
      }
    }

    console.log(`\nSincronização concluída! ${inseridos} novos candidatos de 2026 adicionados.`);
    process.exit(0);

  } catch (erro) {
    console.error("❌ Falha ao importar dados do TSE:", erro.message);
    process.exit(1);
  }
}

importarCandidatosDoTSE();
