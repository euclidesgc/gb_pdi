# Pesquisa de mercado e brag document para o app de PDI

*Pesquisa feita em 31/10/2026. Quase tudo o que se diz sobre concorrentes vem de material dos próprios fornecedores (sites, central de ajuda, blogs) ou de agregadores de avaliações. Os links estão no fim de cada parte.*

---

## Parte 1: Mercado

### 1.1 Panorama dos produtos

| Produto | Foco | O que tem de relevante para nós |
|---|---|---|
| **Lattice Grow** | RH/empresa | PDI com duas partes: *Career Vision* (longo prazo) e *Growth Areas* (curto prazo). Career tracks e matriz de competências por cargo e nível. O PDI conversa com 1:1s, feedback e avaliações. Um agente de IA sugere growth areas a partir do desempenho, das metas e do feedback. |
| **Culture Amp Develop** | RH/empresa | PDI, biblioteca de competências, career paths, metas de crescimento rastreáveis e recursos de aprendizagem. O *Skills Coach* entrega microexercícios por Slack ou e-mail, com repetição espaçada. Tem também um AI Coach. |
| **15Five Career Hub** | Gestor + colaborador | Clareza de papel, descoberta de forças e visão de carreira, tudo pensado para conversas de carreira com o gestor. |
| **Leapsome** | RH/empresa | Framework de competências gerado por IA. Trilhas de aprendizagem geradas por IA a partir de documentos. Depois de uma avaliação, sugere automaticamente até 3 trilhas com base no feedback recebido, e essas sugestões ficam privadas para o colaborador. |
| **BetterUp** | Coaching | Coaching humano com matching de coach, mais coaching por IA. |
| **Qulture.Rocks** | RH BR | Avaliação de desempenho, 1:1, PDI com plano de ação, OKRs e reconhecimento. |
| **Feedz** | RH BR | PDI, 1:1, feedbacks, OKRs, humor da equipe e gamificação. Usuários reclamam que o PDI não deixa anexar os recursos necessários para evoluir. |
| **Gupy (Pulses)** | RH BR | Trilhas de treinamento com prazos e pré-requisitos, ordenadas pelo prazo e pelo percentual de conclusão. A Gupy comprou a Pulses e com isso entrou em gestão de performance. Agentes de IA. |
| **Sólides** | RH BR | Avaliação de desempenho, feedbacks automáticos e PDI integrados. Distribui uma planilha de PDI com acompanhamento anual. |
| **Workday Career Hub** | Empresa | Perfil de skills (recomenda 10–20 skills e 5–10 interesses) usado para recomendar vagas, mentores, aprendizagem e projetos por ML. |
| **Degreed** | LXP | Perfil de skills validado por avaliações e sincronizado com o HRIS. |
| **Pluralsight Skill IQ / Role IQ** | Avaliação técnica | Teste adaptativo (cerca de 20 questões, nota de 0 a 300: Novice, Proficient, Expert) que compara o resultado com pares. O Role IQ agrega vários Skill IQs por papel. |
| **Progression (progressionapp.com / progression.fyi)** | Frameworks de carreira | Biblioteca pública de frameworks. *Check-ins* em três etapas que comparam as skills da pessoa com as exigidas pela posição. *Actions* com prazo e tags de skill. *Wins* e *Feedback* guardados para consulta em momentos de carreira. |
| **Levels.fyi / ladders públicas** | Referência | Ladder "Standard" que compara níveis entre empresas. As ladders são definidas por escopo, autonomia e impacto, não por anos de experiência. |
| **Bragdoc.ai** | Individual (dev) | CLI que extrai conquistas de commits, PRs e issues (via `gh` ou git local) para montar o brag document automaticamente. Diz-se privacy-first. |
| **Tability** | OKRs | Check-in semanal com três itens (métrica, confiança, comentário). Puxa dados de outras ferramentas. Agente de IA que resume os check-ins. **Servidor MCP** para Claude e ChatGPT. |

### 1.2 Onde estamos alinhados com o mercado

