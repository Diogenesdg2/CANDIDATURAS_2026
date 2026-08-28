<script setup>
import { ref } from 'vue'

const cola = ref([
  { id: 'dep_federal', titulo: 'Deputado(a) Federal', digitos: 4, numero: '' },
  { id: 'dep_estadual', titulo: 'Deputado(a) Estadual / Distrital', digitos: 5, numero: '' },
  { id: 'senador_1', titulo: 'Senador(a) - 1ª Vaga', digitos: 3, numero: '' },
  { id: 'senador_2', titulo: 'Senador(a) - 2ª Vaga', digitos: 3, numero: '' },
  { id: 'governador', titulo: 'Governador(a)', digitos: 2, numero: '' },
  { id: 'presidente', titulo: 'Presidente da República', digitos: 2, numero: '' },
])

const imprimirCola = () => {
  window.print()
}

// 🌟 FUNÇÃO PARA ZERAR TODOS OS CAMPOS
const limparCola = () => {
  cola.value.forEach((cargo) => {
    cargo.numero = ''
  })
}

const apenasNumeros = (event, cargo) => {
  cargo.numero = event.target.value.replace(/\D/g, '')
}
</script>

<template>
  <main class="max-w-4xl mx-auto pb-20">
    <!-- ========================================== -->
    <!-- TELA INTERATIVA (Escondida na impressão) -->
    <!-- ========================================== -->
    <div class="print:hidden space-y-6 mb-10 transition-colors duration-300">
      <header>
        <h1 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Sua Cola Eleitoral
        </h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-2">
          Preencha os números para as Eleições 2026. O sistema vai gerar exatamente 4 colas que
          cabem em <strong>uma única folha A4</strong>.<br />
          Ou deixe em branco para imprimir os espaços vazios.
          <strong>Não é necessário preencher todos os cargos.</strong>
        </p>
      </header>

      <!-- Formulário de Preenchimento -->
      <div
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 max-w-lg mx-auto"
      >
        <div v-for="(cargo, index) in cola" :key="cargo.id" class="flex flex-col gap-1">
          <label
            :for="'input-' + cargo.id"
            class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
          >
            {{ index + 1 }}. {{ cargo.titulo }}
            <span class="lowercase normal-case font-medium">({{ cargo.digitos }} dígitos)</span>
          </label>
          <input
            :id="'input-' + cargo.id"
            :value="cargo.numero"
            @input="apenasNumeros($event, cargo)"
            type="text"
            inputmode="numeric"
            :maxlength="cargo.digitos"
            placeholder="Digite o número..."
            class="w-full text-xl font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600 placeholder:font-medium placeholder:text-base text-center tracking-[0.2em]"
          />
        </div>
      </div>

      <!-- Botões de Ação (Imprimir e Limpar) -->
      <div class="flex flex-wrap justify-center gap-3 mt-6">
        <button
          @click="imprimirCola"
          class="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-3 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transform hover:scale-105"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            ></path>
          </svg>
          Gerar Folha A4 para Impressão
        </button>

        <button
          @click="limparCola"
          class="px-6 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 focus:ring-4 focus:ring-slate-300 dark:focus:ring-slate-700"
          title="Apagar todos os números digitados"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            ></path>
          </svg>
          Limpar Campos
        </button>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- ÁREA DE IMPRESSÃO (GRID COM 4 COLAS EM 1 PÁGINA) -->
    <!-- ========================================== -->
    <div id="folha-a4" class="hidden print:grid grid-cols-2 grid-rows-2 w-full">
      <div
        v-for="n in 4"
        :key="n"
        class="cola-item p-1.5 flex flex-col bg-white justify-between"
        :class="{
          'border-r border-b border-dashed border-slate-400': n === 1,
          'border-b border-dashed border-slate-400': n === 2,
          'border-r border-dashed border-slate-400': n === 3,
        }"
      >
        <!-- Cabeçalho super compacto -->
        <div
          class="bg-slate-900 text-white px-2 py-1 text-center rounded-t-md flex items-center justify-between"
        >
          <div class="text-left">
            <h2 class="text-xs font-black uppercase tracking-tight text-white leading-tight">
              Cola Eleitoral
            </h2>
            <p class="text-[6px] font-bold text-blue-400 uppercase tracking-widest">
              Eleições 2026
            </p>
          </div>
          <div
            class="w-3.5 h-3.5 bg-white/10 rounded flex items-center justify-center font-bold text-[9px]"
          >
            +
          </div>
        </div>

        <!-- Corpo com os 6 cargos otimizados para altura -->
        <div
          class="flex-grow px-2 py-1 border-l border-r border-slate-900 space-y-1 flex flex-col justify-around"
        >
          <div v-for="(cargo, index) in cola" :key="cargo.id" class="flex flex-col">
            <p
              class="text-[7.5px] font-black uppercase text-slate-700 tracking-wider leading-none mb-0.5"
            >
              {{ index + 1 }}. {{ cargo.titulo }}
            </p>

            <div class="flex gap-0.5">
              <template v-if="cargo.numero.length > 0">
                <div
                  v-for="(digito, i) in cargo.numero
                    .padEnd(cargo.digitos, ' ')
                    .split('')
                    .slice(0, cargo.digitos)"
                  :key="i"
                  class="w-4 h-5 border border-slate-800 rounded-sm flex items-center justify-center text-[11px] font-black text-slate-900 bg-slate-50"
                >
                  {{ digito }}
                </div>
              </template>
              <template v-else>
                <div
                  v-for="vazio in cargo.digitos"
                  :key="vazio"
                  class="w-4 h-5 border border-slate-300 rounded-sm flex items-center justify-center bg-slate-50"
                ></div>
              </template>
            </div>
          </div>
        </div>

        <!-- Rodapé compacto -->
        <div class="bg-slate-100 p-0.5 text-center border border-t-0 border-slate-900 rounded-b-md">
          <p class="text-[5.5px] uppercase font-bold text-slate-600 tracking-tight leading-none">
            Proibido usar celular na cabine (Art. 91-A / Lei 9.504/97)
          </p>
        </div>
      </div>
    </div>
  </main>
</template>

<style>
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  @page {
    size: A4 portrait;
    margin: 0;
  }

  html,
  body {
    background-color: white !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 210mm;
    height: 297mm;
  }

  nav,
  footer,
  aside,
  header {
    display: none !important;
  }

  #folha-a4 {
    display: grid !important;
    height: 297mm !important;
    width: 210mm !important;
    box-sizing: border-box;
    padding: 3mm;
    margin: 0;
    position: absolute;
    top: 0;
    left: 0;
  }

  .cola-item {
    page-break-inside: avoid;
    break-inside: avoid;
    height: 100%;
  }
}
</style>
