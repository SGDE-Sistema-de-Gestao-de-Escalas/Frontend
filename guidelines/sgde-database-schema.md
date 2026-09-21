# Estrutura da Base de Dados — SGDE

Baseado no protótipo (motor de regras, mapa de escalas, ausências, transferências, perfis de assistentes), o modelo relacional tem **17 tabelas**.

---

## Tabela 1 — `roles`

| Coluna | Tipo Laravel (Migration) | Nullable | Default |
|---|---|---|---|
| `id` | `id()` | — | — |
| `name` | `string()` | Não | — |
| `slug` | `string()->unique()` | Não | — |
| `description` | `string()` | Sim | null |
| `created_at / updated_at` | `timestamps()` | — | — |

**Lógica de negócio:** Separa as roles numa tabela própria em vez de um `enum` em `users` — a vantagem imediata é que adicionar uma nova role (ex: `coordinator`, `readonly`) é um simples INSERT, sem necessidade de alterar o schema da BD (`ALTER TABLE` num `enum` é destrutivo em MySQL). O `slug` é o identificador programático usado nas Policies e Gates do Laravel (ex: `admin`, `staff`) — usa-se `slug` em vez de `name` para garantir que o código não é sensível a mudanças de label visível. O `name` é o label legível para humanos (ex: `Administrador`, `Funcionário`). Os dados de seed iniciais são `admin` e `staff`, mas a arquitetura suporta crescimento sem migrações adicionais.

---

## Tabela 2 — `users`

| Coluna                    | Tipo Laravel (Migration)   | Nullable | Default |
| ------------------------- | -------------------------- | -------- | ------- |
| `id` | `id()` | — | — |
| `role_id` | `foreignId('role_id')->constrained()` | Não | — |
| `name` | `string()` | Não | — |
| `email` | `string()->unique()` | Não | — |
| `email_verified_at` | `timestamp()` | Sim | null |
| `password` | `string()` | Não | — |
| `remember_token` | `string(100)` | Sim | null |
| `created_at / updated_at` | `timestamps()` | — | — |

**Lógica de negócio:** Centraliza a autenticação. O `role_id` substitui o anterior `enum` — a role é agora uma FK para a tabela `roles`, o que torna o sistema escalável sem alterações de schema. No código Laravel, a verificação de permissões é feita via `$user->role->slug === 'admin'` ou através de Gates/Policies usando o mesmo `slug`. O `email_verified_at` segue o contrato nativo do Laravel para o fluxo de verificação de email. Não tem `softDeletes` porque eliminar um utilizador é uma ação deliberada e permanente — os dados históricos ficam preservados nas tabelas ligadas (assistants, absences, etc.).

---

## Tabela 3 — `schools`

| Coluna                    | Tipo Laravel (Migration) | Nullable | Default |
| ------------------------- | ------------------------ | -------- | ------- |
| `id`                      | `id()`                   | —        | —       |
| `name`                    | `string()`               | Não      | —       |
| `acronym`                 | `string(20)->unique()`   | Não      | —       |
| `address`                 | `string()`               | Sim      | null    |
| `phone`                   | `string(20)`             | Sim      | null    |
| `email`                   | `string()`               | Sim      | null    |
| `active`                  | `boolean()`              | Não      | `true`  |
| `created_at / updated_at` | `timestamps()`           | —        | —       |
| `deleted_at`              | `softDeletes()`          | Sim      | null    |

**Lógica de negócio:** O `acronym` (ex: `EB1-QF`, `EB1-JD`) é o identificador curto visível no switcher de escola no topo do protótipo e nos relatórios — daí ser `unique`. O campo `active` permite desativar uma escola sem a eliminar, preservando o historial de escalas e assistentes associados. O `softDeletes` protege contra eliminações acidentais: uma escola apagada por engano recupera-se sem perder os dados relacionados (assistentes, escalas, etc.).

---

## Tabela 4 — `assistants`