- **Matriz de carreira por área e nível com auto-avaliação**, no mesmo padrão de Lattice (career tracks e competency matrix), Culture Amp, Progression e Leapsome. O **comparador de níveis** faz o papel do "ver as expectativas do nível atual e do próximo" que o Lattice oferece.
- **Objetivos com prazo ligados a ações** equivalem a Growth Areas (Lattice), Growth goals (Culture Amp) e Actions com prazo e tags (Progression). O **campo de forças de Lewin** e a **justificativa** são diferenciais: nenhum concorrente tem algo parecido.
- **Trilha de aprendizagem a partir de templates**, como as trilhas de Gupy e Leapsome e os learning resources do Culture Amp. Isso também resolve a principal reclamação dos usuários do Feedz (não conseguir pôr recursos no PDI).
- **Diário de evolução vinculado** cumpre o papel de *Wins* (Progression) e é a matéria-prima de um brag document.
- **Gamificação** existe no Feedz e na maioria das plataformas brasileiras.
- **Servidor MCP** nos coloca à frente: entre os produtos pesquisados, só a Tability tem um.
- **Export/import LGPD e currículo** ajudam a portabilidade, que importa para o uso individual (o PDI pertence à pessoa, não à empresa). As plataformas de RH não oferecem isso.

### 1.3 O que falta, comparando com o mercado

1. **Uma rotina de check-in.** Tability faz check-in semanal (progresso, confiança, comentário) e Progression faz check-ins periódicos contra a matriz. Nós temos as peças (diário, kanban, saúde do PDI), mas falta um ritual guiado.
2. **Feedback recebido e visão do gestor.** Lattice, 15Five, Qulture, Feedz e Sólides giram em torno de 1:1, feedback e avaliação. Para nós, o mínimo útil é **registrar feedbacks recebidos** e **compartilhar uma visão (somente leitura) com o gestor**.
3. **Recomendações a partir dos gaps.** Leapsome sugere trilhas a partir do feedback, Lattice sugere growth areas e Workday recomenda aprendizagem. Nós já temos os dados (gap entre a nota atual e a esperada no nível alvo), mas não geramos a recomendação.
4. **Evidência objetiva de skill.** Pluralsight e Degreed validam skills com testes, e nossa auto-avaliação é só declarativa. Uma alternativa barata é **anexar evidências** (links de PR, certificados, entradas do diário) a cada nota.
5. **Brag document e captura de impacto.** Bragdoc.ai e os Wins do Progression existem para isso. Temos todos os dados, mas nenhum relatório "o que eu fiz no período".
6. **Lembretes e microhábito.** O Culture Amp Skills Coach usa repetição espaçada e entrega por Slack ou e-mail. Nós não temos nudges.
7. **Visão de longo prazo (Career Vision).** O Lattice separa visão de carreira de metas de curto prazo, e o 15Five tem visão de carreira. Nossos objetivos são de curto e médio prazo.

### 1.4 Features sugeridas (alto impacto e baixo esforço primeiro)

