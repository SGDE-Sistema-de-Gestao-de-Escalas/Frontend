# 00 - Visão Geral do Projeto (SGDE)

## 1. O Projeto
O projeto chama-se **Sistema de Gestão Dinâmica de Escalas (SGDE)**.
Trata-se de uma plataforma desenvolvida como projeto final de curso de Engenharia/Informática por uma equipa de 4 estudantes.
**Objetivo Principal:** Automatizar a criação, validação e reajuste de horários de assistentes. 
**Escalabilidade:** O sistema é multi-tenant (multi-escola). A plataforma suporta várias escolas/equipas. Toda a gestão de assistentes, faltas, regras do motor de otimização e relatórios altera dinamicamente consoante a escola que o utilizador tem selecionada.

## 2. Atores do Sistema
A plataforma contempla dois papéis (roles) principais[cite: 2]:
*   **Administrador / Gestor:** Tem acesso à gestão da escola selecionada. Configura parametrizações, gere assistentes, aprova/rejeita faltas, visualiza relatórios e recebe alertas do motor de escalas.
*   **Assistente / Staff:** Acesso ao seu portal pessoal para consultar os seus horários (entradas, saídas, atividades). Tem também acesso ao seu histórico de faltas, onde poderá ver o estado das mesmas e submeter justificações/documentos caso seja exigido pelo administrador[cite: 2].

## 3. Stack Tecnológica
*   **Arquitetura Base:** API RESTful (Backend) separada de uma SPA (Frontend).
*   **Backend:** Laravel. Responsável por toda a lógica de negócio, motor de geração de escalas e gestão de dados.
*   **Frontend:** React com TypeScript.
*   **Origem do Frontend:** O código UI base provém de uma exportação do Figma. É estritamente necessário organizar, componentizar e refatorar este código gerado para garantir manutenibilidade.

## 4. Regras de Negócio (Motor de Otimização)
O sistema **não possui regras hardcoded**. O motor de escalas adapta-se à parametrização de cada escola[cite: 2]:
*   **Horários de Funcionamento:** Totalmente parametrizáveis por escola (hora de abertura, fecho, janelas e duração de almoço)[cite: 2].
*   **Atividades e Turnos:** Os tipos de atividade (ex: vigilância, portaria) e os perfis de horário (fixos ou rotativos) são dinâmicos e definidos na base de dados[cite: 2].
*   A IA deve sempre consultar a documentação de Arquitetura e Base de Dados para compreender como aplicar a lógica de recálculo em vez de assumir regras fixas.

## 5. Metodologia da Equipa
*   **Abordagem:** Waterfall híbrido adaptado com Sprints. Fases clássicas (Levantamento, Desenho/Arquitetura, Implementação, Testes), mas a execução (Implementação Front/Back) é feita em Sprints.
*   As tarefas são divididas de forma justa pelos 4 elementos da equipa.

## 6. Regras Estritas de Interação para a IA
1.  **Single Source of Truth:** A IA DEVE seguir estritamente os ficheiros `.md` de contexto (`00`, `01`, etc.) para entender as regras do projeto. Não deve tentar adivinhar a estrutura da BD em cada prompt.
2.  **Atualização Contínua:** Sempre que a IA sugerir ou o Team Leader aprovar uma alteração estrutural (ex: nova tabela na BD, nova regra de arquitetura), a IA **tem obrigatoriamente de atualizar** o ficheiro `.md` respetivo com essa nova informação.
3.  **Passo a Passo:** Respostas curtas, guiadas e incrementais. Sem "paredes de texto" e código não solicitado.
4.  **Análise Prévia:** Começar sempre por ler os `.md` em `docs/ai-context` antes de gerar código. Pedir contexto ao Team Leader se faltarem informações cruciais.