| Coluna                    | Tipo Laravel (Migration)                | Nullable | Default |
| ------------------------- | --------------------------------------- | -------- | ------- |
| `id`                      | `id()`                                  | —        | —       |
| `user_id`                 | `foreignId('user_id')->constrained()`   | Sim      | null    |
| `school_id`               | `foreignId('school_id')->constrained()` | Não      | —       |
| `mecanografico`           | `string(20)->unique()`                  | Não      | —       |
| `name`                    | `string()`                              | Não      | —       |
| `email`                   | `string()`                              | Sim      | null    |
| `phone`                   | `string(20)`                            | Sim      | null    |
| `available_for_transfer`  | `boolean()`                             | Não      | `false` |
| `created_at / updated_at` | `timestamps()`                          | —        | —       |
| `deleted_at`              | `softDeletes()`                         | Sim      | null    |

**Lógica de negócio:** Separa deliberadamente a entidade operacional (assistente) da entidade de autenticação (utilizador). `user_id` é nullable porque um assistente pode ser gerido pelo admin sem ter acesso ao portal — só se cria o `user` quando se ativa o login. O `mecanografico` (ex: `ME-00127`) é o identificador oficial RH, único e imutável, que aparece nos formulários e relatórios do protótipo. O `school_id` é a escola atual — quando há transferência aprovada, é este campo que muda. O `available_for_transfer` é o toggle visível na listagem de assistentes que o admin usa para sinalizar quem pode ser requisitado por outra escola. `softDeletes` por razões idênticas às escolas — um assistente "eliminado" tem historial de escalas e ausências que não pode desaparecer.

---

## Tabela 5 — `assistant_exceptions`

| Coluna                    | Tipo Laravel (Migration)                                       | Nullable | Default |
| ------------------------- | -------------------------------------------------------------- | -------- | ------- |
| `id`                      | `id()`                                                         | —        | —       |
| `assistant_id`            | `foreignId('assistant_id')->constrained()`                     | Não      | —       |
| `type`                    | `enum(['Licença Parentalidade', 'Carga Horária 6h', 'Outro'])` | Não      | —       |
| `description`             | `string()`                                                     | Sim      | null    |
| `valid_from`              | `date()`                                                       | Não      | —       |
| `valid_until`             | `date()`                                                       | Sim      | null    |
| `start_time`              | `time()`                                                       | Sim      | null    |
| `end_time`                | `time()`                                                       | Sim      | null    |
| `created_at / updated_at` | `timestamps()`                                                 | —        | —       |

**Lógica de negócio:** Tabela separada de `assistants` porque as exceções são temporais — têm início, fim e histórico. Um assistente pode ter tido `Licença Parentalidade` em 2024 e `Carga Horária 6h` a partir de 2025: ambos os registos existem com `active = false` / `true` respetivamente. O `valid_until` é nullable: licenças parentais muitas vezes não têm data de regresso definida no momento da criação. O campo `type` usa `enum` porque os valores têm impacto direto na lógica de geração de escalas — `Carga Horária 6h` reduz o horário diário no algoritmo, e `Licença Parentalidade` marca todos os blocos como `absent`. Os campos `start_time` e `end_time` são nullable porque algumas exceções são de dia inteiro (ex: `Licença Parentalidade` cobre todo o dia), enquanto outras definem apenas uma janela horária específica (ex: `Carga Horária 6h` com entrada às 07:00 e saída às 13:00 — `start_time = 07:00`, `end_time = 13:00`). Quando ambos são null, a exceção aplica-se à totalidade do dia de trabalho.

---

## Tabela 6 — `activity_types`

| Coluna                    | Tipo Laravel (Migration)                | Nullable | Default |
| ------------------------- | --------------------------------------- | -------- | ------- |
| `id`                      | `id()`                                  | —        | —       |
| `school_id`               | `foreignId('school_id')->constrained()` | Sim      | null    |
| `name`                    | `string()`                              | Não      | —       |
| `color`                   | `string(7)`                             | Não      | —       |
| `icon`                    | `string(50)`                            | Sim      | null    |
| `is_system`               | `boolean()`                             | Não      | `false` |
| `active`                  | `boolean()`                             | Não      | `true`  |
| `created_at / updated_at` | `timestamps()`                          | —        | —       |