| # | Feature | Impacto | Esforço | Descrição |
|---|---|---|---|---|
| 1 | **Gerador de brag document** | Alto | Baixo | Relatório por período montado com dados que já existem (ações concluídas, trilha, diário, conquistas, objetivos). Sai como Markdown copiável e impressão/PDF. Detalhe na Parte 2. |
| 2 | **Campo de impacto nas ações e no diário** | Alto | Baixo | Ao concluir uma ação ou escrever uma entrada, oferecer campos opcionais "Impacto" (métrica antes → depois) e "Link de evidência" (PR, doc, dashboard). Isso aumenta muito a qualidade do brag doc. |
| 3 | **Registro de feedbacks recebidos** | Alto | Baixo | Entidade simples (data, de quem, contexto, texto, skill e objetivo relacionados). Alimenta o brag doc e a reavaliação de skills. |
| 4 | **Check-in periódico guiado** | Alto | Baixo/Médio | Ritual semanal ou quinzenal: o que avancei, nível de confiança (1–5) por objetivo, bloqueios, e uma entrada de diário gerada no fim. Mesmo modelo do check-in da Tability. |
| 5 | **Recomendações por gap** | Alto | Médio | Para cada competência em que a nota está abaixo da esperada no nível alvo, sugerir objetivo, ação e itens de trilha a partir dos templates. É o equivalente sem IA do Leapsome e do Lattice AI. |
| 6 | **Prompts MCP prontos** | Alto | Baixo | Expor no servidor MCP ferramentas e prompts como `gerar_brag_doc(periodo)`, `sugerir_acoes_para_gap` e `registrar_vitoria`, para que o agente puxe vitórias de commits e PRs (como o Bragdoc.ai) para dentro do diário. |
| 7 | **Visão para o gestor via link somente leitura** | Médio/Alto | Médio | Link temporário e revogável (ou export) com objetivos, progresso, brag doc e pauta para o 1:1. Atende ao uso eventual com o gestor sem virar uma plataforma de RH. |
| 8 | **Pauta de 1:1 gerada** | Médio | Baixo | Lista de ações atrasadas, objetivos com baixa confiança, vitórias recentes e pedidos de ajuda (forças restritivas do campo de forças). |
| 9 | **Evidências por habilidade** | Médio | Baixo | Na auto-avaliação, mostrar e permitir vincular entradas do diário, certificações e ações como prova de cada nota. Reduz o viés da auto-avaliação. |
| 10 | **Histórico da auto-avaliação por ciclo** | Médio | Baixo | Gráfico de evolução das notas por competência entre ciclos (um radar antes e depois). Também entra no brag doc. |
| 11 | **Lembretes e nudges** | Médio | Médio | E-mail ou notificação para prazo próximo, diário parado há X dias e check-in pendente. A repetição espaçada do Culture Amp é a referência. |
| 12 | **Visão de carreira (longo prazo)** | Médio | Baixo | Seção "onde quero estar em 2–5 anos" (cargo ou nível alvo, trilha IC ou gestão) que orienta os objetivos. Equivale ao Career Vision do Lattice. |
| 13 | **Matrizes públicas importáveis** | Médio | Médio | Importar frameworks públicos (os da biblioteca progression.fyi, ou ladders como a "Standard" da levels.fyi) para o catálogo do admin. |
| 14 | **Pacote de promoção** | Médio | Médio | Brag doc mais o gap para o próximo nível mais as evidências por competência, no formato de "promotion doc" (o GitLab usa templates de promoção). |
| 15 | **Integração com GitHub/GitLab** | Médio | Alto | Importar PRs mesclados e issues como candidatos a entrada de diário ou vitória (o que o Bragdoc.ai faz). Pode ser feito de graça pelo MCP antes de existir uma integração nativa. |

