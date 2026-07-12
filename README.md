# Ludex

> **Ludex is a modern desktop game library for organizing and launching local emulated games.**

Ludex é uma biblioteca desktop moderna para organizar jogos locais de **PlayStation 2**, com suporte futuro a **PlayStation 3**, e iniciá-los por meio de emuladores configurados pelo usuário.

O produto combina a praticidade de uma biblioteca como a Steam com a navegação visual de interfaces modernas de console. O usuário mantém seus próprios jogos no computador; o Ludex apenas organiza a coleção local e aciona o emulador configurado.

> [!IMPORTANT]
> O escopo do Ludex começa em **PS2** com PCSX2. PS3 e RPCS3 fazem parte do roadmap. **PS1 não faz parte deste projeto.**

## Estado atual

Versão: `v0.5.0`.

Nesta versão, o Ludex já possui o primeiro fluxo real local:

- scanner nativo de arquivos PS2 via Tauri/Rust;
- importação de `.iso`, `.chd`, `.bin` e `.cue`;
- biblioteca exibida a partir de jogos importados, sem jogos exemplo no fluxo principal;
- persistência temporária em `localStorage`, enquanto SQLite não é integrado;
- configuração local do caminho do PCSX2;
- launcher nativo para abrir jogos PS2 com PCSX2;
- detecção automática da pasta PS2 configurada ao abrir a biblioteca;
- painel de status da biblioteca com total indexado, última sincronização e contadores de mudanças;
- limpeza segura do índice local sem apagar arquivos de jogos;
- seletor nativo para pasta da biblioteca e executável do PCSX2;
- perfis locais de execução por jogo com fullscreen e argumentos extras seguros;
- sessão local ativa, finalização manual, histórico recente e tempo jogado;
- ação para abrir a pasta do jogo no Explorer;
- validações de caminho, extensão e execução sem shell.

Ainda não há SQLite, scanner incremental avançado, metadados reais, download de capas, backend cloud, monitoramento automático de encerramento do emulador ou suporte real a PS3. A biblioteca, perfis e sessões permanecem em `localStorage` nesta versão.

## Stack

