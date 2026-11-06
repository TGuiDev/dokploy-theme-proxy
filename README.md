# dokploy-theme-proxy

Proxy nginx que fica na frente do painel do [Dokploy](https://dokploy.com) e injeta
um CSS/JS próprio em todas as páginas, permitindo mudar a aparência **sem fork e sem
mexer no Dokploy ou no Traefik**.

```
navegador ──► :3001 nginx (injeta tema) ──► :3000 Dokploy
```

## Uso

```bash
docker compose up -d
```

Acesse `http://IP-DO-SERVIDOR:3001`. O painel original continua em `:3000`.

- Edite `theme/custom.css` e `theme/custom.js` e recarregue a página (não precisa reiniciar).
- Outra porta: `THEME_PORT=8080 docker compose up -d`.
- Remover: `docker compose down`. O Dokploy não é afetado.

## Como funciona

O nginx faz `sub_filter` no HTML e adiciona `<link>`/`<script>` antes de `</head>`.
Os arquivos de `theme/` são servidos em `/__theme/`. WebSockets (terminal, logs) são repassados.

## Limites

Só altera a aparência (cores, fontes, logo, esconder/mostrar elementos). Se o Dokploy
mudar nomes de classes numa atualização, seletores específicos podem precisar de ajuste.