**Lógica de negócio:** Centraliza os tipos de atividade que aparecem como blocos coloridos no mapa de escalas (`work`, `surveillance`, `lunch`, `cleaning`, `collection`, `delivery`, `absent`). O `school_id` é nullable porque os tipos de sistema (`is_system = true`) são globais e partilhados por todas as escolas — o seu `school_id` é `null`. Os tipos personalizados criados por cada escola (ex: "Apoio à Biblioteca", "Portaria Exterior") têm `school_id` preenchido e são visíveis apenas no contexto dessa escola. Esta separação reflete o facto de cada escola ter necessidades e atividades diferentes. O `color` guarda o hex (`#EC4899`) — `string(7)` é o tamanho exato de um hex com `#`. O `is_system` distingue os tipos nativos (imutáveis) dos tipos personalizados que o admin pode criar e editar. O `icon` guarda o nome do ícone Lucide (ex: `Truck`, `ShoppingBag`) para renderização no frontend sem hardcode. Sem `softDeletes` — tipos custom arquivados ficam com `active = false` sem impacto nas entradas históricas.

---

## Tabela 7 — `school_operating_rules`

| Coluna                    | Tipo Laravel (Migration)                | Nullable | Default |
| ------------------------- | --------------------------------------- | -------- | ------- |
| `id`                      | `id()`                                  | —        | —       |
| `school_id`               | `foreignId('school_id')->constrained()` | Não      | —       |
| `opening_time`            | `time()`                                | Não      | —       |
| `closing_time`            | `time()`                                | Não      | —       |
| `lunch_start`             | `time()`                                | Não      | —       |
| `lunch_end`               | `time()`                                | Não      | —       |
| `lunch_duration_minutes`  | `unsignedSmallInteger()`                | Não      | —       |
| `valid_from`              | `date()`                                | Não      | —       |
| `valid_until`             | `date()`                                | Sim      | null    |
| `created_at / updated_at` | `timestamps()`                          | —        | —       |

**Lógica de negócio:** Corresponde ao formulário "Horário de Funcionamento" do ConfigEngine no protótipo. Uma escola pode ter múltiplas regras ao longo do tempo (ex: horário de inverno vs verão) — daí a vigência com `valid_from` e `valid_until`. O `valid_until` nullable implementa o conceito "Em branco = vigência em aberto" visível no protótipo. Não existe campo `active` separado: a regra em vigor é sempre aquela cujo `valid_from <= hoje AND (valid_until IS NULL OR valid_until >= hoje)`. O `lunch_duration_minutes` usa `unsignedSmallInteger` (máx 65535) porque 30, 45 ou 60 minutos são valores pequenos — mais eficiente que `integer`. Os campos de hora usam `time()` (tipo TIME do MySQL) e não `string` porque permitem comparações e ordenações nativas a nível de query (`WHERE lunch_start >= '11:30:00'`).

---

## Tabela 8 — `school_operating_rule_days`

| Coluna                     | Tipo Laravel (Migration)                               | Nullable | Default |
| -------------------------- | ------------------------------------------------------ | -------- | ------- |
| `id`                       | `id()`                                                 | —        | —       |
| `school_operating_rule_id` | `foreignId('school_operating_rule_id')->constrained()` | Não      | —       |
| `day_of_week`              | `unsignedTinyInteger()`                                | Não      | —       |

**Lógica de negócio:** Tabela de associação que resolve a relação N:M entre uma regra de horário e os dias da semana em que se aplica. O `day_of_week` usa a convenção `0 = Segunda, 1 = Terça, ..., 6 = Domingo` — `unsignedTinyInteger` (0–255) é o tipo mais económico possível para guardar um valor de 0 a 6. A alternativa (uma coluna JSON ou bitmask na tabela pai) dificultaria queries do tipo `WHERE day_of_week = 0` para buscar todas as regras ativas às segundas. Não tem `timestamps` porque é uma tabela de relação pura sem ciclo de vida próprio.

---

## Tabela 9 — `schedules`