| Camada       | Tecnologia                    | Responsabilidade                           |
| ------------ | ----------------------------- | ------------------------------------------ |
| Desktop      | [Tauri 2](https://tauri.app/) | janela nativa, commands e integração local |
| UI           | React 19                      | componentes e experiência de navegação     |
| Linguagem    | TypeScript                    | domínio e frontend tipados                 |
| Build        | Vite                          | ambiente de desenvolvimento e bundle web   |
| Estilo       | Tailwind CSS 4                | design system e layout responsivo          |
| Nativo       | Rust                          | scanner local e launcher seguro            |
| Persistência | SQLite futuro                 | biblioteca, configurações e sessões locais |

## Como rodar localmente

### Pré-requisitos

- Windows 10/11;
- Node.js 20 ou superior;
- Rust estável via [rustup](https://rustup.rs/);
- Microsoft C++ Build Tools com o workload **Desktop development with C++**;
- WebView2 Runtime.

Consulte também os [pré-requisitos oficiais do Tauri](https://v2.tauri.app/start/prerequisites/).

### Instalação

```bash
git clone https://github.com/pedroyaseon/Ludex.git
cd Ludex
npm install
npm run dev
```

Para trabalhar somente na interface:

```bash
npm run dev:web
```

### Fluxo local PS2

1. Abra **Configurações** e confirme a pasta da biblioteca PS2, por exemplo:

   ```text
   F:\ISOs PS2
   ```

2. Mantenha **Detectar jogos automaticamente** ligado.
3. Abra a **Home**. O Ludex escaneia a pasta configurada e atualiza a biblioteca.
4. Se necessário, clique em **Reescanear** para forçar uma nova varredura.
5. Confirme o caminho do PCSX2, por exemplo:

   ```text
   F:\PCSX2
   ```

   O Ludex aceita a pasta do PCSX2 ou o executável direto, como `pcsx2-qt.exe`.

6. Abra um jogo e clique em **Jogar**.

## Segurança local

O Ludex foi ajustado para manter uma superfície segura nesta etapa:

- não usa shell para abrir emuladores;
- valida se o caminho do PCSX2 existe;
- aceita apenas executáveis `.exe`;
- valida se o jogo existe e é arquivo;
- permite apenas extensões PS2 suportadas: `.iso`, `.chd`, `.bin`, `.cue`;
- ignora symlinks durante o scanner;
- não move, altera, extrai, faz upload ou baixa arquivos de jogos;
- não envia biblioteca, caminhos locais ou metadados para servidores externos.

## Scripts

| Comando                | Descrição                                           |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | inicia Vite e a aplicação Tauri em desenvolvimento  |
| `npm run dev:web`      | inicia somente o frontend no navegador              |
| `npm run build`        | gera o bundle desktop Tauri                         |
| `npm run build:web`    | valida tipos e gera o bundle web                    |
| `npm run lint`         | executa ESLint em todo o frontend                   |
| `npm run typecheck`    | executa o compilador TypeScript sem emitir arquivos |
| `npm run check:rust`   | valida o crate Tauri no ambiente MSVC do Windows    |
| `npm run format`       | formata o projeto com Prettier                      |
| `npm run format:check` | verifica formatação sem alterar arquivos            |

## Escopo do MVP

O MVP será considerado funcional quando o usuário puder:

1. cadastrar uma ou mais pastas de jogos PS2;
2. escanear `.iso`, `.chd`, `.bin` e `.cue` localmente;
3. consultar e editar sua biblioteca persistida em SQLite;
4. configurar o caminho do PCSX2;
5. iniciar um jogo com perfil de execução;
6. acompanhar favoritos, última sessão e tempo jogado;
7. operar tudo localmente, sem conta ou backend cloud.

Ficam fora do MVP: PS1, sincronização cloud, download automático de ROMs/ISOs e distribuição de emuladores.

## Roadmap

### v0.1.0 — Fundação

- [x] shell Tauri 2 e frontend React;
- [x] UI da biblioteca, detalhes, importação e configurações;
- [x] domínio TypeScript e serviços mockados;
- [x] fronteiras Rust preparadas;
- [x] automações de qualidade.

### v0.2.0 — Engenharia base

- [x] workflows de CI;
- [x] scripts de validação;
- [x] documentação de contribuição;
- [x] correções de build e identificador Tauri.

### v0.3.0 — Biblioteca local PS2

- [x] scanner real de arquivos PS2;
- [x] remoção dos jogos exemplo do fluxo principal;
- [x] persistência local temporária sem SQLite;
- [x] configuração local do PCSX2;
- [x] launcher nativo para PCSX2;
- [x] validações básicas de segurança local.

### v0.3.1 — Detecção automática

- [x] auto-scan da pasta PS2 configurada ao abrir a biblioteca;
- [x] botão de reescaneamento manual na Home;
- [x] configuração da pasta PS2 nas preferências;
- [x] importação salva a pasta como origem automática;
- [x] feedback visual de sincronização e erros do scanner.

### v0.4.0 — Gestão local da biblioteca

- [x] manter a biblioteca em `localStorage` enquanto SQLite fica fora do escopo imediato;
- [x] gravar estado local de sincronização separado da lista de jogos;
- [x] exibir total indexado, adicionados, atualizados e removidos na Home;
- [x] exibir última pasta sincronizada e duração da varredura;
- [x] permitir limpar o índice local sem remover arquivos originais.

### v0.5.0 — Perfis, sessões e UX nativa

- [x] seletor nativo de pasta para biblioteca PS2;
- [x] seletor nativo de executável para PCSX2;
- [x] confirmação antes de limpar o índice local;
- [x] exibir caminho do jogo e abrir a pasta no Explorer;
- [x] salvar perfil de execução por jogo;
- [x] iniciar PCSX2 com fullscreen e argumentos extras sem shell;
- [x] registrar sessão ativa e finalizar manualmente;
- [x] atualizar último jogado, tempo jogado e histórico recente.

### Próximas versões

- [ ] SQLite para biblioteca e configurações;
- [ ] deduplicação avançada de `.bin/.cue`;
- [ ] monitoramento automático do processo do emulador;
- [ ] cache local de capas e metadados;
- [ ] suporte futuro a PS3/RPCS3.

## Estrutura do projeto

```text
Ludex/
├── public/
│   └── covers/                 # artes locais usadas por fixtures/dev
├── src/
│   ├── app/                    # raiz e estilos globais
│   ├── components/             # componentes reutilizáveis
│   ├── features/
│   │   ├── games/              # catálogo, serviço e hook
│   │   ├── emulators/          # adapters e launcher frontend
│   │   ├── library-scanner/    # contrato e serviço do scanner
│   │   ├── metadata/           # provider mockado
│   │   └── settings/           # preferências locais temporárias
│   ├── lib/                    # utilitários sem regra de negócio
│   ├── pages/                  # telas roteadas
│   ├── routes/                 # definição de rotas
│   └── types/                  # entidades do domínio
└── src-tauri/
    ├── capabilities/           # permissões Tauri
    └── src/
        ├── commands/           # API entre frontend e Rust
        ├── scanner/            # leitura segura do filesystem
        └── launcher/           # execução segura de emuladores
```

## Versionamento e colaboração

### Branches

- `main`: versão estável e integrável;
- `develop`: integração quando houver múltiplas frentes simultâneas;
- `feature/*`: novas funcionalidades;
- `fix/*`: correções;
- `chore/*`: manutenção e toolchain;
- `docs/*`: documentação.

Branches têm vida curta, escopo único e devem ser removidas após o merge.

### Commits

O projeto usa [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add PCSX2 launch profile
fix: avoid duplicate cue entries during scan
docs: document local metadata cache
chore: update Tauri dependencies
refactor: isolate library repository contract
test: cover scanner extension rules
style: refine game card focus state
```

### Pull requests

1. abra a branch a partir da base atualizada;
2. mantenha o PR focado e explique motivação e impacto;
3. execute todas as validações locais;
4. solicite revisão e trate comentários com novos commits;
5. use squash merge quando os commits intermediários não agregarem contexto histórico;
6. não faça push direto em `main`.

O checklist e o conteúdo mínimo estão em [`.github/pull_request_template.md`](.github/pull_request_template.md).

## Aviso legal

Ludex é um organizador e launcher independente. O projeto não é afiliado, aprovado ou patrocinado pela Sony Interactive Entertainment, PCSX2, RPCS3 ou pelos detentores dos jogos exibidos.

O Ludex não fornece, hospeda, baixa ou distribui ROMs, ISOs, BIOS, firmware, chaves, jogos ou emuladores. O usuário é responsável por obter e utilizar todo conteúdo de acordo com a legislação aplicável, as licenças dos softwares e os direitos autorais. Use apenas dumps e arquivos que você tenha direito legal de utilizar.
