# Homologação de Qualidade (QA) — KamisamaLoader

## Objetivo
Garantir que o app está **funcional**, **seguro** (não corrompe o jogo) e com **UX aceitável** antes de produção.

## Checklist manual (fluxos críticos)

### Configuração
- **Selecionar diretório do jogo**: Settings → selecionar pasta/EXE → salvar → reabrir app → path permanece.
- **Estrutura do jogo detectada**: deploy cria `SparkingZERO/Content/Paks/~mods` quando necessário.

### Instalação local (drag & drop)
- **Arrastar `.zip`**: instala em `Mods/<nome>/` e aparece na lista Installed.
- **Arrastar `.pak`**: cria pasta do mod e copia o arquivo, aparece na lista.
- **Sem crash** quando arquivo inválido é solto (toast de erro).

### Ativar / desativar
- **Ativar**: arquivos aparecem em `~mods` com prefixo de prioridade (`000_...`).
- **Desativar**: arquivos deployados são removidos; `mods.json` atualiza `isEnabled=false`.
- **Reabrir app**: estado enabled/disabled persiste.

### Prioridade / ordem
- **Mover prioridade** (↑/↓): arquivos são re-deployados com prefixo novo; ordem na UI muda.

### Desinstalação
- **Uninstall** remove:
  - deploy do jogo (`~mods` e/ou UE4SS)
  - pasta do mod em `Mods/`
  - item em `mods.json`

### Perfis (loadouts)
- **Criar perfil** salva lista de mods ativos.
- **Carregar perfil** aplica enable/disable no filesystem (deploy/undeploy).
- **Perfil não encontrado / arquivo corrompido** não quebra app (erro amigável).

### Online (browse/search)
- **Browse Online** abre lista, carrega categorias.
- **Infinite scroll**: ao chegar perto do fim, carrega próxima página sem duplicar demais.
- **Ordenação**:
  - downloads/views/likes/date alteram a ordem de forma perceptível
  - quando API não suportar ordenação server-side, fallback local deve ser consistente por página (sem travar).

### Detalhes do mod
- Modal abre e mostra:
  - carrossel (próxima/anterior)
  - descrição (texto/HTML)
  - downloads/likes/views
  - link “View on GameBanana” abre externo

### Downloads
- Instalar online cria item em Downloads tab.
- **Pause/Resume/Cancel** funcionam sem corromper o arquivo temporário.
- Ao completar, mod aparece em Installed.

## Checklist automático (CI local)
- `pnpm lint`
- `pnpm type-check`
- `pnpm test:unit`

