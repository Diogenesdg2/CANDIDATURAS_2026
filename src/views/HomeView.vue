<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { regioesBrasil } from '../data/regioes'
import { sincronizarDadosAutomaticamente, verificarDadosExistem } from '../firebase/candidatosService'

const router = useRouter()
const regiaoSelecionada = ref(null)
const ufSelecionada = ref(null)
const cargoSelecionado = ref(null)

const carregando = ref(false)
const verificandoBanco = ref(false)
const dadosJaExistem = ref(false) // Variável que controla a inteligência do botão

const selecionarRegiao = (regiao) => {
  regiaoSelecionada.value = regiao
  ufSelecionada.value = null
  cargoSelecionado.value = null
}

const selecionarUf = (uf) => {
  ufSelecionada.value = uf
  cargoSelecionado.value = null
}

const selecionarCargo = (codigo) => {
  cargoSelecionado.value = codigo
}

// Fica "olhando" para as seleções. Se o usuário escolher UF e Cargo, checa o banco na hora!
watch([ufSelecionada, cargoSelecionado], async ([uf, cargo]) => {
  if (uf && cargo) {
    verificandoBanco.value = true
    dadosJaExistem.value = await verificarDadosExistem(uf.sigla, cargo)
    verificandoBanco.value = false
  }
})

const explorarCandidatos = async () => {
  if (ufSelecionada.value && cargoSelecionado.value) {
    // Só importa se os dados NÃO existirem
    if (!dadosJaExistem.value) {
      carregando.value = true
      await sincronizarDadosAutomaticamente(ufSelecionada.value.sigla, cargoSelecionado.value)
      carregando.value = false
    }

    // Navega mandando os parâmetros na URL
    router.push({
      path: '/candidatos',
      query: { uf: ufSelecionada.value.sigla, cargo: cargoSelecionado.value }
    })
  }
}
</script>

<template>
  <div class="space-y-8">
    <header class="text-center md:text-left">
      <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Explorador Eleitoral 2026</h1>
      <p class="mt-2 text-slate-600 text-sm">Selecione a região, o estado e o cargo que deseja analisar as contas e candidaturas.</p>
    </header>

    <!-- PASSO 1: Regiões -->
    <div class="space-y-3">
      <h2 class="text-sm font-bold uppercase tracking-wider text-slate-500">1. Escolha a Região</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          v-for="regiao in regioesBrasil"
          :key="regiao.id"
          @click="selecionarRegiao(regiao)"
          :class="[
            'p-4 rounded-2xl border-2 text-center transition-all duration-200 shadow-sm hover:shadow-md flex flex-col items-center justify-center gap-2',
            regiaoSelecionada?.id === regiao.id
              ? 'border-blue-600 bg-blue-50 text-blue-900'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
          ]"
        >
          <span class="text-3xl">{{ regiao.icone }}</span>
          <span class="font-bold text-sm">{{ regiao.nome }}</span>
        </button>
      </div>
    </div>

    <!-- PASSO 2: Estados (Aparece após selecionar região) -->
    <div v-if="regiaoSelecionada" class="space-y-3 animate-fade-in">
      <h2 class="text-sm font-bold uppercase tracking-wider text-slate-500">2. Selecione o Estado</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <button
          v-for="uf in regiaoSelecionada.ufs"
          :key="uf.sigla"
          @click="selecionarUf(uf)"
          :class="[
            'p-3 rounded-xl border flex items-center gap-3 transition-colors text-left shadow-sm',
            ufSelecionada?.sigla === uf.sigla
              ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
          ]"
        >
          <span class="text-xl">{{ uf.bandeira }}</span>
          <div>
            <span class="block font-bold text-sm leading-tight">{{ uf.nome }}</span>
            <span class="text-xs opacity-70">{{ uf.sigla }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- PASSO 3: Cargos (Aparece após selecionar UF) -->
    <div v-if="ufSelecionada" class="space-y-3 animate-fade-in">
      <h2 class="text-sm font-bold uppercase tracking-wider text-slate-500">3. Qual cargo deseja analisar?</h2>
      <div class="flex flex-wrap gap-3">
        <button
          v-for="cargo in regiaoSelecionada.cargosDisponiveis"
          :key="cargo.codigo"
          @click="selecionarCargo(cargo.codigo)"
          :class="[
            'px-5 py-2.5 rounded-full font-semibold text-sm transition-colors border shadow-sm',
            cargoSelecionado === cargo.codigo
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          ]"
        >
          {{ cargo.nome }}
        </button>
      </div>
    </div>

    <!-- PASSO 4: Ação Final -->
   <!-- PASSO 4: Ação Final -->
    <div v-if="cargoSelecionado" class="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in">
      <div>
        <h3 class="font-bold text-slate-900 text-lg">
          <span v-if="verificandoBanco" class="text-slate-500">Verificando banco de dados...</span>
          <span v-else-if="dadosJaExistem" class="text-emerald-600">Dados já disponíveis!</span>
          <span v-else class="text-blue-600">Novos dados encontrados no TSE!</span>
        </h3>
        <p class="text-sm text-slate-600 mt-1">
          <span v-if="!verificandoBanco && dadosJaExistem">Estes candidatos já estão salvos no seu painel. Pronto para explorar.</span>
          <span v-if="!verificandoBanco && !dadosJaExistem">Ao clicar, o sistema fará a importação oficial do TSE para o seu painel.</span>
        </p>
      </div>

      <button
        @click="explorarCandidatos"
        :disabled="carregando || verificandoBanco"
        :class="[
          'w-full md:w-auto px-8 py-3.5 font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 text-white disabled:opacity-70',
          dadosJaExistem ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
        ]"
      >
        <span v-if="carregando">Importando do TSE...</span>
        <span v-else-if="dadosJaExistem">Ver Candidatos</span>
        <span v-else>Importar e Ver Candidatos</span>

        <svg v-if="!carregando" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
      </button>
    </div>

  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
