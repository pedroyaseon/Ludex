# Contribuindo com o Ludex

## Antes de começar

1. escolha ou abra uma issue com contexto e critérios de aceite;
2. alinhe mudanças arquiteturais antes de implementar;
3. crie uma branch curta a partir da base adequada;
4. não inclua ROMs, BIOS, firmware, conteúdo proprietário ou segredos no repositório.

## Qualidade mínima

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build:web
cargo check --manifest-path src-tauri/Cargo.toml
```

Mudanças de regra de negócio devem manter domínio, serviços e UI separados. Acesso a filesystem e processos pertence ao Rust; o frontend consome commands tipados e não deve incorporar lógica nativa.

## Pull requests

- descreva problema, solução e impacto;
- inclua capturas para mudanças visuais;
- registre decisões e limitações relevantes;
- mantenha cada PR revisável e com propósito único;
- use Conventional Commits.
