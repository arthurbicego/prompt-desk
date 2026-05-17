# PromptDesk - Plano do Projeto

## Objetivo

Criar um app web local para gerenciar fontes persistentes de contexto e configuração do Codex. O app deve permitir visualizar, filtrar, abrir no VS Code, versionar, comparar, restaurar e excluir itens como `AGENTS.md`, skills, agents, plugins, configs, memories, automations, sessions e activity/history.

O app não edita conteúdo diretamente. A edição acontece no VS Code, e o backend observa alterações reais no disco para manter histórico em SQLite.

## Stack

- Frontend: React + Vite + TypeScript
- UI: shadcn/ui + Tailwind
- i18n: i18next + react-i18next
- Backend: Node.js + Express
- Banco local: SQLite
- Busca local: SQLite FTS5 para índice de nomes e conteúdo textual
- Validação: Zod
- Watcher de arquivos: chokidar
- Eventos vivos para UI: Server-Sent Events (SSE)
- Editor externo: VS Code via CLI `code`
- Diff externo: VS Code via `code --diff`
- Formatos lidos: texto, Markdown, TOML, YAML, JSON e JSONL

## Decisões Fechadas Para V1

A V1 deve entregar 100% das funcionalidades descritas neste plano. A implementação pode ser feita em fatias verticais incrementais, mas o critério de pronto da V1 é o plano completo funcionando.

### Caminhos Base

O PromptDesk não deve guardar seus dados internos dentro de uma pasta oculta começando com ponto.

Local padrão dos dados do app no macOS:

```txt
~/Library/Application Support/PromptDesk
```

Override opcional:

```txt
PROMPT_DESK_HOME=/absolute/path
```

Estrutura interna:

```txt
PromptDesk/
  data/
    promptdesk.sqlite
  trash/
    items/<trash-id>/file
    items/<trash-id>/metadata.json
  temp/
    versions/<temp-id>/<filename>
    diffs/<temp-id>/<filename>
  logs/
    promptdesk.log
```

O `metadata.json` da lixeira deve armazenar path original, hash, tamanho, tipo do item, origem, timestamps, modo de restauração e dados suficientes para recuperação mesmo quando houver conflito de nome no destino original.

### Codex Home

Resolver a pasta global do Codex nesta ordem:

1. preferência salva no PromptDesk, se configurada pelo usuário
2. variável de ambiente `CODEX_HOME`, se existir e apontar para diretório legível
3. fallback `~/.codex`

O caminho resolvido deve aparecer em Settings, com ação para alterar manualmente e reescanear. A documentação atual do Codex define `CODEX_HOME` como local do estado local e `~/.codex` como padrão.

### Escopo Funcional

MCP inspection entra na V1. Sessions entram na V1 em visualização JSON/read-only. Perfis continuam fora da V1 conforme seção própria.

## UI Geral

O app será uma tela única.

### Topbar

- Nome do app: PromptDesk
- Alternância dark/light
- Seletor de idioma ao lado do dark/light:
  - English (United States) / `en-US`
  - Português (Brasil) / `pt-BR`
  - Español (España) / `es-ES`
- Botão de settings do app
- Status do backend/watcher

### Sidebar esquerda

- Busca global estilo VS Code por nome de arquivo e conteúdo dos arquivos
- Filtro de escopo com seleção combinável:
  - Global
  - cada projeto cadastrado
  - atalho para selecionar todos os projetos
  - atalho para limpar seleção
  - combinações como `Global + Projeto A`, `Projeto A + Projeto B`, `Todos os projetos` ou `Global + Todos os projetos`
- Cada opção do filtro deve mostrar o contador de itens para a aba ativa
- Cada projeto no filtro deve mostrar nome amigável, branch atual e status Git em formato compacto
- Rodapé da sidebar:
  - botão para adicionar projeto
  - ação para gerenciar/remover projetos
  - remover projeto significa remover apenas a referência do app

### Abas principais

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

