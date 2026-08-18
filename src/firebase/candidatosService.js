import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "./config";

const candidatosCollection = collection(db, "candidatos");

// Função para adicionar um candidato de teste
export const adicionarCandidatoTeste = async () => {
  try {
    const docRef = await addDoc(candidatosCollection, {
      nome: "Candidato Exemplo",
      partido: "XPTO",
      numero: 99,
      totalDespesas: 1500000.00,
      ano: 2026
    });
    console.log("Documento escrito com ID: ", docRef.id);
    return true;
  } catch (e) {
    console.error("Erro ao adicionar documento: ", e);
    return false;
  }
};
