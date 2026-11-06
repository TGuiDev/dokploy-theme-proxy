# dokploy-theme-proxy

Proxy nginx que fica na frente do painel do [Dokploy](https://dokploy.com) e injeta
um CSS/JS próprio em todas as páginas, mudando a aparência **sem fork e sem mexer no
Dokploy ou no Traefik**.

```
navegador ─► Cloudflare Tunnel ─► :3001 nginx (injeta tema) ─► :3000 Dokploy
                                        └─► sidecar de métricas (só p/ logados)
```

## O que ela muda hoje (`/dashboard/home`)

- Textos em português e visual mais refinado (usa as variáveis do próprio painel, então
  funciona em claro/escuro).
- **Alerta** no topo quando algum serviço está com erro.
- **Servidor**: CPU, memória, disco e uptime do host (atualiza a cada 5 s).
- **Seus apps**: grade com status ao vivo, busca (atalho `/`) e botão **Abrir ↗** com o
  domínio de cada app.

## Instalação

```bash
docker compose up -d
```

O painel com tema fica em `http://IP-DO-SERVIDOR:3001`; o original continua em `:3000`.
Outra porta: `THEME_PORT=8080 docker compose up -d`.

### Usar no seu domínio (Cloudflare Tunnel)

No Cloudflare Zero Trust → Networks → Tunnels → seu túnel → *Public Hostname* do Dokploy,
troque o serviço de `http://localhost:3000` para `http://localhost:3001`.
Para voltar ao normal, basta trocar de volta (ou `docker compose down`).

## Personalizando

- `theme/custom.css` — estilos (a home usa o atributo `data-dkt="home"`).
- `theme/custom.js` — painéis e tradução.
- Os arquivos são lidos direto do disco: edite e recarregue a página, sem reiniciar.

## Como funciona

- O nginx faz `sub_filter` no HTML e adiciona `<link>`/`<script>` antes de `</head>`;
  WebSockets (terminal, logs) passam normalmente.
- O JS consulta a API tRPC do próprio Dokploy com a sessão do usuário logado
  (`project.all`, `domain.byApplicationId`, `domain.byComposeId`).
- `/__stats` só responde a quem está autenticado: o nginx valida a sessão no Dokploy
  (`auth_request`) antes de repassar ao sidecar (`stats/stats.py`, somente leitura de
  `/proc` e do uso de disco).

## Limites

Só altera a aparência e adiciona painéis; não reorganiza as telas internas do Dokploy.
Testado contra a v0.30.8. Se uma atualização mudar a estrutura da home, o JS simplesmente
não monta os painéis e a home original continua funcionando.
