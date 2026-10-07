# 02 - UX, UI e Frontend Guidelines (SGDE)

## 1. Origem e Filosofia do Frontend
*   **Figma Export:** O código base das páginas (ex: `src/pages/LegacyApp.tsx`, `Dashboard.tsx`, `Absences.tsx`) foi gerado a partir de um design no Figma.
*   **Refatoração Contínua:** A prioridade absoluta ao tocar no Frontend é **limpar e componentizar**. O código gerado costuma ter divs aninhadas desnecessárias e classes Tailwind repetidas. A IA deve refatorar ativamente essas secções em componentes menores e reutilizáveis.

## 2. Stack de UI e Styling
*   **Framework CSS:** Tailwind CSS. É proibido o uso de CSS puro ou ficheiros `.css` personalizados para estilização de componentes (salvo variáveis globais em `src/styles/theme.css` ou `globals.css`).
*   **Biblioteca de Componentes:** Utilizamos **shadcn/ui**. Todos os blocos de construção básicos já residem em `src/components/ui/`.
*   **Ícones:** Utilizar exclusivamente a biblioteca `lucide-react` (padrão do shadcn/ui), de forma a manter o estilo consistente e limpo.

## 3. Estrutura de Componentes e Layout
*   **Layout Base:** As páginas devem ser sempre injetadas dentro do `MainLayout.tsx`, que já inclui a `Sidebar.tsx` e o `TopHeader.tsx`. Não duplicar a estrutura de navegação em novas páginas.
*   **Componentes UI (`src/components/ui/`):** Antes de criar botões, modais, formulários, tabelas ou inputs do zero, a IA **TEM OBRIGATORIAMENTE** de importar e usar os componentes já existentes nesta pasta.
*   **Componentes de Feature:** Fragmentos de interface específicos do negócio (ex: `ScheduleGrid`, `AbsenceModal`) devem ser extraídos das páginas e colocados numa pasta de domínio (ex: `src/components/schedules/` ou `src/features/schedules/components/`).

## 4. Estados, Feedback e Interatividade
*   **Loading States:** É obrigatório o uso de feedback visual durante operações assíncronas (chamadas à API). 
    *   Para carregamento de blocos/tabelas, utilizar o componente `Skeleton` (`src/components/ui/skeleton.tsx`).
    *   Para botões em ação, desativar o botão e adicionar um spinner/ícone de loading.
*   **Tratamento de Erros e Sucesso:** Utilizar sempre o sistema de Toasts (`src/components/ui/sonner.tsx`) para notificar o utilizador sobre o sucesso ou falha de uma ação (ex: "Falta registada com sucesso", "Erro ao atualizar horário").
*   **Responsive Design:** O sistema será usado maioritariamente em Desktop (telas de gestão), mas as views de "Assistente / Staff" devem ser otimizadas para Mobile (usar prefixos `md:`, `lg:` do Tailwind adequadamente).

## 5. Diretrizes para a IA na Geração de UI
1.  **Não reinventar a roda:** Nunca gerar HTML puro com `<button class="bg-blue-500...">`. Fazer sempre `import { Button } from "@/components/ui/button"`.
2.  **Acessibilidade (a11y):** Manter as tags semânticas e propriedades ARIA que vêm embutidas nos componentes do Radix/shadcn.
3.  **Código Limpo:** Substituir templates monstruosos do Figma por iterações limpas (ex: usar `.map()` no React para renderizar listas de assistentes ou entradas de calendário).