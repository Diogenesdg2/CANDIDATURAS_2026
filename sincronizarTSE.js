import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./src/firebase/config.js";

const ID_ELEICAO = "20322002026";
const ANO = 2026;
const candidatosCollection = collection(db, "candidatos");

// Dicionário de cargos para traduzir o código do TSE em texto legível
const CARGOS = {
  1: "Presidente",
  2: "Vice-Presidente",
  3: "Governador",
  4: "Vice-Governador",
  5: "Senador",
  6: "Deputado Federal",
  7: "Deputado Estadual",
  8: "Deputado Distrital",
  9: "1º Suplente",
  10: "2º Suplente"
};

// 🎯 LISTA DE TAREFAS: Adicione ou remova as buscas que deseja fazer
const buscas = [
  { uf: "BR", codigoCargo: 1 }, // Presidente (Nacional)
  { uf: "SP", codigoCargo: 3 }, // Governador (São Paulo)
  { uf: "SP", codigoCargo: 5 }, // Senador (São Paulo)
];

async function importarCandidatosDoTSE() {
  console.log("Iniciando sincronização inteligente com o TSE...\n");
  let totalInseridos = 0;

  for (const tarefa of buscas) {
    const nomeCargo = CARGOS[tarefa.codigoCargo];
    console.log(`⏳ Buscando ${nomeCargo} para a região ${tarefa.uf}...`);

    const urlTSE = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/${ANO}/${tarefa.uf}/${ID_ELEICAO}/${tarefa.codigoCargo}/candidatos`;

    try {
      const resposta = await fetch(urlTSE);
      if (!resposta.ok) throw new Error(`Status ${resposta.status}`);

      const dados = await resposta.json();
      const listaCandidatos = dados.candidatos || [];
      console.log(`   Encontrados: ${listaCandidatos.length} registros. Processando...`);

      for (const cand of listaCandidatos) {
        const q = query(candidatosCollection, where("idTse", "==", cand.id));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          const nomePartido = (cand.partido && cand.partido.sigla)
                               ? cand.partido.sigla
                               : (cand.siglaPartido || "Sem Partido");

          await addDoc(candidatosCollection, {
            idTse: cand.id,
            nomeUrna: cand.nomeUrna || "Nome não informado",
            nomeCompleto: cand.nomeCompleto || "Nome não informado",
            numero: cand.numero || 0,
            partido: nomePartido,

            // Novos campos de arquitetura:
            cargo: nomeCargo,
            codigoCargo: tarefa.codigoCargo,
            uf: tarefa.uf,

            totalReceitas: 0,
            totalDespesas: 0,
            totalBens: cand.totalBens || 0,
            fotoUrl: `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/foto/2/${ID_ELEICAO}/${cand.id}`,
            ano: ANO,
            atualizadoEm: new Date().toISOString()
          });
          totalInseridos++;
        }
      }
      console.log(`   ✅ Lote de ${nomeCargo} (${tarefa.uf}) concluído.\n`);
    } catch (erro) {
      console.error(`   ❌ Falha ao processar ${nomeCargo} (${tarefa.uf}):`, erro.message);
    }
  }

  console.log(`🎉 Sincronização finalizada! ${totalInseridos} novos registros no total.`);
  process.exit(0);
}

importarCandidatosDoTSE();
