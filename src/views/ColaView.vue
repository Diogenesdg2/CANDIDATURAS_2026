<script setup>
import { ref } from 'vue'

// A ordem exata que o eleitor enfrentará na urna em 2026
const cola = ref([
  { id: 'dep_federal', titulo: 'Deputado(a) Federal', digitos: 4, numero: '' },
  { id: 'dep_estadual', titulo: 'Deputado(a) Estadual ou Distrital', digitos: 5, numero: '' },
  { id: 'senador_1', titulo: 'Senador(a) - 1ª Vaga', digitos: 3, numero: '' },
  { id: 'senador_2', titulo: 'Senador(a) - 2ª Vaga', digitos: 3, numero: '' },
  { id: 'governador', titulo: 'Governador(a)', digitos: 2, numero: '' },
  { id: 'presidente', titulo: 'Presidente da República', digitos: 2, numero: '' },
])

const imprimirCola = () => {
  window.print()
}
</script>

<template>
  <main class="max-w-4xl mx-auto pb-20">
    <!-- ÁREA INTERATIVA (Escondida na hora da impressão) -->
    <div class="print:hidden space-y-6 mb-10 transition-colors duration-300">
      <header>
        <h1 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Sua Cola Eleitoral
        </h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-2">
          Preencha os números dos seus candidatos abaixo. Quando terminar, clique no botão para
          salvar em PDF ou imprimir no papel.
        </p>
      </header>

      <div
        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-4 flex items-start gap-3 shadow-sm"
      >
        <svg
          class="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <div>
          <p class="text-sm text-blue-900 dark:text-blue-300 font-bold tracking-wide">
            Atenção na Cabine!
          </p>
          <p class="text-xs text-blue-800 dark:text-blue-200/80 mt-1 leading-relaxed">
            É proibido entrar na cabine de votação com o celular. Leve sua cola anotada ou impressa
            em papel para não esquecer os números!
          </p>
        </div>
      </div>

      <!-- Botão de Ação -->
      <div class="flex justify-end">
        <button
          @click="imprimirCola"
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"
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
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            ></path>
          </svg>
          Salvar PDF / Imprimir
        </button>
      </div>
    </div>

    <!-- O BILHETE DA COLA (Visível na tela e perfeito para impressão) -->
    <!-- print:shadow-none e print:border-0 garantem que no papel saia limpo -->
    <div
      id="area-impressao"
      class="bg-white border-2 border-slate-200 shadow-xl rounded-2xl overflow-hidden max-w-md mx-auto print:max-w-full print:border-none print:shadow-none"
    >
      <!-- Cabeçalho do Bilhete -->
      <div
        class="bg-slate-900 text-white p-6 text-center print:bg-slate-800 print:text-black print:border-b-4 print:border-slate-800"
      >
        <h2 class="text-3xl font-black tracking-widest uppercase italic print:text-slate-900">
          Cola Eleitoral
        </h2>
        <p
          class="text-sm font-bold text-blue-400 mt-1 uppercase tracking-widest print:text-slate-600"
        >
          Eleições 2026
        </p>
      </div>

      <!-- Corpo com os Campos -->
      <div class="p-6 md:p-8 space-y-6 bg-slate-50 print:bg-white">
        <div v-for="(cargo, index) in cola" :key="cargo.id" class="flex flex-col gap-2">
          <label
            :for="cargo.id"
            class="text-xs font-black text-slate-500 uppercase tracking-widest print:text-slate-800"
          >
            {{ index + 1 }}. {{ cargo.titulo }}
          </label>

          <div class="flex items-center gap-3">
            <!-- Apenas um input simples na tela, mas que parece as caixinhas na impressão -->
            <input
              :id="cargo.id"
              v-model="cargo.numero"
              type="text"
              :maxlength="cargo.digitos"
              placeholder="Digite o número..."
              class="w-full text-2xl font-black text-slate-800 bg-white border-2 border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-300 placeholder:font-medium placeholder:text-base print:hidden"
            />

            <!-- Visão exclusiva de Impressão (Caixinhas quadradas imitando a urna) -->
            <div class="hidden print:flex gap-2 w-full">
              <template v-if="cargo.numero.length > 0">
                <!-- Se o usuário digitou, desenha os quadradinhos com os números -->
                <div
                  v-for="(digito, i) in cargo.numero
                    .padEnd(cargo.digitos, ' ')
                    .split('')
                    .slice(0, cargo.digitos)"
                  :key="i"
                  class="w-10 h-12 border-2 border-slate-800 flex items-center justify-center text-xl font-black text-slate-900"
                >
                  {{ digito }}
                </div>
              </template>
              <template v-else>
                <!-- Se ele deixou em branco, imprime as caixinhas vazias para preencher a caneta -->
                <div
                  v-for="n in cargo.digitos"
                  :key="n"
                  class="w-10 h-12 border-2 border-slate-400 bg-slate-100 flex items-center justify-center"
                ></div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Rodapé do Bilhete -->
      <div
        class="bg-blue-600 text-white p-4 text-center text-[10px] uppercase font-bold tracking-wider print:bg-white print:text-slate-500 print:border-t-2 print:border-slate-300"
      >
        Uso de celular na cabine é proibido por Lei (Art. 91-A / Lei 9.504/97)
      </div>
    </div>
  </main>
</template>

<style>
/* Regras CSS exclusivas para quando o navegador abrir a tela de impressão */
@media print {
  body {
    background-color: white !important;
  }

  /* Esconde o menu lateral/superior e rodapé global do seu App se existirem */
  nav,
  footer,
  aside {
    display: none !important;
  }

  /* Garante que o bilhete ocupe a largura ideal na folha A4 */
  #area-impressao {
    margin: 0 auto;
    width: 100%;
    max-width: 400px; /* Mantém o formato de 'santinho' no papel */
  }
}
</style>