**Fontes da Parte 1:**
- Lattice: [IDP overview](https://help.lattice.com/en-us/articles/16541562-individual-development-plans-overview), [Grow](https://lattice.com/products/grow), [Lançamento dos IDPs](https://lattice.com/blog/lattice-launches-individual-development-plans)
- Culture Amp: [Develop](https://www.cultureamp.com/company/announcements/culture-amp-launches-develop), [Skills Coach](https://www.cultureamp.com/products/skills-coach/), [Employee development plans](https://www.cultureamp.com/platform/perform/employee-development-plans)
- 15Five: [Career Hub for employees](https://success.15five.com/hc/en-us/articles/4407140756763)
- Leapsome: [Competency framework](https://www.leapsome.com/product/competency-framework), [Learning](https://leapsome.com/product/learning), [AI in Leapsome](https://help.leapsome.com/hc/en-us/articles/38176995079709-AI-in-Leapsome-Overview-Settings)
- BetterUp: [Press release de features](https://www.betterup.com/press/betterup-unveils-new-features-to-its-leadership-development-platform-to-drive-improved-business-outcomes-and-employee-transformation), [Listagem Degreed](https://integrations.degreed.com/listings/betterup)
- Qulture.Rocks: [B2B Stack](https://www.b2bstack.com.br/product/qulturerocks)
- Feedz: [Avaliações no B2B Stack](https://www.b2bstack.com.br/product/feedz/avaliacoes), [Pulses vs Feedz](https://www.b2bstack.com.br/compare/pulses-vs-feedz)
- Gupy/Pulses: [Como montar uma trilha](https://www.gupy.io/blog/como-montar-uma-trilha-de-desenvolvimento), [Gupy quer medir performance](https://www.baguete.com.br/noticias/gupy-quer-medir-performance), [Software de avaliação de desempenho](https://gupy.io/blog/software-de-avaliacao-de-desempenho)
- Sólides: [Desenvolvimento e performance](https://solides.com.br/solucoes/desenvolvimento-e-performance/), [Como fazer PDI com a Sólides](https://solides.com.br/blog/recursos/lp-bofu-como-fazer-pdi-com-a-solides/)
- Workday: [Career Hub (admin guide)](https://doc.workday.com/admin-guide/en-us/human-capital-management/talent/career-hub/yse1588712338246.html), [FAQ](https://doc.workday.com/admin-guide/en-us/human-capital-management/talent/career-hub/vpd1643316793271.html)
- Pluralsight: [Skill IQ](https://www.pluralsight.com/product/skill-iq), [Role IQ](https://www.pluralsight.com/product/role-iq)
- Progression: [Site](https://progressionapp.com), [Introducing Check-ins](https://progressionapp.com/blog/introducing-checkins), [Caso Simpli.fi](https://www.progressionapp.com/customers/simplifi/)
- Levels.fyi: [Levels, Ladders and Titles](https://www.levels.fyi/blog/what-are-career-levels-ladders.html); [Every Public Engineering Career Ladder (swyx)](https://swyx.io/career-ladders)
- Bragdoc.ai: [npm @bragdoc/cli](https://www.npmjs.com/package/@bragdoc/cli), [README do CLI](https://cdn.jsdelivr.net/npm/@bragdoc/cli@1.5.1/README.md), [PeerPush](https://peerpush.com/p/bragdoc)
- Tability: [Check-ins best practices](https://guides.tability.io/docs/tutorials/track-progress-with-check-ins/check-ins-best-practices), [AI-mode / MCP](https://www.tability.io/odt/articles/new-ai-mode-chat-to-your-okrs), [AI OKR Coach](https://blog.tability.io/new-ai-powered-okr-coach)
- *Não encontrei página própria do careerladders.io. A referência de ladders públicas que uso acima é a progression.fyi.*

---

## Parte 2: Brag document

### 2.1 O que é

O brag document ("documento de conquistas") é um registro **contínuo** do que você fez no trabalho, escrito por você e com foco no **impacto**. O conceito ficou conhecido com o texto de Julia Evans, *"Get your work recognized: write a brag document"*. O argumento central é que ninguém (nem você, nem o seu gestor) lembra de tudo o que você fez em um ano, e por isso o registro precisa ser escrito *ao longo do tempo* e compartilhado com o gestor e os pares antes das avaliações.

Pontos-chave da Julia Evans:
- **Seções do template dela:** Goals for this year / next year, Projects, Collaboration & mentorship, Design & documentation, Company building, What you learned, Outside of work, além de prompts para quando faltar ideia (por exemplo, elogios recebidos).
- **Explicar o impacto**, não apenas o que foi entregue, e voltar depois para registrar resultados que só aparecem meses mais tarde.
- **Trabalho "difuso"** (mentoria, code review, melhorar on-call) também conta: descreva o objetivo, o que você fez e os efeitos indiretos.
- **Ser preciso:** sem exagerar e sem diminuir.
- **Tamanho:** pode ser longo (ela fala em 5–10 páginas ou mais por ano), com gráficos e capturas de tela.
- **Periodicidade:** quinzenal é mais fácil do que tentar lembrar tudo no fim do semestre.
- **Uso:** compartilhar com o gestor (facilita a avaliação e o pedido de promoção, e ajuda gestores novos) e usar para refletir sobre temas recorrentes.

**GitLab e outros.** Não encontrei no handbook do GitLab uma página chamada "brag document". O GitLab usa conceitos próximos: o **Individual Growth Plan (IGP)**, a **career matrix** por nível e **templates de documento de promoção** que descrevem evidências contra os critérios do próximo nível. A HackerOne publicou um texto de engenharia no mesmo espírito da Julia Evans (lista de conquistas e metas futuras, usada em 1:1s e avaliações, e também útil contra a síndrome do impostor). Guias mais recentes de brag doc para engenheiros recomendam:
- log semanal bruto, consolidado por trimestre e por ano em seções temáticas;
- formato **STAR** (Situação, Tarefa, Ação, Resultado);
- métricas **com linha de base** ("p95 de 800 ms → 200 ms", e não "melhorei 75%");
- abrir cada item pelo resultado, não pela atividade;
- **nunca inventar números**.

### 2.2 Melhor formato e layout (recomendação)

- **Dois níveis de documento:**
  1. **Log** (bruto, rápido): entradas curtas com data, o que foi feito, link de evidência e impacto, escritas semanal ou quinzenalmente. No app, esse papel já é do **diário** e das **ações concluídas**.
  2. **Brag doc consolidado** (por período: trimestre, semestre, ciclo ou ano): organizado por temas, com 3–5 destaques por seção.
- **Formato de cada item, "O quê → Como → Impacto"** (STAR compactado):
  `**[Título orientado a resultado]** — *Contexto/problema* · *O que eu fiz (meu papel)* · *Impacto (métrica antes → depois, quem se beneficiou)* · [evidência](link)`
- **Nível de detalhe:** 1 a 3 linhas por item no corpo e detalhes em links. Destaques no topo (top 3–5 do período) e o restante agrupado por seção.
- **Métricas de impacto típicas em engenharia:** latência e performance, custo de infraestrutura, incidentes e MTTR, cobertura de testes e bugs escapados, lead time e frequência de deploy (DORA), conversão e receita, tempo economizado por outras pessoas, adoção (usuários e times), pessoas mentoradas e contratadas, documentos e RFCs adotados.
- **Periodicidade:** registro semanal ou quinzenal (diário e check-in) e consolidação trimestral e no fim do ciclo, antes da avaliação ou do pedido de promoção.
- **Linguagem:** primeira pessoa, verbos de ação, deixando claro o seu papel quando o trabalho foi em equipe ("liderei", "co-desenhei", "revisei").

### 2.3 Modelo em Markdown (pronto para usar)

```markdown
# Brag Document — {{Nome}}
**Cargo/nível:** {{Área}} · {{Nível atual}} → alvo: {{Nível alvo}}
**Período:** {{dd/mm/aaaa}} a {{dd/mm/aaaa}}  ·  **Ciclo:** {{nome do ciclo}}
**Gestor(a):** {{nome}}  ·  **Gerado em:** {{data}}

---

## 1. Resumo do período (TL;DR)
- {{1–3 frases: o tema do período e o principal impacto}}

### Top destaques
1. **{{Título orientado a resultado}}** — {{impacto com métrica antes → depois}}. [evidência]({{link}})
2. **{{…}}** — {{…}}
3. **{{…}}** — {{…}}

## 2. Objetivos do período
| Objetivo | Tipo | Prazo | Status | Resultado / evidência |
|---|---|---|---|---|
| {{objetivo}} | {{educacional/funcional}} | {{data}} | {{atingido / em andamento / replanejado}} | {{o que mudou}} |

## 3. Entregas e projetos
### {{Projeto/entrega}}
- **Contexto:** {{problema ou oportunidade}}
- **Meu papel / o que fiz:** {{ações concretas}}
- **Impacto:** {{métrica antes → depois; quem se beneficiou}}
- **Evidências:** {{links de PR, doc, dashboard}}
- **Habilidades exercitadas:** {{competências da matriz}}

## 4. Colaboração, mentoria e liderança
- {{mentorias, pairing, code reviews relevantes, onboarding, ajuda a outros times}}

## 5. Design, documentação e qualidade
- {{RFCs/design docs escritos ou revisados, docs que resolveram problemas, melhorias de testes/observabilidade/on-call}}

## 6. Aprendizado e crescimento
| Item | Tipo | Concluído em | O que apliquei |
|---|---|---|---|
| {{curso/leitura/prática/certificação}} | {{tipo}} | {{data}} | {{aplicação prática}} |

### Evolução de competências (auto-avaliação 1–4)
| Competência | Início do período | Fim do período | Esperado no nível alvo |
|---|---|---|---|
| {{competência}} | {{n}} | {{n}} | {{n}} |

## 7. Reconhecimentos e feedbacks recebidos
> "{{citação do feedback}}" — {{pessoa, contexto, data}}

- **Conquistas no app:** {{lista}}

## 8. Contribuições para a empresa e a comunidade
- {{recrutamento/entrevistas, processos, palestras internas, open source, posts, eventos}}

## 9. Reflexão
- **Do que mais me orgulho:** {{…}}
- **O que faria diferente:** {{…}}
- **Quero fazer mais / menos de:** {{…}}

## 10. Próximos passos
- **Objetivos para o próximo período:** {{…}}
- **Onde preciso de apoio do gestor:** {{…}}
- **Gaps para o próximo nível:** {{competências com nota < esperada}}
```

### 2.4 De onde o app tira cada seção automaticamente

Filtro por período: `data_inicio` e `data_fim` (presets: último mês, trimestre, semestre, ciclo atual, ano, personalizado), aplicado à data de conclusão ou de criação de cada item.

| Seção do brag doc | Fonte no app | Regra de montagem |
|---|---|---|
| Cabeçalho (cargo, nível, alvo, ciclo) | Onboarding (área/nível), **Ciclos**, comparador de níveis | Nível atual e nível alvo do ciclo selecionado. |
| 1. Resumo / Top destaques | **Diário** (entradas marcadas como destaque ou com impacto preenchido), ações concluídas com impacto | Ordena por destaque manual e depois por existência de métrica. O usuário escolhe de 3 a 5 (ou um agente MCP sugere). |
| 2. Objetivos do período | **Objetivos** (prazo, tipo, justificativa, status) | Objetivos atingidos no período, mais os ativos com prazo no período. Resultado = última entrada de diário vinculada. |
| 3. Entregas e projetos | **Plano de ação (kanban)**: ações com status concluído e data de conclusão no período | Agrupa por objetivo vinculado. Contexto = justificativa do objetivo. Impacto e evidência vêm do campo novo (feature #2) ou do diário vinculado. Habilidades = competências ligadas. |
| 4. Colaboração e mentoria | Diário com tag/categoria "colaboração" ou "mentoria"; soft skills do inventário | Exige uma tag no diário (categoria simples). Sem tag, a seção fica com placeholder. |
| 5. Design, docs e qualidade | Diário e ações com tag "doc", "design" ou "qualidade" | Mesma regra de tag. |
| 6. Aprendizado | **Trilha de aprendizagem** (itens concluídos no período: cursos, leituras, práticas) e **certificações** | Tabela com data. "O que apliquei" vem do diário vinculado ao item da trilha. |
| 6. Evolução de competências | **Auto-avaliação** (notas 1–4) e **matriz** do nível alvo | Compara a nota no início com a do fim do período (precisa de histórico, feature #10). Destaca notas 3–4 como forças e notas abaixo do esperado como gaps. |
| 7. Reconhecimentos e feedbacks | **Feedbacks** (feature #3) e **conquistas** desbloqueadas no período | Citações com autor e data, mais a lista de conquistas. |
| 8. Empresa e comunidade | Diário com tag "comunidade"/"recrutamento"; **currículo** (palestras, publicações) | Itens do período. |
| 9. Reflexão | Campo livre (ou o último check-in do período) | Sempre editável pelo usuário. Nunca é gerado sem revisão. |
| 10. Próximos passos | Objetivos ativos e planejados; **campo de forças** (forças restritivas = onde preciso de apoio); gaps da matriz | Montagem automática. |
| Saúde do PDI (opcional, como anexo) | **Dashboard** | Indicadores do período (ações no prazo, % da trilha, frequência do diário). |

**Regras importantes:**
- **Não inventar métricas.** Se o campo de impacto estiver vazio, mostrar um placeholder ("{{adicione o impacto}}") em vez de texto gerado. Vale também para a geração via MCP.
- Cada item deve trazer um link de volta para a entidade de origem (ação, entrada, objetivo), para facilitar a edição.
- Seções vazias ficam ocultas na impressão e aparecem como dica no editor.

### 2.5 Formato de saída recomendado

1. **Tela de prévia** com filtro de período (presets e intervalo livre) e checkboxes de seções e itens, para o usuário tirar o que não quer mostrar.
2. **Markdown copiável** (botão "Copiar" e download `.md`): portátil, cola em Google Docs, Notion, Confluence, GitHub/GitLab ou num e-mail para o gestor, e já se encaixa no Markdown do diário.
3. **Impressão/PDF pelo navegador** (`window.print()` com CSS `@media print`): zero dependência no servidor, com layout limpo (sem nav, quebras de página por seção, links visíveis).
4. **Via MCP:** ferramenta `gerar_brag_doc({inicio, fim, secoes})` que devolve o Markdown, para um agente refinar a redação (STAR) sem alterar números.
5. **(Depois)** link somente leitura para o gestor e snapshot salvo por ciclo, para comparar ciclos.

**Fontes da Parte 2:**
- Julia Evans: [Get your work recognized: write a brag document](https://jvns.ca/blog/brag-documents/)
- HackerOne: [Why I Keep a Brag Document](https://www.hackerone.com/engineering/brag-document)
- GitLab: [Career Development for ICs (IGP)](https://handbook.gitlab.com/handbook/people-group/learning-and-development/career-development/ic-development), [Professional Development: Create (templates de promoção)](https://handbook.gitlab.com/handbook/engineering/development/dev/create/engineers/professional-development), [Career matrix: Backend](https://handbook.gitlab.com/handbook/engineering/careers/matrix/development/dev/backend/)
- Guias de brag doc para engenheiros: [Ship Value: The Brag Doc](https://shipvalue.substack.com/p/the-brag-doc), [Three documents effective engineers should have](https://shipvalue.substack.com/p/three-documents-effective-engineers), [HackMD: Why every developer needs a brag doc](https://hackmd.io/blog/2024/06/24/brag-documents), [AlgoDaily: Brag sheets for software engineers](https://algodaily.com/lessons/brag-sheets-for-software-engineers), [ClickUp: Brag document templates](https://clickup.com/blog/brag-document-templates/), [Brag sheet skill (não inventar métricas)](https://mcpservers.org/hi/agent-skills/github/brag-sheet)
- Bragdoc.ai: [README do CLI](https://cdn.jsdelivr.net/npm/@bragdoc/cli@1.5.1/README.md)

---

## Parte 3: O que entrou no app (31/10/2026)

| Pedido | Como ficou |
|---|---|
| Prazos claros no painel | Seção **Prazos e prioridades** no dashboard: "Seu próximo passo", resumo por urgência (atrasados, hoje, 7 dias, 30 dias), linha do tempo agrupada por urgência com cor e selo em cada item, e "Pontos de atenção". O menu mostra um selo vermelho em Plano e Objetivos quando há prazo atrasado ou vencendo hoje. |
| Urgência por cor | Atrasado (vermelho), hoje (laranja), 1–3 dias (âmbar), até 7 dias (amarelo), até 30 dias (azul), depois disso (cinza). As mesmas cores aparecem nos cartões do Plano e nos objetivos. |
| Ação depois do prazo do objetivo | Pode salvar, mas o formulário mostra um aviso discreto com o atalho "Usar a data do objetivo". O cartão da ação e o objetivo ganham um ícone de alerta, e o dashboard lista o caso em "Pontos de atenção". |
| Próximo passo e prioridades | O prazo mais urgente vem primeiro. Sem prazos próximos, o app sugere a ação em andamento, criar objetivos ou ações, escrever no diário ou o próximo item da trilha. No Plano, cada coluna vem ordenada pelo prazo. |
| Diário com data | A data sugerida é hoje (com atalhos "Hoje" e "Ontem" e um campo de data). As entradas de um mesmo dia ficam agrupadas ("Hoje", "Ontem", dia da semana ou data), com o botão "Adicionar neste dia". Há edição, exclusão com confirmação, estrela de destaque, busca, filtro de destaques e modelos de texto (vitória, aprendizado, bloqueio, feedback e resumo da semana). |
| Brag document | Nova tela **Brag document**: período (presets ou intervalo livre), escolha de seções, edição em Markdown com prévia, lacunas `{{…}}` destacadas, "Copiar Markdown", "Baixar .md" e "Imprimir / PDF". O texto sai das ações concluídas (agora com data de conclusão), da trilha, do diário (destaques, evidências e feedbacks), da auto-avaliação, das conquistas e do campo de forças. Pelo MCP, existem as ferramentas `gerar_brag_doc` e `ver_prazos`. |
| Editor Markdown | O mesmo editor do Faz AI (barra de formatação, Escrever/Visualizar, modo expandido lado a lado, atalhos Ctrl+B/I/K, Ctrl+Enter para enviar e Tab para recuar), com o visual do GB PDI. É usado no diário, nos detalhes das ações e no brag document. |
| Formulários mais fáceis | Exemplos clicáveis e dicas em objetivos (atalhos de prazo de +3, +6 e +12 meses), ações e propósito (wizard e perfil). |
| Trilhas e cursos grátis | 60 itens novos de trilha (cursos, leituras, práticas, projetos e mentorias gratuitos, de 4 a 7 por competência) e 8 certificações gratuitas. Eles entram no catálogo sem apagar as edições do admin. A trilha agora distribui os itens entre as lacunas (até 4 por lacuna, alternando teoria e prática). |

### Próximas features sugeridas (ainda não feitas)

Pela tabela 1.4, as próximas em custo e benefício são:

1. o campo **Impacto/Evidência** nas ações;
2. o **registro de feedbacks** como entidade própria;
3. o **check-in semanal guiado**;
4. as **recomendações por lacuna**, que sugerem objetivo, ação e trilha;
5. a **pauta de 1:1** gerada;
6. os **lembretes** por e-mail de prazos e de diário parado.