A aba All deve mostrar todos os itens juntos em uma lista única. Nessa aba, o tipo do item aparece como coluna principal.

### Lista da aba ativa

Cada item deve mostrar:

- nome
- origem: Global, projeto ou plugin
- path relativo
- path completo
- estado read-only/editável
- última alteração
- hash/status

O tipo do item deve aparecer como coluna principal apenas na aba All. Nas demais abas, o tipo fica nos metadados do item, acessível por um botão de informação. Tipos previstos: AGENTS, Skill, Agent, Plugin, Config, Memory, Automation, Session e Activity.

Para `AGENTS.md` aninhados, o path deve ficar claro na listagem:

```txt
AGENTS.md
origin: project
repo: nanodata-projects
relative path: packages/api/AGENTS.md
full path: /Users/.../nanodata-projects/packages/api/AGENTS.md
```

### Painel de detalhe

- Metadata do item
- Preview textual seguro
- Histórico de versões
- Ações:
  - Open in VS Code apenas para itens editáveis
  - Compare with current
  - Open historical version
  - Restore version
  - Delete
  - Reveal in Finder, opcional

Itens read-only não devem ser abertos no VS Code pelo app. Eles podem ser visualizados no próprio app. Na V1, arquivos reais marcados como read-only não devem ser apagados pelo app. A ação Delete fica disponível apenas para itens editáveis ou dados internos do PromptDesk, como cache de inspeção MCP.

## Matriz De Editabilidade

Regra padrão: um item só é editável quando for um arquivo textual seguro, estiver fora de caches/logs/estado interno do Codex e pertencer a uma localização controlada pelo usuário ou pelo projeto cadastrado.

Itens editáveis na V1:

- `AGENTS.md` global resolvido por `{codexHome}/AGENTS.md`
- `AGENTS.md` em projetos cadastrados, incluindo arquivos aninhados
- `{codexHome}/config.toml`
- `{codexHome}/hooks.json`, quando existir
- `{project}/.codex/config.toml`
- `{project}/.codex/hooks.json`
- `{project}/.codex/skills/**/SKILL.md`
- `{project}/.codex/skills/**/agents/*.yaml`
- `{project}/.agents/skills/**/SKILL.md`
- `{project}/.agents/skills/**/agents/*.yaml`
- `{codexHome}/skills/**/SKILL.md`, exceto skills de sistema, cache, vendor ou plugin
- `{codexHome}/skills/**/agents/*.yaml`, exceto agents de sistema, cache, vendor ou plugin
- `{codexHome}/memories/**`, se textual e seguro
- `{codexHome}/automations/**`, se textual e seguro

Itens read-only na V1:

- `{codexHome}/auth.json`
- `{codexHome}/sessions/**`
- `{codexHome}/archived_sessions/**`
- `{codexHome}/session_index.jsonl`
- `{codexHome}/history.jsonl`
- `{codexHome}/plugins/cache/**`
- `{codexHome}/cache/**`
- `{codexHome}/vendor_imports/**`
- `{codexHome}/skills/.system/**`
- `{codexHome}/logs_*.sqlite*`
- `{codexHome}/state_*.sqlite*`
- `{codexHome}/sqlite/**`
- `{codexHome}/log/**`
- `{codexHome}/tmp/**`
- `{codexHome}/.tmp/**`
- qualquer arquivo binário, secreto ou cache desconhecido

Arquivos read-only podem aparecer na UI para inspeção segura, busca e metadata, mas não têm ações de Open in VS Code, Restore, Apply, Delete de arquivo real ou edição direta.

## Projetos/Repositórios

Projetos não são uma aba. Eles são referências cadastradas pelo usuário e aparecem como filtros/contexto.

Ao adicionar um projeto:

1. Usuário seleciona ou informa um path.
2. Backend valida que o path existe e é diretório.
3. Backend salva o projeto no SQLite.
4. Backend escaneia o projeto imediatamente.
5. Backend inicia watcher para esse projeto.
6. Backend calcula branch e status Git.

Dados exibidos por projeto:

- nome amigável
- path absoluto
- branch atual
- status Git: `clean`, `dirty`, `detached`, `not-git`, `unknown`
- última varredura
- total de itens detectados na aba ativa

O nome amigável é usado apenas na UI. O valor padrão deve ser o `basename(path)`, por exemplo `prompt-desk` para `/Users/name/workspace/prompt-desk`. O usuário pode editar esse nome no app, e essa alteração não renomeia nem move a pasta real.

Branch:

```bash
git -C <repoPath> branch --show-current
```

Mostrar somente a branch local atual. Não mostrar remote tracking como `origin/develop`. Se o repositório estiver em detached HEAD, mostrar `detached`.

Sub-repositórios Git dentro de um projeto cadastrado não serão adicionados automaticamente na V1. Eles serão tratados como subpastas normais. A vantagem de detectar sub-repositórios automaticamente seria mostrar branch/status Git corretos para cada repo interno, mas isso também adiciona complexidade e pode cadastrar referências demais sem intenção do usuário. Se o usuário quiser branch/status separado para um sub-repositório, deve adicioná-lo manualmente como projeto.

## Scanner

### Escopo global automático

```txt
{codexHome}/AGENTS.md
{codexHome}/config.toml
{codexHome}/hooks.json
{codexHome}/skills/**/SKILL.md
{codexHome}/skills/**/agents/*.yaml
{codexHome}/plugins/**
{codexHome}/memories/**
{codexHome}/automations/**
{codexHome}/sessions/**
{codexHome}/archived_sessions/**
{codexHome}/session_index.jsonl
{codexHome}/history.jsonl
```

No primeiro carregamento, o app deve resolver `codexHome` pela ordem definida em "Codex Home". Se a pasta não existir ou não puder ser lida, mostrar um aviso e pedir para o usuário escolher manualmente a pasta Codex global.

### Escopo por projeto cadastrado

```txt
{project}/**/AGENTS.md
{project}/.codex/config.toml
{project}/.codex/hooks.json
{project}/.codex/skills/**/SKILL.md
{project}/.codex/skills/**/agents/*.yaml
{project}/.agents/skills/**/SKILL.md
{project}/.agents/skills/**/agents/*.yaml
{project}/.codex/plugins/**
{project}/.codex/automations/**
```

### Diretórios ignorados

```txt
.git
node_modules
dist
build
target
coverage
.next
.nuxt
.venv
venv
.idea
.DS_Store
```

## Busca

A busca global deve pesquisar por nome de arquivo e conteúdo textual dos arquivos.

Implementação recomendada:

- manter um índice SQLite FTS5 com:
  - nome do arquivo
  - path relativo
  - path absoluto
  - conteúdo textual indexável
  - tipo do item
  - origem
  - projeto/plugin relacionado
- atualizar o índice quando o watcher detectar criação, alteração, restauração ou exclusão
- respeitar a aba ativa e os filtros de escopo da sidebar
- indexar integralmente arquivos textuais permitidos
- não indexar `auth.json`, secrets, arquivos binários, logs sensíveis ou caches internos desconhecidos

Não deve existir limite artificial ou configurável de tamanho por arquivo para preview, busca, indexação, versionamento, sessions ou activity. Arquivos textuais seguros devem ser processados integralmente.

A implementação deve usar processamento assíncrono, streaming, paginação/virtualização no preview e transações de banco adequadas quando arquivos forem grandes, sem truncar conteúdo permitido.

Essa abordagem evita varrer todos os arquivos a cada busca e mantém a UI responsiva.

## Atualização Viva

Todas as informações devem ser simultâneas e vivas. O usuário não deve precisar clicar em refresh nem reiniciar o servidor.

O backend deve:

- observar `{codexHome}`
- observar projetos cadastrados
- observar nested `AGENTS.md`
- observar `.codex/**`
- observar `.agents/**`
- observar `.git/HEAD` e refs relevantes para branch/status
- recalcular hash quando arquivo mudar
- criar snapshot quando o conteúdo mudar
- marcar item como removido quando arquivo sumir
- enviar eventos para o frontend via SSE

