---
name: PromptDesk UI Design Brief
description: "Orientação visual e funcional para desenhar a interface do PromptDesk."
intended_use: "Arquivo de planejamento para time de Product Design/UI"
source_context: "PLANO.md"
---

# PromptDesk - UI Design Brief

## 1. Contexto do Produto

PromptDesk é um app web local para gerenciar fontes persistentes de contexto e configuração do Codex.

O produto deve permitir visualizar, filtrar, abrir no VS Code, versionar, comparar, restaurar e excluir itens como:

- `AGENTS.md`
- skills
- agents
- plugins
- configs
- memories
- automations
- sessions
- activity/history

O PromptDesk não edita conteúdo diretamente dentro do app. A edição acontece no VS Code, e o backend observa alterações reais no disco para manter histórico local em SQLite.

Essa decisão deve aparecer no design: o app é um cockpit de inspeção, organização, histórico e ações seguras, não um editor completo.

## 2. Direção Visual

A interface deve parecer uma ferramenta séria de desenvolvimento: limpa, silenciosa, precisa e funcional.

A identidade visual deve ficar próxima da experiência do Codex App: técnica, minimalista, escura por padrão, com superfícies neutras, controles precisos, baixo ruído visual e foco em estado operacional.

O design deve priorizar:

- clareza
- leitura rápida
- foco no conteúdo
- baixa distração visual
- sensação de workspace técnico
- confiabilidade para lidar com arquivos locais
- distinção clara entre itens editáveis e read-only

Evitar qualquer linguagem visual promocional, decorativa ou de landing page.

O design deve ser compatível com a stack planejada: React, shadcn/ui e Tailwind. Sempre que possível, usar padrões equivalentes a componentes shadcn/ui existentes, como dialogs, tabs, sheets/drawers, dropdown menus, tooltips, tables, scroll areas, forms, switches, badges e buttons.

## 3. Princípios de Design

### Minimalismo funcional

A UI deve usar poucos recursos visuais. O layout, a tipografia, os espaçamentos, as bordas e os estados devem carregar a maior parte da hierarquia.

Evitar:

- gradientes decorativos
- sombras fortes
- glassmorphism
- ilustrações decorativas
- excesso de cores
- cards chamativos
- hero sections
- elementos visuais sem função operacional

### Interface de trabalho

O produto deve parecer um ambiente de trabalho, não uma página institucional.

Priorizar padrões como:

- topbar persistente
- sidebar esquerda com busca e filtros de escopo
- área principal com abas e lista de itens
- painel de detalhe para metadata, preview, histórico e ações
- settings modal ou drawer
- dialogs de confirmação para restore, delete e MCP inspection
- listas densas, tabelas simples e visualizações textuais seguras

### Densidade controlada

A interface pode ser compacta, mas nunca apertada.

O usuário deve conseguir escanear rapidamente:

- em qual aba está
- quais escopos estão filtrando a tela
- qual item está selecionado
- se o item é editável ou read-only
- origem do item: Global, projeto ou plugin
- path relativo e path completo
- estado Git do projeto
- última alteração e status do item
- quais ações são permitidas
- o que exige confirmação ou atenção

## 4. Estrutura Principal

O app deve ser uma tela única, otimizada para desktop.

### Topbar

Deve conter:

- nome do app: PromptDesk
- alternância dark/light
- seletor de idioma:
  - Português (Brasil) / `pt-BR`, idioma padrão no primeiro uso
  - English (United States) / `en-US`
  - Español (España) / `es-ES`
- botão de Settings
- status do backend/watcher

O status do backend/watcher deve ser discreto, mas fácil de reconhecer quando houver erro ou desconexão.

Quando houver erro, desconexão, watcher pausado ou reindexação, a topbar deve deixar claro se os dados exibidos estão vivos, atrasados ou parcialmente indisponíveis.

### Sidebar esquerda

Função:

- busca global estilo VS Code por nome e conteúdo
- filtro combinável de escopo
- lista de projetos cadastrados
- visão compacta de branch e status Git
- entrada para adicionar, gerenciar ou remover referências de projetos

Conteúdo esperado:

- busca global no topo da sidebar
- opções de escopo:
  - Global
  - cada projeto cadastrado
  - selecionar todos os projetos
  - limpar seleção