| Coluna                          | Tipo Laravel (Migration)                   | Nullable | Default   |
| ------------------------------- | ------------------------------------------ | -------- | --------- |
| `id`                            | `id()`                                     | —        | —         |
| `assistant_id`                  | `foreignId('assistant_id')->constrained()` | Não      | —         |
| `school_id`                     | `foreignId('school_id')->constrained()`    | Não      | —         |
| `week_start`                    | `date()`                                   | Não      | —         |
| `week_end`                      | `date()`                                   | Não      | —         |
| `status`                        | `enum(['draft', 'published', 'archived'])` | Não      | `'draft'` |
| `assistant_schedule_profile_id` | `unsignedBigInteger()`                     | Sim      | null      |
| `generated_at`                  | `timestamp()`                              | Sim      | null      |
| `published_at`                  | `timestamp()`                              | Sim      | null      |
| `created_at / updated_at`       | `timestamps()`                             | —        | —         |

**Lógica de negócio:** Representa uma semana de escala para um assistente específico — o contentor das entradas de atividade. O `school_id` é redundante face ao `assistants.school_id`, mas é intencional: preserva a escola em que o assistente estava _naquela_ semana, mesmo após uma transferência futura. O ciclo de vida `draft → published → archived` controla o fluxo: `draft` é invisível ao assistente, `published` aparece no portal de staff, `archived` é histórico somente leitura. Os campos `generated_at` e `published_at` são timestamps de auditoria — permitem saber quando a escala foi gerada automaticamente pelo algoritmo e quando foi tornada pública. O `assistant_schedule_profile_id` é nullable e sem `->constrained()` deliberadamente: serve apenas como referência de auditoria para saber qual perfil de horário estava ativo quando a escala foi gerada — mesmo que o perfil seja editado ou eliminado no futuro, o registo histórico da escala não quebra.

---

## Tabela 10 — `schedule_entries`

| Coluna                    | Tipo Laravel (Migration)                       | Nullable | Default |
| ------------------------- | ---------------------------------------------- | -------- | ------- |
| `id`                      | `id()`                                         | —        | —       |
| `schedule_id`             | `foreignId('schedule_id')->constrained()`      | Não      | —       |
| `activity_type_id`        | `foreignId('activity_type_id')->constrained()` | Não      | —       |
| `date`                    | `date()`                                       | Não      | —       |
| `start_time`              | `time()`                                       | Não      | —       |
| `end_time`                | `time()`                                       | Não      | —       |
| `is_locked`               | `boolean()`                                    | Não      | `false` |
| `created_at / updated_at` | `timestamps()`                                 | —        | —       |

**Lógica de negócio:** Armazena cada segmento de atividade como um intervalo (`start_time`/`end_time`) em vez de bloco-a-bloco (os 96 slots de 15 min do protótipo). Esta abordagem é mais eficiente: em vez de 96 registos por assistente por dia, um dia típico gera 4–6 entradas (ex: `work 07:00-11:30`, `lunch 11:30-12:30`, `work 12:30-15:00`). O `date` identifica o dia exato dentro da semana do `schedule`. O `is_locked` marca entradas geradas por regras de sistema que o assistente não pode alterar no portal (ex: período de almoço obrigatório). A integridade de não-sobreposição de horários é validada na camada de aplicação (Laravel Policy) antes do INSERT.

---

## Tabela 11 — `absence_types`

| Coluna                    | Tipo Laravel (Migration) | Nullable | Default |
| ------------------------- | ------------------------ | -------- | ------- |
| `id`                      | `id()`                   | —        | —       |
| `name`                    | `string()`               | Não      | —       |
| `requires_document`       | `boolean()`              | Não      | `false` |
| `created_at / updated_at` | `timestamps()`           | —        | —       |

**Lógica de negócio:** Parametriza os tipos de ausência sem hardcode na lógica de negócio (ex: `Falta Injustificada`, `Licença Médica`, `Tolerância de Ponto`). O campo `requires_document` é o único comportamento parametrizável: quando `true`, o formulário de registo de ausência ativa o upload de ficheiro (atestado médico, declaração, etc.) e o status da ausência fica automaticamente como `aguarda_documento` até o ficheiro ser submetido. Não existe `is_paid`, `deducts_from_balance` nem `requires_justification` — o sistema não gere banco de horas, e toda a ausência é sempre sujeita a justificação pelo processo de registo.

---

## Tabela 12 — `absences`

