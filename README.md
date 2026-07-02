# Ludex

> **Ludex is a modern desktop game library for organizing and launching local emulated games.**

Ludex é uma biblioteca desktop moderna para organizar jogos locais de **PlayStation 2**, com suporte futuro a **PlayStation 3**, e iniciá-los por meio de emuladores configurados pelo usuário.

O produto combina a praticidade de uma biblioteca como a Steam com a navegação visual de interfaces modernas de console. O usuário mantém seus próprios jogos no computador; o Ludex apenas organiza a coleção, apresenta metadados e, futuramente, coordena a abertura do emulador adequado.

> [!IMPORTANT]
> O escopo do Ludex começa em **PS2** com PCSX2. PS3 e RPCS3 fazem parte do roadmap. **PS1 não faz parte deste projeto.**

## Estado atual

Esta é a fundação do produto (`v0.2.0`). A interface e os tipos de domínio usam jogos mockados, enquanto as preferências do aplicativo já são persistidas localmente em SQLite. Nesta etapa, o Ludex **não** lê pastas reais nem inicia emuladores.

### Disponível nesta entrega

- aplicação desktop Tauri 2 com React, TypeScript e Vite;
- design dark responsivo para desktop;
- biblioteca mockada de PS2, busca e filtros;
- detalhes do jogo e ação de jogar demonstrativa;
- fluxo visual de importação com scanner mockado;
- configurações persistidas localmente em SQLite;
- descoberta e validação nativa do executável PCSX2;
- adapters de emulador para PCSX2 e RPCS3;
- módulos Rust preparados para scanner, launcher e commands;
- validações automatizadas de lint, formato, tipos e builds.

## Stack

| Camada       | Tecnologia                    | Responsabilidade                                |
| ------------ | ----------------------------- | ----------------------------------------------- |
| Desktop      | [Tauri 2](https://tauri.app/) | janela nativa e futura integração com o sistema |
| UI           | React 19                      | componentes e experiência de navegação          |
| Linguagem    | TypeScript                    | domínio e frontend estritamente tipados         |
| Build        | Vite                          | ambiente de desenvolvimento e bundle web        |
| Estilo       | Tailwind CSS 4                | design system e layout responsivo               |
| Nativo       | Rust                          | commands locais e futuro scanner/launcher       |
| Persistência | SQLite                        | configurações e futuro catálogo local           |

## Como rodar localmente

### Pré-requisitos

- Windows 10/11;
- Node.js 20 ou superior;
- Rust estável via [rustup](https://rustup.rs/);
- Microsoft C++ Build Tools com o workload **Desktop development with C++**;
- WebView2 Runtime (normalmente já incluído no Windows 11).

Consulte também os [pré-requisitos oficiais do Tauri](https://v2.tauri.app/start/prerequisites/).

### Instalação

```bash
git clone https://github.com/pedroyaseon/Ludex.git
cd Ludex
npm install
npm run dev
```

Para trabalhar somente na interface, sem abrir a janela Tauri:

```bash
npm run dev:web
```

### Scripts

| Comando                | Descrição                                           |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | inicia Vite e a aplicação Tauri em desenvolvimento  |
| `npm run dev:web`      | inicia somente o frontend no navegador              |
| `npm run build`        | gera o bundle desktop Tauri                         |
| `npm run build:web`    | valida tipos e gera o bundle web                    |
| `npm run lint`         | executa ESLint em todo o frontend                   |
| `npm run typecheck`    | executa o compilador TypeScript sem emitir arquivos |
| `npm run check:rust`   | valida o crate Tauri no ambiente MSVC do Windows    |
| `npm run test:rust`    | executa os testes unitários da camada Rust          |
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

### Fase 1 — Fundação (atual)

- [x] shell Tauri 2 e frontend React;
- [x] UI da biblioteca, detalhes, importação e configurações;
- [x] domínio TypeScript e serviços mockados;
- [x] fronteiras Rust preparadas;
- [x] automações de qualidade.

### Fase 2 — Biblioteca local

- [x] schema e migrations SQLite;
- [x] persistência das configurações do aplicativo;
- [x] descoberta e validação do executável PCSX2;
- [x] commands Tauri tipados para configurações;
- [ ] scanner real e incremental de PS2;
- [ ] deduplicação e tratamento de arquivos `.bin/.cue`;
- [ ] persistência e gerenciamento de pastas da biblioteca.

### Fase 3 — Launcher

- [x] descoberta/configuração persistente do PCSX2;
- [ ] composição segura de argumentos;
- [ ] perfis por jogo;
- [ ] sessões e cálculo de tempo jogado;
- [ ] tratamento de erros do processo nativo.

### Fase 4 — Metadados

- [ ] provider de metadados intercambiável;
- [ ] cache local de capas e descrições;
- [ ] revisão manual de correspondências;
- [ ] importação e exportação da biblioteca.

### Futuro — PS3

- [ ] adapter RPCS3;
- [ ] suporte a pastas de jogo e `.pkg`;
- [ ] particularidades de instalação e boot de títulos PS3.

## Arquitetura

O frontend é organizado por responsabilidade. Componentes genéricos não conhecem persistência ou Tauri; features encapsulam contratos e casos de uso; páginas apenas compõem a experiência.

```text
Ludex/
├── public/
│   └── covers/                 # artes locais usadas pelos mocks
├── src/
│   ├── app/                    # raiz e estilos globais
│   ├── components/             # componentes reutilizáveis
│   ├── features/
│   │   ├── games/              # catálogo, serviço e hook
│   │   ├── emulators/          # adapters PCSX2/RPCS3
│   │   ├── library-scanner/    # contrato do scanner
│   │   ├── metadata/           # provider mockado
│   │   └── settings/           # gateway de preferências locais
│   ├── lib/                    # utilitários sem regra de negócio
│   ├── pages/                  # telas roteadas
│   ├── routes/                 # definição de rotas
│   └── types/                  # entidades do domínio
└── src-tauri/
    ├── capabilities/           # permissões Tauri
    └── src/
        ├── database/           # conexão, migrations e repositories SQLite
        ├── emulators/          # descoberta e validação nativa
        ├── commands/           # API entre frontend e Rust
        ├── scanner/            # futura leitura do filesystem
        └── launcher/           # futura execução de emuladores
```

Os jogos ainda usam implementações mockadas que preservam os contratos públicos. As configurações já atravessam commands Tauri e um repository SQLite, validando o padrão arquitetural para a futura migração do catálogo.

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
