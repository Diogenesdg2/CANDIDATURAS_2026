import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "./config";

const candidatosCollection = collection(db, "candidatos");

// 1. Buscar todos os candidatos salvos no Firestore
export const buscarCandidatos = async () => {
  try {
    const snapshot = await getDocs(candidatosCollection);
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

// 2. Função auxiliar para popular dados de teste realistas
export const popularDadosExemplo = async () => {
  const dadosExemplo = [
    {
      nomeUrna: "Candidato Alfa",
      nomeCompleto: "Alfa da Silva Santos",
      numero: 10,
      partido: "PARTIDO VERDE",
      cargo: "Presidente",
      fotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      totalReceitas: 14500000.00,
      totalDespesas: 11200000.00,
      totalBens: 3200000.00,
      ano: 2026
    },
    {
      nomeUrna: "Dra. Beatriz",
      nomeCompleto: "Beatriz Helena Oliveira",
      numero: 20,
      partido: "PARTIDO AZUL",
      cargo: "Presidente",
      fotoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80",
      totalReceitas: 25800000.00,
      totalDespesas: 19400000.00,
      totalBens: 6400000.00,
      ano: 2026
    },
    {
      nomeUrna: "Prof. Carlos",
      nomeCompleto: "Carlos Eduardo Ferreira",
      numero: 30,
      partido: "PARTIDO AMARELO",
      cargo: "Presidente",
      fotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
      totalReceitas: 9200000.00,
      totalDespesas: 7100000.00,
      totalBens: 1800000.00,
      ano: 2026
    }
  ];

  for (const item of dadosExemplo) {
    await addDoc(candidatosCollection, item);
  }
};