| Coluna                    | Tipo Laravel (Migration)                                      | Nullable | Default           |
| ------------------------- | ------------------------------------------------------------- | -------- | ----------------- |
| `id`                      | `id()`                                                        | —        | —                 |
| `assistant_id`            | `foreignId('assistant_id')->constrained()`                    | Não      | —                 |
| `absence_type_id`         | `foreignId('absence_type_id')->constrained()`                 | Não      | —                 |
| `created_by_user_id`      | `unsignedBigInteger()`                                        | Não      | —                 |
| `justified_by_user_id`    | `unsignedBigInteger()`                                        | Sim      | null              |
| `valid_from`              | `date()`                                                      | Não      | —                 |
| `valid_until`             | `date()`                                                      | Não      | —                 |
| `total_days`              | `unsignedSmallInteger()`                                      | Não      | —                 |
| `justification`           | `text()`                                                      | Sim      | null              |
| `document_path`           | `string()`                                                    | Sim      | null              |
| `status`                  | `enum(['justificada', 'injustificada', 'aguarda_documento'])` | Não      | `'injustificada'` |
| `notes`                   | `text()`                                                      | Sim      | null              |
| `created_at / updated_at` | `timestamps()`                                                | —        | —                 |

**Lógica de negócio:** O `created_by_user_id` regista quem lançou a falta no sistema (tipicamente o admin ou staff). O `justified_by_user_id` regista quem alterou o status para `justificada` após receber e validar a justificação — ambos usam `unsignedBigInteger` sem `->constrained()` para preservar o registo histórico mesmo que o utilizador seja eliminado. O ciclo de vida do `status` funciona assim: quando `absence_types.requires_document = true`, a falta é criada automaticamente como `aguarda_documento` até o ficheiro ser submetido; após submissão (ou quando não é exigido documento), o admin classifica a falta como `justificada` ou `injustificada`. O `total_days` é calculado e persistido no INSERT para evitar recalcular em cada query de relatório (campo desnormalizado por performance). O `document_path` guarda o caminho relativo no storage do Laravel (`storage/app/absences/...`). O campo `notes` substitui o anterior `rejected_reason` com semântica mais ampla — serve para qualquer observação do admin sobre a falta, independentemente do seu status.

---

## Tabela 13 — `assistant_temporary_assignments`

| Coluna                    | Tipo Laravel (Migration)                                              | Nullable | Default    |
| ------------------------- | --------------------------------------------------------------------- | -------- | ---------- |
| `id`                      | `id()`                                                                | —        | —          |
| `assistant_id`            | `foreignId('assistant_id')->constrained()`                            | Não      | —          |
| `origin_school_id`        | `foreignId('origin_school_id')->references('id')->on('schools')`      | Não      | —          |
| `destination_school_id`   | `foreignId('destination_school_id')->references('id')->on('schools')` | Não      | —          |
| `created_by_user_id`      | `unsignedBigInteger()`                                                | Não      | —          |
| `valid_from`              | `date()`                                                              | Não      | —          |
| `valid_until`             | `date()`                                                              | Sim      | null       |
| `status`                  | `enum(['active', 'completed', 'cancelled'])`                          | Não      | `'active'` |
| `notes`                   | `text()`                                                              | Sim      | null       |
| `created_at / updated_at` | `timestamps()`                                                        | —        | —          |

**Lógica de negócio:** Regista cedências temporais de assistentes entre escolas — não transferências permanentes. O fluxo é desencadeado pelo motor de escalas: quando o algoritmo deteta que uma escola não tem assistentes suficientes para cobrir as atividades obrigatórias (requisitos mínimos do sistema), apresenta ao admin a lista de assistentes de outras escolas com `available_for_transfer = true`. O admin seleciona um assistente e define o período de cedência (`valid_from` / `valid_until` — nullable se não houver data de regresso definida). O campo `assistants.school_id` **não é alterado** — o assistente mantém a sua escola de origem. Em vez disso, durante o período de vigência desta cedência, o algoritmo gera `schedules` para esse assistente com `school_id = destination_school_id`, permitindo que ele seja incluído na cobertura da escola de destino. As duas FKs para `schools` usam `->references('id')->on('schools')` com nomes explícitos porque ambas apontam para a mesma tabela — o Laravel não consegue inferir o nome da FK a partir do nome de coluna não-convencional. O `created_by_user_id` usa `unsignedBigInteger` sem `->constrained()` para preservar o histórico. O `status` evolui de `active` → `completed` (quando `valid_until` é atingido, via Laravel Scheduler) ou `cancelled` (se o admin cancelar antecipadamente).

