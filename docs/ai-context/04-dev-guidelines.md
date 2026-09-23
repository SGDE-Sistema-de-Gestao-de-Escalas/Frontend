# 04 - Diretrizes de Desenvolvimento e Implementação de Código (SGDE)

## 1. Nomenclaturas e Clean Code (Regras Absolutas)
*   **Inglês Obrigatório:** Todos os nomes de variáveis, funções, métodos, classes, interfaces e ficheiros de código têm de ser escritos estritamente em **Inglês** (ex: `calculateSchedule`, `fetchAbsences`, `AssistantController`).
*   **Regras de Comentários:** 
    *   Devem ser apenas explicativos e focar-se no "porquê" de lógicas complexas.
    *   Não exagerar na quantidade de comentários (o código deve ser legível por si só).
    *   **É estritamente proibido enumerar comentários** (ex: não usar `// 1. Validate request`, `// 2. Save to DB`). Usar apenas um comentário de bloco ou linha simples onde seja estritamente necessário.

## 2. Regras de Ouro para a IA (Geração de Código)
*   **Implementação Incremental:** A IA nunca deve gerar blocos gigantescos de código. O desenvolvimento deve ser guiado passo a passo e focado numa única tarefa de cada vez.
*   **Zero Placeholders:** O código gerado deve ser funcional e completo para o escopo pedido.
*   **Sincronização com Documentação:** Se uma implementação exigir uma nova tabela, campo ou alteração arquitetural, a IA tem de atualizar os respetivos ficheiros `.md` (como o `01-architecture.md` ou `03-security.md`) com a alteração efetuada.


## 4. Padrões de Código Frontend (React + TypeScript)
*   **TypeScript Estrito:** É proibido o uso de `any`. Todos os estados, *props* e retornos da API têm de ter uma `interface` ou `type` declarados.
*   **Refatoração do Figma (Prioridade):** Ao processar o código proveniente do `.zip`, a IA deve limpar ativamente as classes Tailwind redundantes e isolar a UI em componentes reutilizáveis, garantindo integração com a biblioteca `shadcn/ui`.
*   **Camada de Rede:** Componentes visuais não fazem chamadas à API diretamente. Toda a comunicação com o Laravel deve ser extraída para a pasta `src/api/`.

## 5. Revisão e Resolução de Bloqueios
*   Ao enfrentar um erro de integração entre o Front e o Back, a IA deve analisar os *logs* ou a *stack trace* em vez de sugerir soluções genéricas.