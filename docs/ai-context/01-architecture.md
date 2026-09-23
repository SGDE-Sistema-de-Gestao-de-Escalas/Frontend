# 01 - Arquitetura e Padrões de Desenvolvimento (SGDE)

## 1. Padrões de Comunicação (Client-Server)
*   **Comunicação Exclusiva:** O Frontend e o Backend comunicam **apenas** através de uma API RESTful em formato JSON[cite: 1].
*   **Respostas Padronizadas:** A API deve retornar sempre um formato consistente. Em caso de erro, usar códigos HTTP adequados (400, 401, 403, 404, 422, 500) e uma estrutura de erro previsível (ex: `{"message": "Erro", "errors": {...}}`).

## 2. Padrões Backend (Laravel API)
*   **Thin Controllers:** Os *Controllers* devem ser finos, servindo apenas para receber o request e devolver a resposta.
*   **Form Requests:** Toda a validação de dados de entrada (`POST`, `PUT`, `PATCH`) tem de ser feita através de *Form Requests* dedicados. Proibido validar diretamente no Controller.
*   **Services / Actions:** A lógica de negócio complexa (como o motor dinâmico de recálculo de escalas e geração de horários) DEVE residir em classes de *Service* ou *Actions*.
*   **API Resources:** Utilizar *Eloquent API Resources* para formatar as respostas JSON, mascarando a estrutura exata da base de dados (escondendo campos desnecessários) e formatando relacionamentos.
*   **Segurança SQL:** Uso exclusivo do *Eloquent ORM* ou *Query Builder*.

## 3. Padrões Frontend (React + TypeScript + Vite)
*   **Stack Confirmada:** Vite, React, TypeScript, Tailwind CSS e componentes baseados em `shadcn/ui`.
*   **TypeScript Estrito:** Uso obrigatório de interfaces/types. É proibido o uso de `any`. O modelo de dados do TypeScript (na pasta `src/types/`) deve espelhar os retornos dos *API Resources* do Laravel.
*   **Refatoração do Código Figma:** 
    *   O código exportado do Figma deve ser ativamente componentizado.
    *   Evitar duplicação: Utilizar sempre os componentes da pasta `src/components/ui/` (ex: `button.tsx`, `dialog.tsx`, `table.tsx`) em vez de criar elementos HTML nativos com dezenas de classes Tailwind repetidas.
    *   Isolar a lógica de chamadas à API em serviços na pasta `src/api/` (utilizando Axios ou nativo Fetch), mantendo os componentes UI "burros" e focados na apresentação.
*   **Estrutura de Roteamento:** As vistas principais residem em `src/pages/` (ex: `Dashboard.tsx`, `Absences.tsx`, `Schedules.tsx`) e são geridas pelo `src/router/AppRouter.tsx`.

## 4. Contratos de API (Mapeamento Inicial Baseado na BD)
Os endpoints deverão ser organizados pelos domínios principais do sistema:
*   **Auth:** Login, Logout, Perfil do Utilizador (`/api/auth/*`).
*   **Schools:** Gestão das escolas e regras de funcionamento (`/api/schools/*`)[cite: 2].
*   **Assistants:** Gestão de assistentes (`assistants`), perfis de horário (`assistant_schedule_profiles`) e exceções (`/api/assistants/*`)[cite: 2].
*   **Schedules:** Geração, visualização e publicação de escalas (`schedules`, `schedule_entries`)[cite: 2].
*   **Absences:** Registo, aprovação e justificação de faltas (`absences`, `absence_types`)[cite: 2].

## 5. Diretrizes para a IA na Implementação
*   **Regra de Ouro do Frontend:** Antes de alterar uma página em `src/pages/`, a IA deve analisar os componentes existentes em `src/components/` para maximizar a reutilização.
*   **Regra de Ouro do Backend:** Antes de criar um endpoint, a IA deve consultar o ficheiro `sgde-database-schema.md` para garantir que os campos pedidos existem nas tabelas corretas e respeitam os relacionamentos[cite: 2].