---

---

## Tabela 14 — `assistant_schedule_profiles`

| Coluna                    | Tipo Laravel (Migration)                   | Nullable | Default |
| ------------------------- | ------------------------------------------ | -------- | ------- |
| `id`                      | `id()`                                     | —        | —       |
| `assistant_id`            | `foreignId('assistant_id')->constrained()` | Não      | —       |
| `type`                    | `enum(['fixo', 'rotativo'])`               | Não      | —       |
| `rotation_period`         | `enum(['semanal', 'quinzenal', 'mensal'])` | Sim      | null    |
| `starts_with`             | `enum(['A', 'B'])`                         | Sim      | null    |
| `valid_from`              | `date()`                                   | Não      | —       |
| `valid_until`             | `date()`                                   | Sim      | null    |
| `created_at / updated_at` | `timestamps()`                             | —        | —       |

**Lógica de negócio:** É o contentor de topo de um perfil de horário — agrupa toda a configuração que define como um assistente trabalha durante um período de vigência. O `type` distingue o regime: `fixo` tem um único turno sempre igual, `rotativo` alterna entre turno A e turno B segundo uma periodicidade. Os campos `rotation_period` e `starts_with` são nullable e só fazem sentido quando `type = 'rotativo'` — o `rotation_period` define o ciclo de alternância (semanal, quinzenal ou mensal) e o `starts_with` indica qual turno entra primeiro no ciclo. O `valid_from` + `valid_until` define a janela de vigência: se `valid_until` for null, o perfil está ativo indefinidamente. Só pode existir um perfil ativo por assistente em cada momento — esta regra é aplicada ao nível da aplicação no momento de guardar. O historial completo de todos os perfis anteriores é preservado (sem `softDeletes`) e exibido na tab "Horário Padrão" do perfil do assistente.

---

## Tabela 15 — `assistant_schedule_shifts`

| Coluna                          | Tipo Laravel (Migration)                                    | Nullable | Default |
| ------------------------------- | ----------------------------------------------------------- | -------- | ------- |
| `id`                            | `id()`                                                      | —        | —       |
| `assistant_schedule_profile_id` | `foreignId('assistant_schedule_profile_id')->constrained()` | Não      | —       |
| `shift_label`                   | `enum(['fixed', 'A', 'B'])`                                 | Não      | —       |
| `entry_time`                    | `time()`                                                    | Não      | —       |
| `exit_time`                     | `time()`                                                    | Não      | —       |
| `lunch_enabled`                 | `boolean()`                                                 | Não      | `true`  |
| `lunch_start`                   | `time()`                                                    | Sim      | null    |
| `lunch_end`                     | `time()`                                                    | Sim      | null    |
| `lunch_duration_minutes`        | `unsignedSmallInteger()`                                    | Sim      | null    |
| `created_at / updated_at`       | `timestamps()`                                              | —        | —       |

**Lógica de negócio:** Cada linha representa um turno dentro de um perfil de horário. Para `type = 'fixo'`, existe exatamente um registo com `shift_label = 'fixed'`. Para `type = 'rotativo'`, existem dois registos: um com `shift_label = 'A'` e outro com `shift_label = 'B'`. O `entry_time` e `exit_time` guardam a hora de entrada e saída do turno — derivados diretamente dos selects de hora/minuto no formulário (06h–21h, intervalos de 15 minutos). A pausa de almoço é configurável por turno de forma independente: `lunch_enabled` é o toggle que ativa ou desativa a pausa; quando ativo, `lunch_start` e `lunch_end` definem a janela horária e `lunch_duration_minutes` a duração efetiva da pausa dentro dessa janela. Não existe campo "carga horária" — a duração de trabalho é sempre calculada dinamicamente a partir de `entry_time`, `exit_time` e `lunch_duration_minutes`.

---

## Tabela 16 — `assistant_schedule_shift_days`