- contador de itens para a aba ativa em cada escopo
- projeto com nome amigável, branch atual e status Git compacto
- rodapé com adicionar projeto e gerenciar projetos

Projetos são filtros/contexto, não uma aba principal. Remover um projeto no app significa remover apenas a referência cadastrada, sem apagar ou mover a pasta real.

Características:

- largura sugerida entre 280px e 340px
- lista compacta
- item ativo bem marcado
- divisória vertical sutil
- metadados discretos, mas legíveis

### Área principal

Função:

- abas principais
- lista da aba ativa
- seleção do item atual
- leitura rápida de metadata e status

Abas previstas:

1. AGENTS
2. Skills
3. Agents
4. Plugins
5. Configs
6. Memories
7. Automations
8. Sessions
9. Activity
10. All

A aba All deve mostrar todos os tipos em uma lista única. Nessa aba, o tipo do item deve aparecer como coluna principal.

Nas demais abas, o tipo do item deve ficar nos metadados e ser acessível por uma ação de informação ou área equivalente, sem ocupar uma coluna principal.

Não deve existir aba principal de MCP. MCP servers aparecem dentro da aba Configs, porque são derivados de `config.toml`.

Não deve existir seletor ou alternância de perfis na V1. Perfis são funcionalidade de V2.

Requisitos específicos por aba:

- AGENTS: precisa diferenciar `AGENTS.md` global, de projeto e aninhados por path relativo.
- Skills: deve mostrar skills globais, de projeto e vindas de plugins; skills de plugin precisam de badge `source: plugin`, nome do plugin e estado read-only.
- Agents: deve listar agents YAML derivados das pastas de skills e deixar clara a origem.
- Plugins: deve mostrar plugins instalados/cacheados com origem/path, versão, skills fornecidas, agents fornecidos e scripts/assets relevantes; plugins são read-only por padrão.
- Configs: deve listar `config.toml` global e por projeto, extrair MCP servers como sublista/seção e oferecer `Discover tools` por server e `Discover all tools`.
- Memories: deve permitir ações de arquivo apenas quando o item for textual seguro e editável, com aviso forte para exclusão.
- Automations: deve mostrar prompt/config, editabilidade, histórico e ações permitidas.
- Sessions: deve ser read-only na V1, com conversa em JSON estruturado e filtros rápidos por `active`, `archived` e `all`.
- Activity: deve separar `history.jsonl` read-only de eventos do próprio PromptDesk, como saves detectados, restores, deletes, MCP inspections e projetos adicionados/removidos.
- All: deve unificar todos os tipos e priorizar a coluna de tipo.

### Lista da aba ativa

O padrão recomendado é uma lista densa por linhas, mais próxima de uma lista de músicas/playlists do que de uma tabela administrativa tradicional. A linha deve ser escaneável, com hierarquia clara, ações compactas e metadados secundários recolhidos em ícones, tooltips ou painel de detalhe.

Cada item deve mostrar:

- nome
- origem: Global, projeto ou plugin
- path relativo
- path completo
- estado read-only/editável
- última alteração
- hash ou status

Na linha principal, priorizar somente o que ajuda decisão rápida: nome, origem, path relativo, editabilidade/read-only, última alteração e status. Dados menos frequentes, como hash completo, tamanho, path absoluto completo, datas detalhadas e origem técnica, podem ficar em um ícone de informação `i`, tooltip, menu contextual ou painel de detalhe.

O path completo deve estar acessível sem ocupar espaço excessivo na lista. Padrão recomendado:

- path relativo visível na linha
- ícone de pasta com tooltip exibindo o path completo
- clique no ícone de pasta executa Reveal in Finder ou abre a pasta do item
- ação de copiar path completo disponível no detalhe ou menu contextual

Para `AGENTS.md` aninhados, o path relativo deve ter destaque suficiente para evitar ambiguidade.

Exemplo de informação a representar:

```txt
AGENTS.md
origin: project
repo: prompt-desk
relative path: packages/api/AGENTS.md
full path: /Users/.../prompt-desk/packages/api/AGENTS.md
```

### Painel de detalhe

Função:

- metadata do item
- preview textual seguro
- histórico de versões
- ações permitidas
- avisos sobre read-only, sensibilidade ou bloqueios

Ações previstas:

- Open in VS Code, apenas para itens editáveis
- Compare with current
- Open historical version
- Restore version
- Apply as current, apenas no fluxo de versão histórica temporária
- Delete
- Reveal in Finder, opcional

Itens read-only podem ser visualizados no app, mas não devem parecer editáveis. Eles não devem expor ações como Open in VS Code, Restore, Apply ou Delete de arquivo real.

A ação Delete só aparece para arquivos reais editáveis ou para dados internos do PromptDesk, como cache de inspeção MCP. Quando a ação afetar apenas cache, lixeira interna ou referência cadastrada, o texto e o dialog devem dizer isso explicitamente.

O painel lateral direito deve ter largura sugerida entre 380px e 560px e pode ser colapsável.

## 5. Hierarquia de Informação

O design deve separar claramente:

- navegação e filtros
- lista de resultados
- detalhe do item selecionado
- ações de arquivo
- ações destrutivas
- avisos e confirmações
- histórico de versões
- dados internos do app

Estados e labels importantes:

- Global
- Project
- Plugin
- Editable
- Read-only
- Deleted
- Active
- Archived
- Clean
- Dirty
- Detached
- Not Git
- Unknown

Não depender apenas de cor para esses estados. Usar combinações de texto, iconografia, peso visual, chips e agrupamento.

## 6. Paleta Visual

O dark mode é o tema padrão. O light mode também deve estar previsto.

### Tema dark

Usar uma paleta majoritariamente neutra:

- fundo principal escuro
- superfícies um pouco mais claras que o fundo
- bordas discretas
- texto principal com alto contraste
- texto secundário com contraste suficiente
- estados ativos com destaque sutil

Evitar que o tema dark vire um bloco uniforme. A separação entre sidebar, lista e detalhe precisa ser visível sem excesso de contraste.

### Tema light

Usar:

- fundo principal claro
- superfícies brancas ou quase brancas
- cinza claro para bordas e separadores
- cinza médio para metadados
- texto escuro para conteúdo principal

### Cores semânticas

Usar cores apenas para estado:

- verde: sucesso, sincronizado, concluído
- amarelo ou laranja: atenção, pendente, conflito ou revisão necessária
- vermelho: erro, conflito crítico ou ação destrutiva
- azul ou ciano discreto: informação, link ou foco técnico, se necessário
- cinza: neutro, rascunho, inativo, aguardando

Não usar cores decorativas sem função clara.

## 7. Tipografia

A hierarquia deve vir principalmente da tipografia e do layout.

### Fonte sugerida

Sans-serif limpa e neutra:

- Inter
- system-ui
- Open Sans

Para código, paths e conteúdo técnico:

- JetBrains Mono
- SF Mono
- Consolas

### Escala sugerida

Usar poucos tamanhos:

- 11px a 12px: labels, metadados, tags e timestamps
- 13px a 14px: listas, navegação, botões compactos e textos auxiliares
- 15px a 16px: corpo principal e preview textual
- 18px a 20px: títulos de painel ou seção
- 22px a 24px: títulos de telas ou dialogs importantes

Evitar títulos grandes. PromptDesk é uma ferramenta operacional, não uma página editorial.

### Regras

- usar peso 600 para títulos, estados ativos e informações importantes
- usar peso 400 para texto comum
- evitar uppercase em textos longos
- não usar cinza claro para informações essenciais
- manter paths legíveis e truncados de forma previsível
- preservar leitura de JSON, Markdown, TOML, YAML e JSONL

## 8. Espaçamento

Usar uma escala simples e consistente:

- 4px
- 8px
- 12px
- 16px
- 24px
- 32px

Aplicação:

- toolbars: espaçamento compacto
- listas: padding vertical de 8px a 12px
- linhas densas: altura consistente e previsível
- painéis: padding interno de 16px a 24px
- áreas principais: padding de 20px a 32px
- grupos relacionados devem ficar visualmente próximos
- grupos diferentes devem ser separados por espaço, borda ou título

## 9. Bordas, Radius e Superfícies

### Bordas

Usar bordas sutis para separar áreas.

Padrão:

- 1px sólido
- baixo contraste
- sem sombra pesada

### Radius

Usar cantos moderados:

- 4px: elementos pequenos, chips compactos e itens de lista
- 6px: botões, inputs e controles
- 8px: cards, menus, dialogs e painéis destacados
- 999px: apenas tags/status chips quando fizer sentido

