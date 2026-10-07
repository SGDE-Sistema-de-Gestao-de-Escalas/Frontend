# 03 - Segurança e Controlo de Acesso (Frontend React)

## 1. Proteção de Rotas e Interface (UI Guards)
*   **Route Guards:** O roteamento (React Router) deve estar protegido por componentes delimitadores (ex: `<ProtectedRoute allowedRoles={['admin']} />`). Um utilizador sem a *role* correta (`admin` ou `staff`)[cite: 2] que tente aceder diretamente ao URL de uma página não autorizada deve ser redirecionado para a página de *Unauthorized* ou *Dashboard*.
*   **Renderização Condicional:** Funcionalidades e botões destrutivos ou de gestão (ex: aprovar faltas, configurar horários, transferir assistentes)[cite: 2] não devem estar apenas inativos (`disabled`); não devem sequer ser renderizados no DOM se o utilizador não tiver o *slug* da *role* correspondente.

## 2. Prevenção de Cross-Site Scripting (XSS)
*   **Renderização Segura:** O React já escapa variáveis no JSX por defeito. É estritamente **proibido** contornar esta proteção utilizando a propriedade `dangerouslySetInnerHTML`.
*   **Campos de Texto Livre:** Atenção redobrada na renderização dos campos de texto oriundos da base de dados, nomeadamente as justificações dadas pelo assistente e as notas (campo `notes`) submetidas pelo administrador nas faltas[cite: 2]. Devem ser sempre renderizados como *plain text*.

## 3. Gestão de Sessão, API e Tokens
*   **Comunicação Axios/Fetch:** A instância centralizada de chamadas à API (na pasta `src/api/`) deve ser configurada de imediato com interceptores para apanhar erros de autenticação (HTTP 401) e autorização (HTTP 403), forçando o término da sessão do utilizador e redirecionando-o para o `/login`.
*   **Segurança de Estado (State):** O estado global da SPA (seja via *Context API*, *Zustand* ou semelhante) deve garantir um isolamento total da informação baseada na escola ativa no momento (`school_id`)[cite: 2]. O frontend não deve manter em memória listas completas de entidades que não pertencem ao contexto atual do utilizador.
*   **Tratamento de Erros:** As mensagens exibidas ao utilizador final através de *Toasts* devem ser amigáveis e seguras. O frontend nunca deve injetar e exibir diretamente na interface *stack traces* ou *SQL errors* devolvidos acidentalmente pela API.

## 4. Validação Antecipada e Uploads
*   **Ficheiros de Faltas:** O formulário de ausências onde o tipo exige justificação (`absence_types.requires_document = true`)[cite: 2] deve validar estritamente a extensão do ficheiro (ex: aceitar apenas `.pdf`, `.png`, `.jpg`) e o limite máximo de tamanho *antes* de iniciar o pedido de upload, poupando a largura de banda e protegendo os *endpoints* da API.
*   **Zod/Yup Validation:** Independentemente da API validar sempre os dados, o React deve impedir a submissão de formulários com dados inválidos (ex: horas formatadas incorretamente nas regras de horário da escola)[cite: 2] através de bibliotecas de validação de *schema* acopladas aos *Form Requests* do frontend.