| Coluna                        | Tipo Laravel (Migration)                                  | Nullable | Default |
| ----------------------------- | --------------------------------------------------------- | -------- | ------- |
| `id`                          | `id()`                                                    | —        | —       |
| `assistant_schedule_shift_id` | `foreignId('assistant_schedule_shift_id')->constrained()` | Não      | —       |
| `day_of_week`                 | `unsignedTinyInteger()`                                   | Não      | —       |

**Lógica de negócio:** Regista quais os dias da semana em que cada turno está ativo. A convenção de `day_of_week` segue o padrão ISO: `0 = Segunda`, `1 = Terça`, `2 = Quarta`, `3 = Quinta`, `4 = Sexta`, `5 = Sábado`, `6 = Domingo`. Um turno típico de segunda a sexta gera 5 registos nesta tabela (valores 0 a 4). A separação em tabela própria (em vez de um campo `json` ou `set`) garante integridade referencial e facilita queries — por exemplo, "quais os assistentes que trabalham às quartas" é um `WHERE day_of_week = 2` simples. Sem `timestamps()` porque estes registos são sempre criados e eliminados em bloco com o turno pai — não há ciclo de vida independente.

---

---

## Tabela 17 — `notifications`

| Coluna                    | Tipo Laravel (Migration)              | Nullable | Default |
| ------------------------- | ------------------------------------- | -------- | ------- |
| `id`                      | `uuid()->primary()`                   | —        | —       |
| `user_id`                 | `foreignId('user_id')->constrained()` | Não      | —       |
| `type`                    | `string(100)`                         | Não      | —       |
| `title`                   | `string()`                            | Não      | —       |
| `body`                    | `text()`                              | Sim      | null    |
| `data`                    | `json()`                              | Sim      | null    |
| `read_at`                 | `timestamp()`                         | Sim      | null    |
| `created_at / updated_at` | `timestamps()`                        | —        | —       |

**Lógica de negócio:** Centraliza todas as notificações do sistema para os utilizadores. O `id` usa `uuid()` em vez de `id()` (auto-increment) porque o Laravel Notifications nativo gera UUIDs — manter esta convenção permite usar o sistema de notificações built-in do Laravel (`php artisan notifications:table`) sem fricção. O `user_id` aponta para quem recebe a notificação. O `type` é um slug que identifica o evento (ex: `schedule_published`, `absence_submitted`, `document_required`, `temporary_assignment_created`) — permite filtrar e agrupar notificações por tipo sem parsear texto. O campo `data` é JSON nullable e guarda o contexto necessário para o frontend construir o link de ação (ex: `{"schedule_id": 12}`, `{"absence_id": 7, "assistant_id": 3}`) — evita guardar HTML ou URLs hardcoded. O `read_at` null significa não lida; preenchido significa lida — o badge de notificações no header conta `WHERE read_at IS NULL AND user_id = ?`. Eventos que geram notificações no sistema: escala publicada (notifica o assistente), falta registada (notifica o admin), documento de falta em falta (notifica o assistente), cedência temporária criada (notifica o assistente cedido), cedência concluída ou cancelada (notifica o assistente).

---

## Diagrama de Relações (resumo)

```
roles
  │
users (role_id) ─────────────────────── assistants (user_id, nullable)
  │                                          │
  │ notifications                  ┌─────────┼──────────────────────────────────┐
  │ (user_id, type,                │         │                                  │
  │  read_at, data)          school_id  ┌────┴────────────┐                absences
                                   │   │                  │          (created_by_user_id,
                       school_operating_rules  assistant_exceptions   justified_by_user_id)
                                   │   (valid_from/until,
                       school_operating_rule_days  start_time/end_time)
                                   │
                                 schools ◄── assistant_temporary_assignments
                                   │            (origin_school_id / destination_school_id,
                                   │             valid_from / valid_until)
                                   │
                             activity_types
                             (school_id nullable — null = sistema)
                                   │
                      assistant_schedule_profiles (valid_from / valid_until)
                                   │
                      ┌────────────┴────────────┐
              assistant_schedule_shifts (A / B / fixed)
                                   │
                      assistant_schedule_shift_days
                                   │
                      schedules (assistant_id + school_id)
                                   │
                      schedule_entries (activity_type_id, start_time, end_time)
```