Eventos principais:

- arquivo criado
- arquivo alterado
- arquivo removido
- projeto adicionado/removido
- branch Git alterada
- config alterada
- MCP tools inspecionadas
- versão restaurada
- item excluído

## Configuração Recomendada Do Chokidar

Usar `chokidar` para normalizar eventos de filesystem entre sistemas operacionais.

Configuração base:

```ts
chokidar.watch(paths, {
  ignored: ignoredPathMatcher,
  persistent: true,
  ignoreInitial: false,
  followSymlinks: false,
  awaitWriteFinish: {
    stabilityThreshold: 500,
    pollInterval: 100,
  },
});
```

Regras importantes:

- usar `followSymlinks: false` para evitar seguir links para fora do projeto
- ignorar diretórios pesados como `.git`, `node_modules`, `target`, `dist` e similares
- não usar polling por padrão
- processar arquivos grandes de forma assíncrona quando necessário
- nunca executar conteúdo observado
- nunca montar comandos shell concatenando strings com paths do usuário
- usar `spawn(command, args)` para VS Code e Git
- sanitizar preview Markdown/HTML no frontend
- não versionar arquivos sensíveis como `auth.json`

## Edição Via VS Code

O app não terá editor interno de conteúdo.

No app, o usuário pode visualizar e excluir itens permitidos. Edição e salvamento de arquivos reais acontecem no VS Code.

Fluxo:

1. Usuário seleciona item.
2. Clica em Open in VS Code.
3. Backend executa:

```bash
code --goto <file>
```

4. Usuário edita e salva no VS Code.
5. Watcher detecta alteração.
6. Backend recalcula hash.
7. Backend cria versão no SQLite.
8. Frontend atualiza lista, contadores e histórico via SSE.

## Histórico De Versões

Toda alteração detectada gera snapshot se o hash mudou.

Política padrão:

- manter, por padrão, as últimas 10 versões por item versionado
- permitir ajustar essa política de retenção em Settings
- aplicar pruning automático após criar uma nova versão
- nunca remover versões marcadas como protegidas pelo usuário, se essa opção for adicionada depois
- versionar integralmente arquivos textuais editáveis seguros

Campos por versão:

- item id
- path
- conteúdo
- hash
- tamanho
- timestamp
- origem:
  - `initial-scan`
  - `external-edit`
  - `restore`
  - `delete`
  - `temp-edit-apply`

Ações por versão:

- visualizar metadata
- comparar com atual
- abrir versão histórica no VS Code
- aplicar versão histórica como atual
- excluir versão do histórico, com confirmação

## Diff

Para comparar uma versão histórica com o arquivo atual:

1. Backend escreve o conteúdo histórico em arquivo temporário.
2. Backend abre diff no VS Code:

```bash
code --diff <historical-temp-file> <current-real-file>
```

O app não deve usar o `.git` real dos projetos para histórico interno.

## Abrir Versão Histórica

Fluxo:

1. Backend cria arquivo temporário editável com o conteúdo da versão.
2. Backend abre esse arquivo no VS Code.
3. Usuário edita e salva.
4. App detecta alteração no arquivo temporário.
5. Usuário escolhe Apply as current.
6. App mostra aviso:

```txt
This file is a historical version. Applying it will replace the current file and create a new history version.
```

7. Confirmado:
   - sobrescreve arquivo real
   - cria nova versão no SQLite

Ao restaurar ou aplicar uma versão histórica, o app deve perguntar ao usuário o que deseja fazer:

- restaurar diretamente após confirmação
- abrir diff antes de restaurar
- cancelar

Esse modal deve ter um checkbox `Não me pergunte novamente`. Quando marcado, a decisão deve ser salva no SQLite nas preferências do app e poderá ser alterada depois em Settings.

## Exclusão

Cada item pode ser excluído com confirmação.

Comportamento por tipo:

- arquivo real editável:
  - cria snapshot `delete`
  - move para lixeira interna do app
  - marca item como deleted
- projeto cadastrado:
  - remove apenas a referência do app
  - não apaga a pasta real
- plugin/cache:
  - read-only por padrão
- sessions/history:
  - read-only inicialmente
- MCP tool cache:
  - remove apenas a inspeção persistida

Evitar `unlink` direto. Preferir lixeira interna com metadata para permitir recuperação.

Ao mover arquivo real editável para a lixeira interna:

1. gerar `trash-id` único
2. mover o arquivo real para `PromptDesk/trash/items/<trash-id>/file`
3. gravar `metadata.json` com path original, basename, hash, tamanho, timestamps e item id
4. atualizar SQLite e emitir evento SSE

Restauração:

- se o path original estiver livre, mover de volta para o path original
- se o path original já existir, oferecer:
  - comparar com o arquivo existente
  - restaurar sobrescrevendo após confirmação e snapshot do arquivo atual
  - restaurar com novo nome no mesmo diretório, por exemplo `name.restored-YYYYMMDD-HHMMSS.ext`
  - escolher outro destino
  - cancelar
- se o diretório original não existir mais, oferecer recriar diretório, escolher outro destino ou cancelar

## Configs E MCP

Não haverá aba principal MCP. MCPs aparecem dentro da aba Configs porque normalmente são declarados em `config.toml`.

Na aba Configs:

- listar `config.toml` global
- listar `config.toml` por projeto
- extrair MCP servers dessas configs
- mostrar MCP servers como sublista/seção
- botão por server: Discover tools
- botão geral: Discover all tools
- aviso de segurança antes de executar inspeção
- inspeção sempre manual na V1
- mostrar a última data/hora de inspeção de cada MCP
- suportar servidores STDIO configurados com `command`, `args`, `env`, `env_vars` e `cwd`
- suportar servidores Streamable HTTP configurados com `url`, bearer token por env var e headers redigidos
- respeitar `enabled = false`, `enabled_tools` e `disabled_tools` quando presentes

Aviso de segurança:

```txt
Discovering MCP tools may start the MCP server command configured on disk. This can execute local code, access files, use credentials, or access the network. Continue only if you trust this configuration.
```

Persistir no SQLite:

- MCP server detectado
- config de origem
- comando/args/env redigidos
- tools descobertas
- schema de entrada
- schema de saída, se houver
- descrição
- status
- erro, se falhar
- inspecionado em data/hora

## Plugins

Aba Plugins inclui:

- plugins cacheados/instalados
- origem/path
- versão
- skills fornecidas
- agents fornecidos
- scripts/assets relevantes
- read-only por padrão

Skills vindas de plugins também aparecem na aba Skills com badge:

```txt
source: plugin
read-only
plugin: Browser
```

## Memories

Aba Memories:

- listar arquivos em `{codexHome}/memories`
- abrir no VS Code
- manter histórico
- restaurar versões
- excluir com aviso forte
- editar se for arquivo textual seguro

## Automations

Aba Automations:

- listar automações detectadas
- mostrar prompt/config
- abrir no VS Code
- manter histórico
- permitir edição se forem arquivos textuais seguros
- excluir com confirmação

## Sessions

Aba Sessions:

- incluir `{codexHome}/sessions`
- incluir `{codexHome}/archived_sessions`
- read-only na V1
- busca textual
- metadata
- visualizar a conversa em formato JSON estruturado no app
- mostrar tag `active` ou `archived` em cada sessão
- permitir filtros rápidos por `active`, `archived` e `all`

Editar ou excluir arquivos reais de sessions pode afetar histórico, retomada de conversas, indexação interna ou integridade esperada pelo Codex. Por isso, a V1 deve ser read-only. Para limpar sessões no futuro, preferir uma ação explícita de arquivar/ocultar/remover da visualização do PromptDesk antes de permitir apagar arquivos reais do Codex.

## Activity

Aba Activity:

- incluir `{codexHome}/history.jsonl`
- eventos do próprio app
- saves detectados
- restores
- deletes
- MCP inspections
- projetos adicionados/removidos

Arquivos internos do Codex nessa aba devem ser read-only inicialmente.

Sessions e Activity ficam separadas porque representam coisas diferentes:

- Sessions: conversas do Codex em JSON estruturado, com status `active` ou `archived`
- Activity: trilha operacional e auditável, incluindo `history.jsonl` e eventos do próprio PromptDesk

## Perfis

Perfis são uma funcionalidade de V2 e não devem ser implementados na V1.

Na V2, perfil não deve salvar filtros/preferências de UI do app. Ele deve representar um conjunto real de configurações e skills que o usuário quer gerenciar como perfil.

Ideia de V2:

- nome do perfil
- descrição
- arquivos/configs vinculados
- skills vinculadas
- agents vinculados
- histórico de alterações do perfil
- operações seguras para ativar/aplicar/comparar perfis

Não implementar alternância de perfil ativo na V1.

## Settings

O botão de Settings fica na topbar.

Settings deve incluir:

- tema: dark/light
- idioma: `en-US`, `pt-BR`, `es-ES`
- caminho resolvido do Codex Home e ação para alterar/re-escanear
- caminho dos dados internos do PromptDesk
- retenção de versões, default 10 por item versionado
- decisões salvas pelo usuário, incluindo comportamento de restauração com `Não me pergunte novamente`
- lixeira interna do app:
  - listar itens removidos
  - restaurar item quando possível
  - excluir definitivamente da lixeira, com confirmação
- dados salvos do app:
  - projetos cadastrados
  - preferências
  - índice de busca
  - cache de MCP tools
- ações de manutenção:
  - reindexar busca
  - limpar cache de inspeções MCP
  - limpar eventos antigos do app

## Persistência No SQLite

O SQLite é a fonte local do app para histórico, preferências, referências cadastradas e dados derivados. Ele não substitui os arquivos reais no disco; os arquivos continuam sendo a fonte principal do conteúdo atual.

Persistir no SQLite:

- projetos cadastrados:
  - nome amigável
  - nome amigável customizado pelo usuário, quando houver
  - path absoluto
  - data de criação
  - última varredura
  - status ativo/removido
- status Git por projeto:
  - branch atual
  - estado `clean`, `dirty`, `detached`, `not-git` ou `unknown`
  - data da última checagem
- itens detectados:
  - tipo: `agents`, `skill`, `agent`, `plugin`, `config`, `memory`, `automation`, `session`, `activity`
  - origem: `global`, `project`, `plugin`
  - path absoluto
  - path relativo
  - projeto ou plugin de origem
  - estado read-only/editável/deleted
  - hash atual
  - tamanho
  - datas de criação/detecção/última alteração
- versões de arquivos:
  - conteúdo textual versionado
  - hash
  - tamanho
  - origem: `initial-scan`, `external-edit`, `restore`, `delete`, `temp-edit-apply`
  - timestamp
- preferências do app:
  - Codex Home resolvido/customizado
  - PromptDesk Home resolvido/customizado
  - tema
  - idioma
  - aba ativa
  - filtros selecionados
  - projeto selecionado
  - preferências de UI
  - política de retenção de versões
  - decisões salvas pelo usuário
- arquivos temporários de versões históricas:
  - item original
  - versão de origem
  - path temporário
  - hash do conteúdo temporário
  - status: aberto, alterado, aplicado, descartado
- MCP servers detectados:
  - config de origem
  - nome/chave do server
  - comando
  - argumentos
  - env redigido
  - status
- MCP tools descobertas:
  - server de origem
  - nome
  - descrição
  - schema de entrada
  - schema de saída, se houver
  - inspecionado em data/hora
  - erro, se falhar
- eventos do app:
  - tipo de evento
  - entidade afetada
  - metadata
  - timestamp