Evitar botão pill como padrão universal. Em uma ferramenta técnica, controles compactos com radius moderado tendem a parecer mais precisos.

### Superfícies

A interface deve ser majoritariamente plana.

Usar:

- fundos neutros
- painéis persistentes
- áreas sutis para agrupamento
- separadores discretos

Evitar:

- sombras decorativas
- profundidade artificial
- excesso de camadas visuais
- cards dentro de cards

## 10. Navegação e Estados

### Item de navegação

Cada item deve ter:

- título
- estado ativo
- metadado opcional
- status opcional
- hover claro
- foco visível

### Estado ativo

O item ativo deve ser identificado por pelo menos dois sinais:

- peso de fonte maior
- fundo sutil
- indicador lateral
- texto mais forte
- ícone ou chip de estado

Não depender apenas de cor.

### Contadores

Contadores de itens devem ser discretos e legíveis. Eles precisam refletir a aba ativa e o escopo selecionado.

## 11. Botões e Ações

### Botão primário

Uso:

- confirmar
- aplicar restauração
- executar inspeção MCP confirmada
- adicionar projeto
- salvar configuração

Visual:

- alto contraste
- altura sugerida entre 32px e 40px
- radius de 6px a 8px
- texto claro e direto

### Botão secundário

Uso:

- cancelar
- abrir detalhes
- visualizar
- revelar no Finder
- abrir versão histórica

Visual:

- fundo neutro
- borda sutil
- texto de bom contraste

### Botão fantasma ou icon button

Uso:

- toolbars
- menus
- ações de baixa prioridade
- alternância de tema
- settings
- colapsar painel
- informação do item
- revelar pasta/path

Visual:

- fundo transparente
- hover com superfície sutil
- foco visível
- tooltip quando a ação não for óbvia

Ícones podem substituir texto em ações recorrentes e óbvias, desde que tenham tooltip e foco acessível. Exemplos recomendados: informação do item, copiar path, revelar no Finder, abrir no VS Code, comparar, abrir versão histórica, colapsar painel, tema e settings.

### Ações destrutivas

Uso:

- Delete
- descartar temporário
- limpar cache
- excluir definitivamente da lixeira

Regras:

- vermelho apenas quando necessário
- usar dialog normal de confirmação para ações irreversíveis ou sensíveis
- deixar claro se a ação afeta arquivo real, lixeira interna, cache ou apenas referência do app

## 12. Inputs, Busca e Filtros

Inputs devem ser simples, claros e legíveis.

Visual:

- superfície neutra
- borda sutil
- radius de 6px a 8px
- altura mínima de 32px a 40px
- label visível ou acessível
- foco com borda ou outline evidente

### Busca global

A busca da sidebar deve parecer rápida e técnica, inspirada em busca de editor/IDE.

Deve suportar visualmente:

- busca por nome de arquivo
- busca por conteúdo textual
- resultados filtrados por aba e escopo
- estado vazio
- estado de indexação ou reindexação
- indicação de que a busca usa índice local e respeita os filtros atuais

O design não deve sugerir limite artificial de tamanho por arquivo para busca, preview, versionamento, sessions ou activity. Para arquivos textuais seguros grandes, a UI deve usar paginação, virtualização, progresso ou carregamento assíncrono, mantendo a expectativa de conteúdo completo.

### Filtros de escopo

Os filtros devem permitir combinações como:

- Global
- Projeto A
- Projeto A + Projeto B
- Global + Projeto A
- Todos os projetos
- Global + Todos os projetos

O design precisa deixar combinações claras sem ocupar espaço demais.

## 13. Listas, Tabelas e Metadata

### Listas

Devem ser compactas e fáceis de escanear.

Usar uma lista rica com linhas estáveis e densas, evitando aparência de planilha pesada. A composição pode combinar título, metadados curtos, chips e icon buttons alinhados à direita. Tabelas ficam reservadas para dados realmente comparáveis ou seções internas, como MCP tools, versões históricas e lixeira.

Cada item pode conter:

- título
- path relativo
- origem
- status
- timestamp
- ação contextual
- ícone de informação para metadata secundária
- ícone de pasta para revelar ou abrir a pasta do item

### Tabelas

Usar quando houver dados estruturados ou comparáveis.

Regras:

- cabeçalho claro
- linhas com separadores sutis
- hover discreto
- alinhamento consistente
- timestamps e números bem alinhados
- textos longos com truncamento controlado
- path completo acessível por tooltip, expand, copy ou área de detalhe

### Metadata

Metadata deve ser organizada em grupos curtos:

- origem
- path
- tipo
- editabilidade
- hash
- tamanho
- datas
- projeto/plugin relacionado
- status Git, quando aplicável

## 14. Preview, Código e Conteúdo Técnico

O app deve exibir preview textual seguro, não um editor completo.

Conteúdos previstos:

- Markdown
- TOML
- YAML
- JSON
- JSONL
- texto simples
- sessions em JSON estruturado read-only
- activity/history read-only

Visual:

- fonte monospace quando o conteúdo for técnico
- padding confortável
- rolagem vertical e horizontal quando necessário
- realce de sintaxe se fizer sentido
- botão de copiar quando fizer sentido
- aviso claro quando preview for sanitizado, bloqueado por segurança ou ainda estiver carregando

Markdown preview deve ser sanitizado e não deve parecer uma área de edição.

## 15. Diff, Histórico e Restauração

O plano do produto usa o VS Code como editor externo e diff externo.

O design deve prever:

- lista de versões históricas
- comparação com versão atual como ação
- abertura de versão histórica
- restore com confirmação
- origem da versão:
  - initial-scan
  - external-edit
  - restore
  - delete
  - temp-edit-apply
- timestamps claros
- indicação de versão atual
- conflitos de restauração
- estado de versão histórica temporária aberta no VS Code
- ação `Apply as current` depois que uma versão histórica temporária for editada
- ação para descartar uma versão histórica temporária
- opção de excluir versão do histórico com confirmação

Não desenhar uma experiência complexa de diff in-app como requisito central da V1. Se houver visualização de diff no mock, ela deve ser tratada como apoio visual ou futuro, não como substituto do fluxo via VS Code.

Ao restaurar ou aplicar uma versão histórica, o dialog deve oferecer:

- restaurar diretamente após confirmação
- abrir diff antes de restaurar
- cancelar
- checkbox `Não me pergunte novamente`, com indicação de que a decisão poderá ser alterada em Settings

Quando uma versão histórica for aberta no VS Code, o design deve comunicar que aquele arquivo é temporário e que editar/salvar ali não altera o arquivo real até o usuário escolher `Apply as current`.

## 16. Read-only, Segurança e Confirmações

Segurança local é parte central da experiência.

O design deve comunicar claramente:

- arquivos sensíveis bloqueados
- itens read-only
- plugins/cache read-only por padrão
- sessions e activity read-only inicialmente
- `auth.json` nunca editável
- arquivos binários, secretos ou caches desconhecidos bloqueados
- MCP inspection sempre manual, confirmada e com timeout
- env, headers e tokens de MCP sempre redigidos quando aparecerem na UI
- servidores MCP desabilitados por config não executáveis

A editabilidade deve ser comunicada como uma matriz de permissão, não apenas como estilo visual:

- editável: arquivo textual seguro em localização controlada pelo usuário/projeto, com ações de VS Code, histórico, restore e delete permitido
- read-only: arquivo real seguro para inspeção, mas sem Open in VS Code, Restore, Apply ou Delete de arquivo real
- bloqueado/sensível: item que pode aparecer apenas com metadata mínima ou aviso, sem preview de conteúdo quando houver risco
- dado interno do PromptDesk: cache, inspeção ou evento derivado, com ações próprias e textos que não confundam com arquivo real

Confirmações devem existir para:

- restore
- delete
- MCP inspection
- excluir definitivamente da lixeira
- limpar caches ou dados derivados
- restaurar item da lixeira quando houver conflito no destino original

O dialog de MCP inspection deve usar tom de aviso forte e explicar que descobrir tools pode iniciar o comando MCP configurado em disco, executar código local, acessar arquivos, usar credenciais ou acessar a rede.

Mensagens de confirmação devem explicar:

- o que será afetado
- se a ação mexe em arquivo real ou dado interno do PromptDesk
- se existe possibilidade de restauração
- se haverá snapshot antes de sobrescrever ou apagar
- qual é o próximo passo

Fluxos de lixeira e restauração devem prever:

- item excluído de arquivo real editável movido para a lixeira interna do PromptDesk
- item marcado como `deleted` na lista/detalhe
- restauração para o path original quando livre
- conflito quando o path original já existir
- opções de comparar, sobrescrever com snapshot, restaurar com novo nome, escolher outro destino ou cancelar
- diretório original ausente, com opções de recriar diretório, escolher outro destino ou cancelar
- exclusão definitiva da lixeira visualmente separada e confirmada

## 17. Settings

Settings fica acessível pela topbar.

Deve incluir:

- tema: dark/light
- idioma: `pt-BR` como padrão no primeiro uso, com opções `en-US` e `es-ES`
- caminho resolvido do Codex Home
- ação para alterar Codex Home e reescanear
- caminho dos dados internos do PromptDesk, equivalente ao PromptDesk Home
- estado de resolução do Codex Home: preferência salva, `CODEX_HOME`, fallback `~/.codex` ou caminho inválido
- retenção de versões, default 10 por item versionado
- decisões salvas pelo usuário, incluindo "não me pergunte novamente"
- lixeira interna do app
- projetos cadastrados
- preferências
- índice de busca
- cache de MCP tools
- reindexar busca
- limpar cache de inspeções MCP
- limpar eventos antigos do app

Settings deve ser denso, organizado e seguro. Ações destrutivas ou irreversíveis precisam ficar visualmente separadas das configurações comuns.

No primeiro carregamento, se o Codex Home não existir ou não puder ser lido, o app deve mostrar um estado acionável pedindo para o usuário escolher manualmente a pasta Codex global.

## 18. Estados de Interface

Toda tela ou componente importante deve prever:

- vazio
- carregando
- erro
- sucesso
- desabilitado
- ativo
- selecionado
- hover
- foco
- conflito
- atenção
- read-only
- editável
- backend desconectado
- watcher pausado ou com erro
- busca sem resultados
- índice sendo reconstruído
- Codex Home inválido ou não configurado
- projeto não encontrado ou sem permissão de leitura
- item removido/deleted
- restauração com conflito
- versão histórica temporária aberta, alterada, aplicada ou descartada
- MCP server detectado, inspecionado, desabilitado, com erro ou aguardando inspeção

### Empty state

Deve ser curto e útil.

Estrutura sugerida:

- título curto
- explicação de uma frase
- uma ação recomendada

Exemplos de empty states:

- nenhum projeto cadastrado
- nenhum item encontrado na aba ativa
- busca sem resultados
- nenhuma versão histórica disponível
- lixeira vazia
- nenhuma session arquivada

### Erro

Erro deve explicar:

- o que aconteceu
- por que importa
- o que fazer agora

Evitar mensagens genéricas como "algo deu errado".

## 19. Movimento e Transições

Movimento deve ser rápido e funcional.

Usar transições sutis para:

- hover
- foco
- abertura de menu
- fechamento de painel
- mudança de estado
- seleção de item

Duração sugerida:

- 120ms a 180ms

Evitar:

- animações decorativas
- delays perceptíveis
- movimentos exagerados
- efeitos elásticos

## 20. Responsividade

PromptDesk deve ser desenhado desktop-first.

### Desktop

Priorizar layout multipainel:

- topbar
- sidebar esquerda
- lista/área principal
- painel lateral de detalhe opcional

### Tablet

Permitir:

- sidebar colapsável
- painel lateral abaixo ou em aba
- ações principais sempre acessíveis
- boa leitura de paths e metadata

### Mobile

Mobile deve existir como fallback funcional, não como experiência principal de produtividade.

Usar:

- layout em coluna única
- navegação em drawer
- detalhes como página ou aba separada
- listas compactas
- scroll horizontal para código, JSON e paths longos

## 21. Acessibilidade Visual

O design deve considerar:

- contraste adequado em dark e light mode
- foco visível
- labels claros
- áreas clicáveis confortáveis
- estados não baseados apenas em cor
- leitura fácil em zoom
- ícones com texto ou tooltip quando a ação não for óbvia
- navegação por teclado em listas, abas, dialogs e menus
- mensagens de erro associadas aos campos ou ações correspondentes

## 22. Tom da Interface

A linguagem da UI deve ser:

- direta
- técnica
- calma
- objetiva
- útil

Preferir verbos claros:

- Open
- Compare
- Restore
- Delete
- Reveal
- Inspect
- Reindex
- Add project
- Manage projects
- Clear cache
- Cancel

Evitar labels vagos:

- OK
- Submit
- Continue
- Click here
- Manage, quando o objeto não estiver claro

Como o app tem i18n, os layouts devem acomodar labels em `en-US`, `pt-BR` e `es-ES` sem quebrar.

## 23. Entregáveis Esperados do Design

O time de design deve cobrir pelo menos:

- tela principal em dark mode
- tela principal em light mode
- topbar com status normal e erro
- sidebar com busca, filtros e projetos
- abas principais
- lista de itens com estados editável/read-only/deleted
- aba All com tipo como coluna principal
- aba Configs com seção de MCP servers e estados de inspeção
- aba Plugins com plugins read-only e skills/agents fornecidos
- aba Sessions com JSON estruturado e filtros `active`, `archived` e `all`
- aba Activity com trilha operacional e `history.jsonl`
- detalhe de item editável
- detalhe de item read-only
- detalhe de item deleted
- preview textual seguro
- histórico de versões
- fluxo de versão histórica temporária aberta no VS Code
- dialogs de confirmação para restore/delete/MCP inspection
- dialogs de conflito de restauração da lixeira
- Settings
- lixeira interna
- Codex Home inválido ou ausente no primeiro carregamento
- estado de nenhum projeto cadastrado
- busca sem resultados
- loading/indexação
- erro de backend/watcher
- responsivo desktop, tablet e mobile fallback

## 24. Referência de Sensação Final

A interface final deve transmitir:

- produto técnico
- ambiente de trabalho
- foco em execução
- baixa distração
- precisão
- confiabilidade
- velocidade
- clareza
- segurança ao lidar com arquivos locais

O resultado ideal deve parecer um workspace moderno para inspeção, revisão e manutenção de contexto/configuração do Codex: minimalista, organizado, legível e extremamente funcional.

## 25. Checklist para o Designer

Antes de fechar a proposta visual, validar:

- A interface parece uma ferramenta de trabalho, não uma landing page?
- A estrutura de tela única está clara?
- Topbar, sidebar, lista e painel de detalhe têm funções distintas?
- A hierarquia visual funciona sem depender de cores fortes?
- O dark mode parece padrão e bem resolvido?
- O light mode mantém a mesma clareza operacional?
- Os filtros de escopo combináveis são compreensíveis?
- Os contadores por aba ativa estão legíveis?
- Projetos mostram nome amigável, branch e status Git sem poluir a sidebar?
- A lista permite escanear nome, origem, path, status e última alteração rapidamente?
- A lista parece uma lista operacional densa, não uma tabela administrativa pesada?
- Metadados secundários ficam acessíveis via ícone de informação, tooltip, menu ou painel de detalhe?
- O ícone de pasta mostra o path completo no hover e revela/abre a pasta no clique?
- A aba All destaca o tipo do item como coluna principal?
- Nas outras abas, o tipo aparece apenas como metadata ou informação secundária?
- A aba Configs mostra MCP servers sem sugerir uma aba MCP separada?
- A inspeção MCP deixa claro o risco de executar comandos locais?
- Sessions têm filtros `active`, `archived` e `all`?
- Activity está separada de Sessions e parece uma trilha auditável?
- Perfis ficaram fora da V1?
- Itens read-only são claramente diferentes de itens editáveis?
- Ações indisponíveis não parecem clicáveis?
- Ações destrutivas têm hierarquia e confirmação adequadas?
- A lixeira deixa clara a diferença entre arquivo real, cache interno e referência de projeto?
- Os conflitos de restauração têm opções compreensíveis?
- Preview textual, JSON e Markdown são legíveis e seguros?
- Histórico de versões e restore são fáceis de entender?
- O fluxo de abrir versão histórica temporária no VS Code não parece editar o arquivo real diretamente?
- Settings separa configurações comuns de ações de manutenção e risco?
- Settings mostra Codex Home, PromptDesk Home, decisões salvas e retenção de versões com clareza?
- Estados vazio, erro, loading, conflito e backend desconectado foram desenhados?
- O layout funciona em desktop, tablet e mobile fallback?
- O visual continua limpo com muito conteúdo?
- O design evita decoração desnecessária?
- A UI parece calma, precisa, confiável e técnica?
