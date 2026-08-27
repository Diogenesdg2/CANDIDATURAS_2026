<template>
  <main
    class="max-w-4xl mx-auto py-8 px-4 transition-colors duration-300"
    aria-labelledby="titulo-acessibilidade"
  >
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 sm:p-12 transition-colors"
    >
      <!-- Cabeçalho -->
      <header
        class="border-b border-slate-100 dark:border-slate-800 pb-6 mb-8 text-center sm:text-left transition-colors"
      >
        <h1
          id="titulo-acessibilidade"
          class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-2"
        >
          Acessibilidade no Explorador Eleitoral
        </h1>
        <p class="text-slate-500 dark:text-slate-400 text-base">
          Nosso compromisso é garantir que as informações eleitorais sejam transparentes e
          acessíveis a <strong class="dark:text-slate-300">todos os cidadãos</strong>.
        </p>
      </header>

      <!-- Conteúdo -->
      <div class="space-y-10">
        <!-- Bloco 1: Leitores de Tela -->
        <section>
          <div class="flex items-center gap-3 mb-4">
            <div
              class="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 p-2.5 rounded-xl transition-colors"
              aria-hidden="true"
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
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 19a2 2 0 01-2 2H7a2 2 0 01-2-2v-2c0-1.5 2.5-3 5-3h4c2.5 0 5 1.5 5 3v2z"
                ></path>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">Leitores de Tela</h2>
          </div>
          <p
            class="text-slate-600 dark:text-slate-300 leading-relaxed pl-2 border-l-4 border-blue-500 dark:border-blue-400"
          >
            Todo o sistema foi codificado utilizando tags semânticas do HTML5 e propriedades
            <strong>WAI-ARIA</strong>. Imagens possuem textos alternativos descritivos, botões
            possuem rótulos invisíveis explicando suas funções, e os modais avisam o leitor de tela
            (como NVDA ou VoiceOver) sempre que são abertos ou fechados.
          </p>
        </section>

        <!-- Bloco 2: Navegação por Teclado -->
        <section>
          <div class="flex items-center gap-3 mb-4">
            <div
              class="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 p-2.5 rounded-xl transition-colors"
              aria-hidden="true"
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
                  d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                ></path>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                ></path>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">
              Navegação por Teclado
            </h2>
          </div>
          <p
            class="text-slate-600 dark:text-slate-300 leading-relaxed mb-4 pl-2 border-l-4 border-indigo-500 dark:border-indigo-400"
          >
            Você pode navegar por todo o site sem utilizar o mouse. Pressione a tecla
            <kbd
              class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-slate-200 rounded px-2 py-0.5 text-xs font-mono transition-colors"
              >TAB</kbd
            >
            para avançar entre os elementos interativos e
            <kbd
              class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-slate-200 rounded px-2 py-0.5 text-xs font-mono transition-colors"
              >Shift + TAB</kbd
            >
            para retroceder. O botão
            <kbd
              class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-slate-200 rounded px-2 py-0.5 text-xs font-mono transition-colors"
              >Enter</kbd
            >
            ativa links e botões, enquanto a tecla
            <kbd
              class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 dark:text-slate-200 rounded px-2 py-0.5 text-xs font-mono transition-colors"
              >Esc</kbd
            >
            fecha qualquer janela (modal) que estiver aberta.
          </p>
          <ul
            class="list-disc list-inside text-sm text-slate-500 dark:text-slate-400 ml-4 space-y-1"
          >
            <li>O foco do teclado é sempre visível através de uma borda azul destacada.</li>
            <li>A ordem de navegação segue o fluxo lógico da leitura visual.</li>
          </ul>
        </section>

        <!-- Bloco 3: Contraste e Cores -->
        <section>
          <div class="flex items-center gap-3 mb-4">
            <div
              class="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-2.5 rounded-xl transition-colors"
              aria-hidden="true"
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
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                ></path>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">
              Contraste e Identificação Visual
            </h2>
          </div>
          <p
            class="text-slate-600 dark:text-slate-300 leading-relaxed pl-2 border-l-4 border-emerald-500 dark:border-emerald-400"
          >
            Cuidamos para que as cores do painel tenham alto contraste, facilitando a leitura para
            pessoas com baixa visão ou daltonismo. Além disso, nenhuma informação importante é
            transmitida <em class="dark:text-slate-400">apenas</em> pela cor (ex: botões vermelhos
            de erro sempre acompanham textos ou ícones claros).
          </p>
        </section>
      </div>

      <!-- Rodapé do Card -->
      <footer
        class="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800 text-center transition-colors"
      >
        <p class="text-sm text-slate-400 dark:text-slate-500">
          Encontrou alguma barreira no site? Sua opinião é fundamental para melhorarmos.
        </p>
      </footer>
    </div>
  </main>
</template>

<script setup>
// Página estática puramente informativa
</script>