- índice de busca:
  - nome do arquivo
  - path
  - conteúdo textual indexável
  - tipo
  - origem
  - data da última indexação
- lixeira interna:
  - item removido
  - path original
  - conteúdo no momento da exclusão, quando aplicável
  - metadata de restauração
  - timestamp

Não persistir no SQLite:

- `auth.json`
- tokens, secrets e credenciais
- arquivos binários grandes
- logs brutos sensíveis
- caches internos desconhecidos do Codex
- sessões reais do Codex como conteúdo editável; na V1 elas são apenas indexadas/visualizadas como read-only
- valores brutos de env, headers ou tokens de MCP; persistir apenas nomes e versões redigidas

## SQLite

Tabelas principais:

- `projects`
- `project_git_status`
- `codex_items`
- `file_versions`
- `preferences`
- `temp_edits`
- `mcp_servers`
- `mcp_tools`
- `mcp_inspections`
- `app_events`
- `trash_items`
- `search_index`

## API REST

Endpoints principais:

```txt
GET    /api/bootstrap
GET    /api/items
GET    /api/items/counts

POST   /api/projects
DELETE /api/projects/:id
POST   /api/projects/:id/scan
GET    /api/projects/:id/git-status

POST   /api/items/:id/open
POST   /api/items/:id/delete
GET    /api/items/:id/versions
POST   /api/items/:id/diff/:versionId
POST   /api/items/:id/restore/:versionId
POST   /api/items/:id/open-version/:versionId

GET    /api/configs/mcp-servers
POST   /api/mcp/:id/inspect
POST   /api/mcp/inspect-all

GET    /api/preferences
PATCH  /api/preferences
GET    /api/settings
PATCH  /api/settings
GET    /api/trash
POST   /api/trash/:id/restore
DELETE /api/trash/:id
POST   /api/search/reindex

GET    /api/events/stream
```

## Validação Com Zod

Validar:

- paths absolutos
- existência de diretórios
- project ids
- item ids
- tipo de item
- escopo
- restore/diff/delete
- preferências
- settings
- decisões salvas pelo usuário
- classificação textual/binária e bloqueio de arquivos sensíveis
- payload de inspeção MCP
- resolução de `codexHome` e `promptDeskHome`
- conflitos de restauração da lixeira interna

## Segurança Local

- backend escuta em `127.0.0.1`
- sem login
- confirmações para restore/delete/MCP inspection
- não usar `.git` real para histórico interno
- não abrir/editar/versionar `auth.json`
- redigir env/secrets
- plugins/cache read-only por padrão
- sessions e activity read-only inicialmente
- preview Markdown deve ser sanitizado
- comandos externos devem usar `spawn(command, args)`
- MCP inspection é funcional na V1, mas sempre manual, confirmada e com timeout
- servidores MCP desabilitados por config não devem ser executados
- headers/env/tokens de MCP nunca devem ser persistidos em claro

## Critério De Pronto

- `npm run dev` sobe frontend e backend juntos
- app resolve `codexHome` por preferência, `CODEX_HOME` ou `~/.codex`
- app armazena dados internos em `~/Library/Application Support/PromptDesk` por padrão
- usuário adiciona/remove projetos
- scanner acha nested `AGENTS.md`
- scanner encontra configs, hooks, skills, agents, plugins, memories, automations, sessions e activity definidos no plano
- branch/status aparecem por projeto
- abas e filtros mostram contadores vivos da aba ativa
- i18n funciona para `en-US`, `pt-BR` e `es-ES`
- Settings permite alterar tema, idioma, Codex Home, decisões salvas e lixeira
- busca por nome e conteúdo usa índice local
- alterações externas aparecem sem refresh
- Open in VS Code funciona
- histórico SQLite funciona
- diff no VS Code funciona
- restore funciona com confirmação
- delete funciona com confirmação e lixeira interna
- MCP tools podem ser inspecionadas com aviso e persistência
- dark mode é default, com opção light
- Sessions aparecem em JSON estruturado read-only, com tag `active` ou `archived`
