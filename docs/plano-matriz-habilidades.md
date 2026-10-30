# Plano — Matriz de competências por habilidades + auto-avaliação + plano de desenvolvimento

> Status: **rascunho / não implementado.** Registrado a pedido do usuário antes de
> qualquer alteração de código. A UX final será alinhada navegando o app de
> referência (https://meupdi.app.br) em conjunto.

## Terminologia (importante)

- **Meu PDI** = app **externo de referência** (https://meupdi.app.br). É dele que vêm as
  ideias observadas neste documento. **Não** é o nosso app.
- **GB PDI** (`gb_pdi`) = **o nosso app**, onde estas melhorias serão implementadas depois.

Tudo aqui descreve o que o **Meu PDI** faz, registrado como melhoria a aplicar no **GB PDI**.

**Princípio de UI (vale para todas as telas):** quando eu disser "usar essa interface" ou
"a interface está ótima", refiro-me à **mecânica / ao comportamento** (fluxo, campos,
regras), **não** ao visual. A aparência do GB PDI continua seguindo o **nosso Design
System** — não precisa ser idêntica ao Meu PDI. Reaproveitar a mecânica, redesenhar com
o nosso DS.

## Problema com o modelo atual

Hoje a matriz é uma célula `carreira × nível × competência → nível_esperado` (um número)
mais uma observação em texto. O usuário avaliou que isso **não está bom**: falta o
nível de detalhe real — cada competência é composta de **habilidades**, e é nelas que o
nível de expertise é definido e, depois, auto-avaliado.

## Modelo desejado (o que o usuário descreveu)

1. **Cada competência tem uma lista de habilidades**, e cada habilidade tem um
   **nível de expertise**.
2. A tela de **Matriz de competências** vira um **CRUD de habilidades**:
   - O usuário seleciona a **carreira** e o **nível de especialidade**.
   - Vê a **lista de habilidades** correspondente (por competência).
   - Adiciona uma habilidade digitando o texto e incluindo na lista.
   - Na lista, pode **editar** ou **excluir** cada habilidade.
   - UI facilitada para esse fluxo (inserção rápida, lista direta — não o
     "parágrafo com tópicos" atual).
3. **Auto-avaliação (etapa futura do usuário):** ao se auto-avaliar, o usuário
   **visualiza a lista de habilidades agrupadas por hard e soft** (previamente
   cadastradas e correspondentes à área × senioridade que ele selecionou) e classifica
   **cada habilidade** em uma de **4 opções** (ver seção "Auto-avaliação").
4. **Plano de desenvolvimento automático:** as habilidades com classificação de "gap"
   entram **automaticamente** no plano de desenvolvimento do usuário (quais níveis
   contam — ver seção "Auto-avaliação").
5. **Diário vinculado ao plano:** ao inserir um registro no diário, o usuário pode
   **vincular a ação a um ou vários itens do seu plano de desenvolvimento**.

## Assistente de criação do PDI — início do fluxo

Observado no app de referência (passo inicial do wizard): coleta **nome, e-mail e
propósito**, e oferece um botão **"template por profissão"** (opcional) que abre a lista
de carreiras para o usuário escolher **área e especialidade**. Essa escolha é o que faz
os passos seguintes de **auto-avaliação** virem baseados nas **qualificações esperadas
para aquela função e nível**.

**Decisão para o nosso app:** isso **não é opção** — é o **formato padrão**. O assistente
de criação do PDI **começa com o usuário selecionando sua área e sua senioridade**, e a
partir daí a auto-avaliação é montada com as habilidades esperadas para aquela carreira ×
nível. (Sem o caminho alternativo "em branco / só texto livre" do app de referência.)

## Auto-avaliação (passo 2 do assistente)

Observado no app de referência: o usuário recebe a **lista de habilidades agrupadas por
hard e soft**, já cadastrada e correspondente ao que ele selecionou antes (área ×
senioridade). Para **cada habilidade**, ele escolhe entre **4 opções**:

| Opção | Sentido (ordem do pior ao melhor) |
| --- | --- |
| **Precisa agir** | abaixo do esperado — gap claro |
| **Pode mais** | perto, mas ainda não atende plenamente |
| **Atende** | no nível esperado |
| **Muda o jogo** | acima do esperado / referência |

**UI:** uma **tabela de radio buttons** — uma linha por habilidade, uma coluna por opção,
o usuário marca a célula correspondente. Agrupada por Hard / Soft.

**Alimenta o plano de desenvolvimento:** as habilidades classificadas como gap entram
automaticamente no plano. **Em aberto:** só **"Precisa agir"**, ou também **"Pode mais"**?
(Decisão a confirmar — provavelmente ambas, com prioridade maior para "Precisa agir".)

**Impacto no modelo:** substitui a auto-avaliação binária (atende/não atende) por uma
escala de 4 níveis, armazenada por `perfil × habilidade`.

## Estabelecimento de Objetivos (passo 3)

A interface do Meu PDI para este passo **está ótima e será reaproveitada como está**.
Formulário "Novo objetivo" com:

- **Área do Objetivo** (dropdown): no GB PDI, exibir **Funcional** e **Educacional**.
- **Horizonte de Tempo** (botões): **Curto Prazo / Médio Prazo / Longo Prazo**.
- **"O que você quer alcançar?"** (texto).
- **"Por que este objetivo é importante?"** (texto, recomendado para SMART).
- Contador **"N/4 objetivos criados"** + botão **Adicionar Objetivo**.
- Lista abaixo com cada objetivo em card (badges de área, horizonte e qualidade SMART;
  ex.: "Razoável (2/4)") e opção de excluir.

**Recomendação exibida na tela (texto):** "Os objetivos devem ser poucos (máx. 4),
realísticos e desafiadores. Use os critérios SMART para garantir qualidade."

**Card "Critérios SMART" (manter — é bom):** é apenas um **quadro informativo** que
explica os critérios. As bolinhas ao lado são só marcadores visuais — **não é um
checklist interativo** (nada para marcar). Conteúdo exibido:

- **Específico** — descreva com mais detalhes o que exatamente quer alcançar (mín. 25
  caracteres).
- **Mensurável** — inclua um número, percentual, certificado ou conquista verificável na
  descrição.
- **Relevante** — selecione a categoria e explique por que o objetivo importa (mín. 15
  caracteres).
- **Temporal** — defina um horizonte de tempo (curto, médio ou longo prazo).

O selo de qualidade no card do objetivo (ex.: "Razoável (2/4)") é calculado
automaticamente a partir do conteúdo do objetivo, **não** desse quadro.

**Ajuste para o GB PDI — horizonte dentro do ciclo:** cada ciclo de PDI dura ~**1 ano**,
então o horizonte de tempo deve ficar **dentro desse limite**. No Meu PDI as faixas são
Curto (até 3 meses) / Médio (3 a 12 meses) / **Longo (acima de 1 ano)** — e "acima de
1 ano" **extrapola** o ciclo. **Decisão:** limitar as faixas ao ciclo de 1 ano (ex.:
Longo Prazo passa a ser "até 1 ano" / "próximos 12 meses", ou remover a faixa que
ultrapassa). Faixas exatas a confirmar.

## Plano de Ação (passo 4)

Mecânica reaproveitada (visual segue nosso DS). Traduz cada objetivo em **ações táticas**.
Texto de apoio: "Traduza seus objetivos em ações táticas. Defina os passos, os prazos e o
que será necessário. Sem um deadline, um objetivo é apenas um desejo."

Formulário "Adicionar nova ação tática":

- **Para qual objetivo?** — **listbox** com os **objetivos cadastrados no passo anterior**
  (o usuário escolhe a qual objetivo a ação pertence).
- **O que vou fazer? (Ação)** — texto.
- **Até quando? (Deadline)** — data (dd/mm/aaaa). Enfatizado como obrigatório pela
  mecânica ("sem deadline, é só um desejo").
- **Recursos necessários?** — texto livre (ex.: "R$ 500,00" ou "Ajuda do Gestor").
- Botão **Inserir Ação na Rota** (adiciona à lista de ações do objetivo).

Mapeia para a tabela `acoes` existente (`objetivo_id`, `titulo`, `due_date`, `detalhes`
para recursos). **Nota:** o deadline deve respeitar o ciclo de 1 ano (ver Objetivos).

## Campo de Forças (passo 5)

Mecânica reaproveitável (visual no nosso DS). Análise de **Lewin**: para cada objetivo,
o usuário lista **forças impulsoras** (ajudam a alcançar) e **forças restritivas**
(atrapalham), cada uma com uma **intensidade**. Mapeia para a tabela `forcas`
(`objetivo_id`, `tipo['impulsora'|'restritiva']`, `descricao`, `intensidade`).

**Como o Meu PDI usa isso (engenharia reversa — confirmado no bundle):** o Campo de Forças
**alimenta o "Saúde do PDI"** (o score de 80% visto no topo). O chunk `healthScore-*.js`
penaliza o score quando o usuário **não mapeia forças restritivas** (label "Nenhuma força
restritiva mapeada") e quando faltam **alianças** (as impulsoras aparecem como "Alianças")
e quando há **"ações sem recurso definido"**. Ou seja: mapear forças = PDI mais completo /
saudável, e isso vira um "Passo" (próxima ação sugerida) quando está vazio.

**Sugestão para o GB PDI (onde encaixar de forma útil):**
1. **Alimentar o score de Saúde do PDI** (como no Meu PDI): plano com forças mapeadas
   conta como mais completo; vazio gera um nudge de próximo passo.
2. **Transformar força restritiva em ação de mitigação** — a mais útil: cada restritiva
   pode gerar (opcionalmente) uma **ação no Plano de Ação** para neutralizá-la. Assim a
   força deixa de ser só diagnóstico e entra no fluxo de execução.
3. **Impulsora = recurso/aliança** — vincular impulsoras ao campo "Recursos necessários"
   das ações (ex.: "Ajuda do Gestor").
4. **Revisão de ciclo** — ao fechar o ciclo (~1 ano), revisitar quais restritivas foram
   superadas (entra no histórico `ciclos`/snapshot).

**Recomendação:** manter o Campo de Forças, mas com payoff contínuo — no mínimo (1) e (2).
Sem isso, vira exercício morto; com (2), passa a abastecer o plano de desenvolvimento.

## Revisão Final (passo 6)

Mecânica reaproveitável (visual no nosso DS). Mostra o resumo do PDI, o **"Saúde do PDI"**
(score), o **Radar de Hard Skills** (nível atual vs meta) e o card **"O que o seu Mentor
diria"** (pílulas de conselho). Mesma estrutura serve ao GB PDI.

**Decisão — botões de ação:** o Meu PDI oferece **Exportar PDF**, **Backup JSON** e
**Salvar Ciclo**. No GB PDI, **remover os três** e deixar **um único botão: "Concluir e
salvar este PDI"** — que apenas finaliza o planejamento e leva para a execução (sem
arquivar/resetar; sem export por enquanto). Fechar ciclo e export ficam para depois, fora
do fim do wizard (ver "Salvar Ciclo / Histórico de ciclos").

## Conselhos do "Mentor" — de onde vêm (resolvido por engenharia reversa)

Pergunta do usuário: cadastro ou IA? **Resposta: catálogo estático no cliente — NÃO é IA
e NÃO é servidor.** Evidência coletada no app do Meu PDI (inspeção dos bundles + rede):

- Os textos das pílulas (ex.: "A Técnica da Única Métrica", "Quando tudo for incerto…",
  "Capacidade de lidar com ambiguidade", "Prática…") estão **embutidos no chunk
  `App-DsN7Tg4L.js`**; o conteúdo de matriz/dicas por carreira × nível está em
  `matrizCompetencias-*.js` (`dica` ~23×, com `hardSkills`/`softSkills`/`expectativa`).
- Ao renderizar o dashboard com o card do Mentor, as **únicas** requisições de rede são
  **Google Analytics + ícone PWA** — nenhuma chamada a Gemini/Firebase AI/Firestore.
- Não há marcadores de chamada generativa (`generateContent`, `GenerativeModel`, `getAI`…)
  em nenhum chunk. (O pacote `@firebase/ai` aparece só no registro de componentes do
  Firebase, dormente.)
- **Mecânica:** o app seleciona as dicas do catálogo pelas **soft skills que o usuário
  marcou para melhorar** e exibe as correspondentes.

**Implicação para o GB PDI — opções:**
- **(A) Catálogo estático (como o Meu PDI) — recomendado para o v1.** É viável sim: é um
  conjunto finito e curado (algumas dezenas de dicas), tratado como dado de catálogo
  (nova tabela `dicas`/`conselhos` ligada a `competencia`/soft skill, editável no /admin).
  Custo = escrever o conteúdo uma vez. Sem backend, sem chave de API, funciona offline.
- **(B) IA em runtime (Gemini/Claude).** Mais personalizado, porém: nosso app é local-first
  e **sem login**, então embutir uma chave no cliente é inseguro — exigiria um pequeno
  backend ou a chave do próprio usuário, além de projetar os prompts. Fica para depois.
- **(C) Híbrido:** nascer com o catálogo semente (A) e, opcionalmente, enriquecer com IA
  mais tarde (B), sem bloquear o v1.

**Decisão sugerida:** começar com **(A)**. O "inviável" que você temia não se aplica — é
catálogo curado finito, no mesmo molde das certificações/trilhas que já semeamos.

## Salvar Ciclo / Histórico de ciclos (resolvido por engenharia reversa)

O botão **"Salvar Ciclo"** (função `salvarCiclo` no store `usePdiStore`) **fecha o ciclo
atual e inicia um novo**:

1. Monta um **snapshot** com `idCiclo` (timestamp) + `dataSalvamento` contendo: usuário,
   inventário de skills, objetivos, plano de ação, campo de forças, **scoreSaude**
   (recalculado no momento) e uma **retrospectiva**.
2. **Anexa o snapshot ao `historico`** (arquivo do ciclo).
3. **Reseta o estado atual**: `stepAtual`, `wizardConcluido`, `planoAcaoStatus`,
   `trilhaProgresso` — zera para o próximo ciclo.

Mapeia direto para a tabela `ciclos` (id, data_inicio/data_fim, score_saude,
snapshot_json).

**Confirmação do reset (código):** o estado inicial nasce todo vazio
(`objetivos:[]`, `planoDeAcao:[]`, `inventario:{hardSkills:[],softSkills:[]}`,
`campoDeForcas:{impulsionadoras:[],restritivas:[],aliancas:…}`) e
`resetAtual = () => ({ ...estadoInicial, stepAtual:1, wizardConcluido:false,
planoAcaoStatus:{}, trilhaProgresso:{} })`. Logo, **Salvar Ciclo arquiva o snapshot e
zera o PDI por completo** (começa em branco).

**Crítica de produto (levantada pelo usuário — procede):** encerrar o planejamento
arquivando e apagando tudo na última tela não faz sentido. A ideia de *fechar ciclo* é
válida (PDI é cíclico: planejar → executar → revisar → replanejar), mas o Meu PDI erra em
dois pontos: (1) surge como ação principal **logo após o wizard**, quando o plano ainda
não foi executado; (2) **reseta para vazio**, descartando a continuidade.

**Decisão para o GB PDI:**
- Separar **planejar** (wizard, 1× por ciclo) de **executar/acompanhar** (dashboard
  contínuo). A ação que encerra o wizard é "concluir e começar a executar" — **não**
  arquivar.
- **Fechar ciclo** = ação intencional e rara, no **fim do período**, com retrospectiva:
  snapshota em `ciclos` e **pré-popula o próximo ciclo com o estado atual** (objetivos e
  skills seguem como baseline; só o **progresso/status** zera). Nunca começar em branco.
- Confirmar explicitamente antes de fechar o ciclo.

## Diário (execução) — redesenho

**Como o Meu PDI faz (referência):** cabeçalho "Diário de Progresso — registre reflexões,
conquistas e aprendizagens ao longo do ciclo. **Mantido entre ciclos**." Uma entrada tem:
dropdown **"Relacionar a um objetivo (opcional)"** (vínculo **1×1**, único e opcional),
**texto puro** (textarea, Ctrl+Enter salva), data e botão Registrar. Entradas listadas
abaixo. (O diário **persiste entre ciclos**, diferente do reset do plano.)

**Modificações para o GB PDI:**

1. **Vínculo N:N (não 1×1):** uma entrada pode se relacionar a **0, 1 ou vários
   objetivos** do plano de desenvolvimento ("pode estar ou não vinculada").
2. **Layout:** **lista de objetivos à esquerda, cada um com checkbox** — o usuário marca
   a quais objetivos a entrada se refere. **À direita/centro, um editor de texto em
   Markdown** para escrever a entrada.
3. **Markdown consultável:** a entrada é salva em Markdown e pode ser **consultada
   depois** (histórico de entradas, renderizado).
4. **Destaque de objetivo negligenciado (pedido-chave):** para manter as ações sempre
   ligadas aos objetivos, um objetivo que passar **muito tempo sem nenhuma entrada
   associada** deve aparecer **destacado** na lista à esquerda (ex.: badge "sem registro
   há N dias" / cor de alerta), chamando atenção para retomá-lo.
   - Baseado na **data da última entrada** vinculada a cada objetivo.
   - **Em aberto:** o limiar de "muito tempo" (ex.: 14 ou 30 dias; talvez configurável).

**Impacto no esquema:** `diario` (id, data, `texto` em Markdown) + tabela de junção
**`diario_objetivos`** (diario_id, objetivo_id) para o N:N — substitui o atual
`diario.objetivo_id` único. O destaque usa `MAX(data)` das entradas por objetivo. Diário
**não** é resetado ao fechar ciclo (persiste entre ciclos).

## Demais módulos (Dashboard, Plano, Trilha, Evolução, Comparador, Currículo)

**Decisão:** por enquanto, manter como já estão no GB PDI **ou** inspirados no Meu PDI;
melhorias ficam para outro momento. **Requisito mínimo: coerência** com as decisões deste
documento. Ou seja, mesmo sem redesenho, estes módulos precisam refletir:

- **Modelo de competências por habilidades** + auto-avaliação em 4 níveis
  (Precisa agir / Pode mais / Atende / Muda o jogo). Radar/Evolução e Comparador usam
  esse modelo e os níveis da carreira.
- **Plano de desenvolvimento alimentado automaticamente** pelas habilidades em gap
  (as de "Precisa agir", e talvez "Pode mais" — a confirmar). O módulo **Plano** mostra
  esses itens junto com objetivos/ações.
- **Objetivos:** áreas **Funcional/Educacional**; **horizonte dentro do ciclo de 1 ano**.
- **Plano de Ação:** ação vinculada a um objetivo (listbox), deadline no ciclo, recursos;
  **força restritiva pode virar ação de mitigação**.
- **Campo de Forças** alimenta o **Saúde do PDI** (score); impulsora = recurso/aliança.
- **Ciclo:** concluir o wizard **não** arquiva; **fechar ciclo** é ação de fim de período
  que faz snapshot em `ciclos` e **preserva o estado como baseline** (não zera). O
  **Diário persiste entre ciclos**.
- **Diário:** vínculo **N:N** com objetivos, Markdown, destaque de objetivo negligenciado.
- **Conselhos/"Mentor":** catálogo estático no v1 (sem IA).
- **Dashboard:** tiles/score refletem os pontos acima (ações vencidas, trilha, saúde).

**Fora de escopo agora:** redesenho desses módulos. Só garantir que nada contradiga o
acima. Revisitar depois para melhorias.

## Sem recursos para headhunter (remoção transversal)

O GB PDI **não terá nada voltado a headhunters**. Remover, onde existir hoje (herdado do
original):

- O **checkbox "destacar/visível para headhunter"** nas skills (campo
  `user_hard_skills.visivel_headhunter`).
- **Sinais e dicas de headhunter** nas trilhas/catálogo
  (`trilha_templates.headhunter_signal` / `headhunter_dica`,
  `trilha_itens.headhunter_signal`) e qualquer UI que os exiba.
- Qualquer menção a "perfil público"/exposição para recrutadores.

Ao implementar as telas, tirar esses campos da UI e do esquema (ou ignorá-los). É um dos
pontos de coerência para os demais módulos.

## Fase de melhorias — UX/UI e biblioteca de componentes

**Diagnóstico UX/UI (atual):**
- **Bug — campos de busca não mostram os itens:** `CompetenciaPicker` retorna lista vazia
  com a busca em branco (`if (!q) return []`), então o usuário não vê as opções até
  digitar e não tem como saber o que escolher. Sem affordance de abrir/listar.
  (`MultiSelect` mostra tudo, mas sem aparência de combobox.) Afeta Matriz, Wizard,
  TrilhaTemplates, Certificações.
- **Controles artesanais** (`controls.tsx`): `<select>` nativo e inputs simples; sem
  popover/combobox/dialog/tooltip acessíveis; `cn` é um join simples (sem tailwind-merge).
- **Identidade muito parecida com o Meu PDI:** mesma paleta índigo+slate, cards
  arredondados, sidebar ícone+label, ícones lucide genéricos → precisa diferenciar.

**Decisão — biblioteca de componentes: `shadcn/ui` (Radix UI + cmdk).** Motivos: popular,
abrangente, **nativa de Tailwind** (combina com o nosso DS; somos donos do código dos
componentes, então tematizamos com nossos tokens slate/índigo em vez de importar outro
tema), compatível com **React 19 + Tailwind v4**, e já usa **lucide**. `cmdk` entrega o
combobox com busca que resolve o bug. `cn` passa a usar `clsx` + `tailwind-merge`.

**Primeiras entregas desta fase:**
1. ✅ **Combobox** (Radix Popover + cmdk) que **abre e lista os itens**, com busca e
   teclado — `src/components/ui/Combobox.tsx`; `CompetenciaPicker` reescrito sobre ele.
   `cn` agora usa `clsx` + `tailwind-merge`. (Deps: `@radix-ui/react-popover`, `cmdk`.)
2. ✅ **Ícones da navegação do app diversificados** (`AppLayout`): Dashboard=Gauge,
   Objetivos=Goal, Plano=ListTodo, Trilha=Route, Evolução=TrendingUp, Diário=NotebookPen,
   Comparador=Scale, Currículo=IdCard, Admin=SlidersHorizontal.
3. ✅ **MultiSelect → `MultiCombobox`** (`src/components/ui/MultiCombobox.tsx`; usado em
   Certificações) e **todos os `<select>` nativos → `Select` do Radix** (`controls.tsx`:
   `Select`/`SelectItem`/`SELECT_NONE`), migrados nas 9 telas (Matriz, Objetivos, Plano,
   Diário, Comparador, Perfil, Wizard, Competências, Templates). `MultiSelect` antigo
   removido. `tsc --noEmit` sem erros; verificado no navegador. (Dep: `@radix-ui/react-select`.)
4. **Diferenciação visual:** a paleta já difere do Meu PDI — o DS usa **roxo Boticário**
   (rampa `indigo`) + **magenta `accent`** (Manrope), enquanto o Meu PDI é azul. Com os
   ícones novos, a identidade já se afastou. **Refino de acento adiado** (usar mais o
   magenta em pontos-chave) para um próximo passo.

## Implementado — Fase 1 (modelo de habilidades) ✅

**Decisões travadas:**
- **Escopo:** habilidade = **carreira × nível × competência** (cada bullet de uma célula
  da matriz). **Origem:** os bullets já existentes em `src/data/sqlite/seed/raw/matriz.json`
  (derivados de `docs/leveling.md`) — não inventamos nada.
- **Escala (auto-avaliação):** 1–4 → **Precisa agir · Pode mais · Faz bonito · Muda o
  jogo** (`ESCALA_AUTOAVALIACAO` em `domain/catalog.ts`). "Esperado" = Faz bonito; 1–2 =
  gap que alimentará o plano (Fase 2).

**Entregue:**
- Tabela **`habilidades`** (id, area_id, nivel_id, competencia_id, texto, ordem);
  `SCHEMA_BASELINE` → 4; `CATALOG_SEED_VERSION` → 5.
- Domínio `Habilidade`; porta + impl SQLite (`listHabilidades`/`upsertHabilidade`/
  `deleteHabilidade`, counts, replaceAll).
- Seed: parser que divide os bullets em **233 habilidades** (lixo de OCR filtrado).
- Tela **Matriz = CRUD de habilidades** por carreira × nível, agrupadas por competência
  (adicionar/editar/excluir). Contador no /admin.
- Verificado no navegador: 233 habilidades, add persiste, `tsc` limpo, console sem erros.

## Implementado — Fases 2 e 3 (auto-avaliação + plano) ✅

- Tabela **`user_autoavaliacao`** (habilidade_id → nota 1–4, sem FK; `SCHEMA_BASELINE` → 5);
  domínio `UserAvaliacao`; repo `listAvaliacoes`/`setAvaliacao`; export/import incluídos.
- Tela **`/app/autoavaliacao`**: por carreira×nível do perfil, lista as habilidades
  agrupadas por competência; para cada uma, os 4 botões (Precisa agir/Pode mais/Faz
  bonito/Muda o jogo), salvando na hora. Resumo: avaliadas e nº de gaps.
- Tela **`/app/desenvolvimento`**: o plano = as habilidades em gap (nota 1–2), agrupadas
  por competência, com badge da nota.
- Navegação e rotas adicionadas. Verificado no navegador (marcar → gap → plano), `tsc`
  limpo, console sem erros.

## Implementado — Fase 4 (diário redesenhado) ✅

- Tabela N:N **`diario_habilidades`** (`SCHEMA_BASELINE` → 6); `DiarioEntry.habilidadeIds`;
  repo com join, insert transacional e delete; export/import incluídos.
- Markdown: `marked` + `dompurify` (`src/lib/markdown.ts`) + estilos `.markdown` no CSS.
- Tela **Diário** reescrita: à esquerda os itens do plano (gaps) com checkbox para
  vincular; à direita editor Markdown com **Pré-visualizar/Editar**; histórico com
  Markdown renderizado e tags dos itens vinculados. **Destaque de negligenciado**: item
  sem registro há ≥14 dias (ou nunca) aparece em âmbar com badge.
- Verificado no navegador: marcar item → escrever/pré-visualizar → registrar → aparece no
  histórico; badge de negligenciado some do item vinculado e permanece no não vinculado.
  `tsc` limpo, console sem erros.

## Implementado — Transversais (em andamento)

- ✅ **Headhunter removido por completo** (`SCHEMA_BASELINE` → 7): colunas
  `visivel_headhunter` (user_hard_skills), `headhunter_signal`/`headhunter_dica`
  (trilha_templates), `headhunter_signal` (trilha_itens); domínio, repositórios, seed e
  UI (Wizard, Trilha, Templates de trilha, Currículo). `tsc` limpo, verificado no
  navegador (colunas somem do schema e da tela; 26 templates reseeded).

- ✅ **Objetivos: só Funcional/Educacional** (removida a categoria "Pessoal" do tipo
  `ObjetivoCategoria` e da UI de Objetivos e Plano). Horizonte é por data (`prazo`), sem a
  faixa "acima de 1 ano" do Meu PDI — nada a corrigir.
- ✅ **Ciclo não-destrutivo:** o `fecharCiclo` (Evolução) já só cria um snapshot em
  `ciclos` (score + resumo) e **não apaga** dados do usuário — ao contrário do Meu PDI.

## Revisão geral ✅

- **Build de produção** (`npm run build` = `tsc -b` + vite + PWA) passa sem erros; SW
  gerado. `tsc` e lint sem erros (só warnings pré-existentes de padrão — `load()` em
  effect, fast-refresh — e avisos de tamanho de chunk).
- **Correções da revisão:** import `Star` órfão (Currículo), tipo do `NOTA_LABEL`
  (Desenvolvimento), `perfil` não usado (Diário).
- **Walkthrough das 10 telas** (Dashboard, Auto-avaliação, Desenvolvimento, Objetivos,
  Plano, Trilha, Evolução, Diário, Comparador, Currículo): todas renderizam, **zero erros
  de console**.
- **Coerência do Dashboard:** o score de **Saúde do PDI** e um tile passam a refletir a
  **auto-avaliação** (atende = nota ≥ 3 entra no score; tile "Auto-avaliação N/Total +
  gaps no plano" no lugar de "Competências"). `computeSnapshot` ganhou a dimensão
  `autoavaliacao` (opcional, não quebra o Evolução).

## Unificação do onboarding e migração das telas ✅

O modelo antigo de **hard/soft skills** (LevelSelect) foi retirado do fluxo do usuário; a
**auto-avaliação de habilidades** virou a única fonte de autoavaliação:

- **Componente compartilhado** `components/app/HabilidadesRating` (avaliação 1–4 por
  habilidade), usado pela página `/app/autoavaliacao` **e** pelo wizard.
- **Wizard unificado:** **Perfil → Auto-avaliação → Conclusão** (botão "Concluir e
  salvar"); removidos os passos de hard/soft skills.
- **Trilha:** gera a partir das **competências com gap** da auto-avaliação (não mais do
  gap hard skill nível atual × desejado).
- **Comparador:** habilidades esperadas do nível-alvo × quantas você **atende** (nota ≥ 3),
  por competência.
- **Evolução:** radar **média × esperado (3)** por competência + distribuição das notas +
  trend de ciclos (saúde já considera a auto-avaliação).
- **Currículo:** **Pontos fortes** = competências com "Muda o jogo"; **Competências** com
  "atende X/Y". 

As tabelas `user_hard_skills`/`user_soft_skills` continuam no esquema (dormentes, para
compat de export/import), mas nenhuma tela as popula ou exibe. Verificado no navegador:
todas as telas migradas renderizam com o novo modelo, build/lint limpos, console sem erros.

## Revisão interativa final (todas as telas, dados reais) ✅

Perfil Developer II com 10 habilidades avaliadas (5 gaps), 1 objetivo e 1 ação. Verificado
não só renderização, mas **interação**:
- **Trilha:** reconheceu 5 competências com gap; "Gerar trilha" montou 12 itens agrupados
  por tipo; marcar concluído persistiu.
- **Plano:** Kanban com a ação; mover pela seta mudou o status para "concluído" (persistiu);
  categoria só Funcional/Educacional.
- **Objetivos:** badge Educacional, campo de forças por objetivo; select de categoria com
  exatamente 2 opções (Educacional/Funcional).
- **Desenvolvimento:** os 5 gaps por competência com badge da nota.
- **Diário:** itens do plano (gaps) com "sem registro"; editor Markdown.
- **Comparador/Evolução/Currículo/Auto-avaliação/Wizard/Dashboard:** coerentes com o novo
  modelo. **Console sem erros** em toda a navegação; build e lint limpos.

## Correção do travamento "Carregando banco de dados…" + perda de dados ✅

**Causa real (diagnosticada):** não era o lock/OPFS — era o **estado do `DatabaseProvider`**.
O init do banco resolvia (`__pdiDbReady` resolvido, DB pronto), mas o `setStatus('ready')`
era engolido: o efeito fazia `await isDatabaseHeldByOtherTab()` antes do init e, sob o
re-run do StrictMode, o update de "ready" era descartado, deixando o UI preso em
"Carregando…".

Uma primeira tentativa (timeout + auto-retry + visibilitychange chamando `resetDatabase`)
**causou perda de dados**: as re-tentativas disparavam `resetDatabase` concorrentemente, e
um dispose durante um init concorrente reabria um DB vazio (re-rodava migrations/seed). Foi
revertida.

**Correção final (`DatabaseProvider.tsx`, `data/sqlite/index.ts`, `db.worker.ts`):**
- Efeito resolve direto de `initDatabase().then(ready).catch(error)` — o `ready` sempre é
  aplicado quando o init settla (sem o `await` sequencial que descartava o update).
- Tela "aberto em outra aba" só aparece se, após ~800ms, o init ainda não settlou **e**
  outra aba de fato tem o lock. `isDatabaseHeldByOtherTab` agora retorna `false` quando
  **nós** seguramos o lock (corrige o falso-positivo).
- **Sem `resetDatabase` em re-tentativa automática** (não há mais corrida → não há perda).
- `pagehide` libera o lock ao sair; `pageshow` recarrega ao voltar do bfcache; `installPool`
  com janela de retry maior (≈3,6s) absorve a troca de handles **sem nunca apagar dados**.

**Verificado:** cadeia de navegações hard (Plano → Evolução → Objetivos) sem travar, e os
dados (perfil, auto-avaliação, objetivo) **persistem** por toda a navegação. Fluxos
testados: editar objetivo, diário com vínculo + destaque de negligenciado, plano movendo
por todas as colunas, trilha gerada dos gaps. (Aba em background tem timers estrangulados
pelo navegador — artefato de teste; no uso real a navegação é client-side, sem re-init.)

## Verificação final completa (interativa, com evidência) ✅

- **Trilha (aba visível):** gerou 7 itens dos gaps; concluí 2 → progresso 2/7 (29%),
  persistido; aparecem em "Desenvolvimento concluído" no Currículo.
- **Ações (CRUD):** adicionar, editar título, mover por Pendente→Em andamento→Concluído e
  excluir — tudo persistiu.
- **Objetivos:** excluir → "Nenhum objetivo ainda"; editar título persistiu; categoria só
  Funcional/Educacional.
- **Diário — destaque de negligenciado:** vincular um item → "sem registro" caiu de 3 para
  2 (só o item vinculado perdeu o badge) e a entrada apareceu no histórico.
- **Multi-aba (prova):** com a aba A segurando o lock, a aba B mostrou corretamente "O GB
  PDI já está aberto em outra aba"; ao **fechar a aba A, a aba B recuperou sozinha** para o
  dashboard (sem clicar em "Tentar de novo"), com **todos os dados intactos** (Trilha 2/7,
  auto-avaliação 6/36, conquistas). Confirma: multi-aba correto + auto-recuperação + sem
  perda de dados.
- **Navegação prolongada (app + admin):** todas as rotas carregam (hard-nav recupera o
  "Carregando banco de dados…" em ~2s e então renderiza; navegação client-side é instantânea
  e nem re-inicializa o banco). **Console sem erros** em toda a sessão; build/tsc/lint limpos.

### Estado final
App completo e funcional: modelo de habilidades + auto-avaliação (1–4) → plano de
desenvolvimento → diário (N:N, Markdown, destaque de negligenciado); matriz como CRUD de
habilidades; **onboarding e todas as telas no modelo de habilidades**; biblioteca
shadcn/ui (combobox/select); ícones diferenciados; headhunter removido; objetivos
Funcional/Educacional; ciclo não-destrutivo. `SCHEMA_BASELINE = 7`.

## Impacto no esquema de dados (esboço, a confirmar)

Pré-publicação: schema é livre para refatorar (ver [[prepublicacao-dados-livres]]).

- **Nova tabela `habilidades`** (catálogo), ligada a `competencias` (e possivelmente à
  célula da matriz carreira × nível). Campos prováveis: `id`, `competencia_id`,
  `nome/texto`, `nivel_expertise`, `ordem`. **Em aberto:** a lista de habilidades é
  por `competencia` (global) ou por `carreira × nível × competencia` (varia por nível)?
- O `matriz_competencias.nivel_esperado` provavelmente é **substituído** pelo conjunto
  de habilidades esperadas (com seu nível de expertise) — ou o nível esperado passa a
  ser derivado das habilidades. **A confirmar.**
- **Auto-avaliação do usuário:** tabela ligando `perfil` × `habilidade` →
  `atende | nao_atende` (talvez `nao_avaliada`). Substitui/estende as atuais
  `user_hard_skills` / `user_soft_skills`.
- **Plano de desenvolvimento:** itens gerados a partir das habilidades "não atende".
  Decidir se reusa `objetivos`/`acoes` existentes ou se há uma tabela
  `plano_itens` dedicada (habilidade_id → status).
- **Diário:** vínculo N:N entre `diario` (registro/ação) e itens do plano
  (`diario_plano_itens` ou similar). Hoje `diario` só tem `objetivo_id` opcional.

## Perguntas em aberto (resolver navegando o app de referência)

1. "Nível de especialidade" = os níveis da carreira (Developer I–III, Dev Specialist
   I–III)? Ou é outra dimensão?
2. A lista de habilidades muda conforme o nível, ou é fixa por competência e só o
   nível de expertise/expectativa muda?
3. Escala do "nível de expertise" (ex.: 1–6 como os níveis? básico/intermediário/
   avançado? numérica?).
4. Auto-avaliação é binária (atende / não atende) ou tem gradação?
5. O "plano de desenvolvimento" é uma tela nova ou os `objetivos`/`acoes` atuais?
6. Como o app de referência apresenta tudo isso (telas, ordem, vocabulário)?

## Fora de escopo por enquanto

Nenhuma alteração de código até alinharmos a UX. Este documento só registra a
intenção e as decisões pendentes.
