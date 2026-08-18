<script setup>
import { adicionarCandidatoTeste } from './firebase/candidatosService'

const testarBanco = async () => {
  const sucesso = await adicionarCandidatoTeste()
  if(sucesso) {
    alert("Candidato salvo no Firestore com sucesso! Vá conferir no site do Firebase.")
  } else {
    alert("Erro ao salvar. Aperte F12 e olhe a aba Console do navegador para ver o erro.")
  }
}
</script>

<template>
  <main style="padding: 2rem; text-align: center; font-family: sans-serif;">
    <h1>Painel de Candidaturas 2026</h1>
    <p>Testando a conexão com o banco de dados.</p>
    <br>
    <button @click="testarBanco" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #42b883; color: white; border: none; border-radius: 5px;">
      Salvar Candidato de Teste
    </button>
  </main>
</template>
