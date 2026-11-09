/* Prakon: marca, tema claro/escuro, transição de telas e login em pt-BR.
 * Roda em todas as páginas do painel (a lógica das páginas de projetos e da home
 * fica em custom.js). Tudo é opcional: se algo falhar, o painel segue normal. */
(() => {
  "use strict";

  const NAME = "Prakon";
  const SKIP = "pre, code, textarea, input, script, style, .xterm, [contenteditable], [data-dk]";

  /* ---------------- logo ---------------- */
  const MARK =
    '<rect width="32" height="32" rx="8" fill="var(--foreground)"/><path d="M10.5 24V8h6.5a5 5 0 0 1 0 10h-3" fill="none" stroke="var(--background)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22.5" cy="24" r="2" fill="var(--background)"/>';

  function brandSvgs(root) {
    for (const svg of root.querySelectorAll('svg[viewBox="0 0 559 446"]')) {
      svg.setAttribute("viewBox", "0 0 32 32");
      svg.innerHTML = MARK;
    }
  }

  /* ---------------- textos ---------------- */
  const LOGIN = new Map([
    ["Sign in", "Entrar no Prakon"],
    ["Enter your email and password to sign in", "Use seu e-mail e senha para continuar"],
    ["Email", "E-mail"],
    ["Password", "Senha"],
    ["Login", "Entrar"],
    ["Sign in with Passkey", "Entrar com Passkey"],
    ["Lost your password?", "Esqueceu a senha?"],
    ["“The Open Source alternative to Netlify, Vercel, Heroku.”", "Publique, acompanhe e escale seus apps em um só lugar."],
  ]);
  const PLACEHOLDERS = new Map([
    ["Enter your password", "Digite sua senha"],
    ["john@example.com", "voce@exemplo.com"],
  ]);

  const DICT = new Map(Object.entries({"Overview": "Visão geral", "Sessions": "Sessões", "Update Available": "Atualização disponível", "Audit Logs": "Logs de auditoria", "Home": "Início", "Projects": "Projetos", "Monitoring": "Monitoramento", "Schedules": "Agendamentos", "Traefik File System": "Arquivos do Traefik", "Docker": "Docker", "Swarm": "Swarm", "Requests": "Requisições", "Settings": "Configurações", "Web Server": "Servidor web", "Profile": "Perfil", "Remote Servers": "Servidores remotos", "Users": "Usuários", "SSH Keys": "Chaves SSH", "Git": "Git", "Registry": "Registro", "S3 Destinations": "Destinos S3", "Destinations": "Destinos", "Certificates": "Certificados", "Cluster": "Cluster", "Notifications": "Notificações", "Appearance": "Aparência", "Billing": "Cobrança", "License": "Licença", "Log out": "Sair", "Logout": "Sair", "Documentation": "Documentação", "Support": "Suporte", "Sponsor": "Apoiar", "Dashboard": "Painel", "Extra": "Extra", "Main": "Principal", "Toggle Sidebar": "Alternar barra lateral", "Toggle theme": "Alternar tema", "Account": "Conta", "My Account": "Minha conta", "Security": "Segurança", "AI": "IA", "Tags": "Tags", "Server": "Servidor", "Servers": "Servidores", "Git Providers": "Provedores Git", "Backups": "Backups", "Volume Backups": "Backups de volume", "Network": "Rede", "Registries": "Registros", "Templates": "Modelos", "Template": "Modelo", "Webhooks": "Webhooks", "Save": "Salvar", "Cancel": "Cancelar", "Delete": "Excluir", "Edit": "Editar", "Create": "Criar", "Close": "Fechar", "Confirm": "Confirmar", "Search": "Buscar", "Search...": "Buscar…", "Deploy": "Implantar", "Redeploy": "Reimplantar", "Rebuild": "Reconstruir", "Reload": "Recarregar", "Start": "Iniciar", "Stop": "Parar", "Restart": "Reiniciar", "Update": "Atualizar", "Add": "Adicionar", "Remove": "Remover", "Copy": "Copiar", "Download": "Baixar", "Upload": "Enviar", "Back": "Voltar", "Next": "Próximo", "Previous": "Anterior", "Continue": "Continuar", "Refresh": "Atualizar", "Clear": "Limpar", "Apply": "Aplicar", "Test": "Testar", "Test Connection": "Testar conexão", "View": "Ver", "Open": "Abrir", "Actions": "Ações", "Action": "Ação", "Select": "Selecionar", "Select All": "Selecionar tudo", "Bulk Actions": "Ações em massa", "Show": "Mostrar", "Hide": "Ocultar", "Enable": "Ativar", "Disable": "Desativar", "Enabled": "Ativado", "Disabled": "Desativado", "Yes": "Sim", "No": "Não", "Done": "Concluído", "Loading...": "Carregando…", "Loading": "Carregando", "Saving...": "Salvando…", "Submit": "Enviar", "Reset": "Redefinir", "Rollback": "Reverter", "Cancel Deployment": "Cancelar implantação", "Clean Cache": "Limpar cache", "Refresh Token": "Gerar novo token", "Move": "Mover", "Duplicate": "Duplicar", "Clone": "Clonar", "Import": "Importar", "Export": "Exportar", "Run": "Executar", "Manual": "Manual", "Automatic": "Automático", "Create Service": "Novo serviço", "Create Project": "Novo projeto", "Project Environment": "Variáveis do ambiente", "Environment": "Ambiente", "Environments": "Ambientes", "Production environment": "Ambiente de produção", "Development environment": "Ambiente de desenvolvimento", "Staging environment": "Ambiente de homologação", "production": "produção", "development": "desenvolvimento", "staging": "homologação", "Application": "Aplicação", "Applications": "Aplicações", "Database": "Banco de dados", "Databases": "Bancos de dados", "Compose": "Compose", "Docker Compose": "Docker Compose", "Service": "Serviço", "Services": "Serviços", "General": "Geral", "Domains": "Domínios", "Domain": "Domínio", "Deployments": "Implantações", "Deployment": "Implantação", "Logs": "Logs", "Advanced": "Avançado", "Preview Deployments": "Prévias de implantação", "Environment Variables": "Variáveis de ambiente", "Variables": "Variáveis", "Volumes": "Volumes", "Ports": "Portas", "Port": "Porta", "Redirects": "Redirecionamentos", "Build Type": "Tipo de build", "Source": "Origem", "Provider": "Provedor", "Repository": "Repositório", "Branch": "Branch", "Name": "Nome", "Description": "Descrição", "App Name": "Nome do app", "Status": "Estado", "Type": "Tipo", "Created": "Criado", "Created At": "Criado em", "Recently deployed": "Implantados recentemente", "Select types...": "Todos os tipos", "All servers": "Todos os servidores", "Filter services...": "Filtrar serviços…", "Filter...": "Filtrar…", "Newest": "Mais novos", "Oldest": "Mais antigos", "Name (A-Z)": "Nome (A–Z)", "Name (Z-A)": "Nome (Z–A)", "Recently created": "Criados recentemente", "Running": "Rodando", "Error": "Erro", "Idle": "Parado", "Queued": "Na fila", "Cancelled": "Cancelado", "Success": "Sucesso", "Failed": "Falhou", "Pending": "Pendente", "No results found.": "Nenhum resultado.", "No results": "Nenhum resultado", "No data": "Sem dados", "No deployments found": "Nenhuma implantação encontrada", "No services": "Nenhum serviço", "Docker Image": "Imagem Docker", "Nixpacks": "Nixpacks", "Dockerfile": "Dockerfile", "Heroku Buildpacks": "Heroku Buildpacks", "Paketo Buildpacks": "Paketo Buildpacks", "Static": "Estático", "Railpack": "Railpack", "Terminal": "Terminal", "Backup": "Backup", "Restore": "Restaurar", "Credentials": "Credenciais", "External Credentials": "Credenciais externas", "Internal Credentials": "Credenciais internas", "Username": "Usuário", "User": "Usuário", "Host": "Host", "Command": "Comando", "Cron": "Cron", "Schedule": "Agendamento", "AI Assistant": "Assistente de IA", "Project": "Projeto", "Empty": "Vazio"}));
  const PHX = new Map([["Select a server","Selecione um servidor"],["Select a project","Selecione um projeto"],["Type here...","Digite aqui…"],["Search projects...","Buscar projetos…"],["Search logs...","Buscar nos logs…"]]);
  const ENV = new Map([
    ["Create Service", "Novo serviço"], ["Select All", "Selecionar tudo"], ["Bulk Actions", "Ações em massa"],
    ["Recently deployed", "Implantados recentemente"], ["Select types...", "Todos os tipos"], ["All servers", "Todos os servidores"],
    ["Services", "Serviços"], ["Application", "Aplicação"], ["Compose", "Compose"], ["Database", "Banco de dados"],
  ]);
  for (const [k, v] of Object.entries({"Add Domain": "Adicionar domínio", "Domains are used to access to the application": "Domínios usados para acessar a aplicação", "Validate DNS": "Validar DNS", "Domains are used to access to the compose": "Domínios usados para acessar o compose", "Deploy": "Implantar", "Reload": "Recarregar", "Rebuild": "Reconstruir", "Start": "Iniciar", "Stop": "Parar", "Open Terminal": "Abrir terminal", "Deploy Settings": "Configurações de implantação", "Autodeploy": "Implantação automática", "Clean Cache": "Limpar cache", "Build Type": "Tipo de build", "Provider": "Provedor", "Environment Settings": "Configurações de ambiente", "Build-time Variables": "Variáveis de build", "Build Args": "Argumentos de build", "Build Secrets": "Segredos de build", "Deployments": "Implantações", "No deployments found": "Nenhuma implantação encontrada", "Scheduled Jobs": "Tarefas agendadas", "Add Schedule": "Adicionar agendamento", "Cluster Settings": "Configurações do cluster", "Run Command": "Comando de execução", "Resources": "Recursos", "Memory Limit": "Limite de memória", "CPU Limit": "Limite de CPU", "Replicas": "Réplicas", "Are you sure?": "Tem certeza?", "This action cannot be undone": "Esta ação não pode ser desfeita", "Delete Domain": "Excluir domínio", "Edit Domain": "Editar domínio", "Host": "Host", "Path": "Caminho", "Container Port": "Porta do container", "HTTPS": "HTTPS", "Certificate Provider": "Provedor de certificado", "None": "Nenhum", "Let's Encrypt": "Let's Encrypt", "Generate Domain": "Gerar domínio", "Add Volume": "Adicionar volume", "Add Port": "Adicionar porta", "Add Redirect": "Adicionar redirecionamento", "Add Variable": "Adicionar variável", "Save": "Salvar", "Cancel": "Cancelar", "Create": "Criar", "Update": "Atualizar", "Open": "Abrir", "Copy": "Copiar", "Copied": "Copiado", "Logs": "Logs", "Download Logs": "Baixar logs", "Last": "Últimos", "Running": "Rodando", "Idle": "Parado", "Done": "Concluído", "Error": "Erro", "Active": "Ativo", "Inactive": "Inativo"})) ENV.set(k, v);
  for (const [k, v] of Object.entries({"Select a container to view logs": "Selecione um contêiner para ver os logs", "Native": "Nativo", "Limit to": "Limitar a", "Time range": "Período", "Log type": "Tipo de log", "All time": "Todo o período", "All": "Todos", "Pause": "Pausar", "Resume": "Retomar", "Download logs": "Baixar logs", "Watch the logs of the application in real time": "Acompanhe os logs da aplicação em tempo real", "Watch the logs of the compose in real time": "Acompanhe os logs do compose em tempo real"})) ENV.set(k, v);
  const ptPat = (t) => {
    let m;
    if ((m = /^(\d+) lines$/.exec(t))) return `${m[1]} linhas`;
    if ((m = /^Path: (.*)$/.exec(t))) return `Caminho: ${m[1]}`;
    if ((m = /^Port: (.*)$/.exec(t))) return `Porta: ${m[1]}`;
    if (t === "Cert: none") return "Certificado: nenhum";
    if ((m = /^Cert: (.*)$/.exec(t))) return `Certificado: ${m[1]}`;
    return null;
  };
  const UNITS = { second: "segundo", minute: "minuto", hour: "hora", day: "dia", month: "mês", year: "ano" };
  function ptAgo(t) {
    let m = /^Created (?:less than a minute|a few seconds) ago$/.exec(t);
    if (m) return "Criado agora há pouco";
    m = /^Created (about |over |almost )?(\d+|a|an) (second|minute|hour|day|month|year)s? ago$/.exec(t);
    if (!m) return null;
    const n = /^\d+$/.test(m[2]) ? +m[2] : 1;
    let u = UNITS[m[3]];
    if (n > 1) u = u === "mês" ? "meses" : u + "s";
    const pre = m[1] ? (m[1].trim() === "over" ? "mais de " : "cerca de ") : "";
    return `Criado há ${pre}${n} ${u}`;
  }
  const inProject = () => location.pathname.startsWith("/dashboard/project/");

  const ST = {
    "bg-green-500": ["done", "No ar"], "bg-red-500": ["error", "Com erro"],
    "bg-yellow-500": ["running", "Implantando"], "bg-orange-500": ["running", "Implantando"], "bg-amber-500": ["running", "Implantando"],
  };
  const stOf = (a) => {
    const d = a.querySelector('[data-slot="card"] > .absolute.-right-1 div');
    if (d) for (const c of Object.keys(ST)) if (d.classList.contains(c)) return ST[c];
    return ["idle", "Parado"];
  };
  function enhanceEnv() {
    if (!inProject()) return;
    const cards = [...document.querySelectorAll('a[data-slot="context-menu-trigger"][href*="/services/"]')];
    if (!cards.length) return;
    const sum = { done: 0, running: 0, error: 0, idle: 0 };
    for (const a of cards) {
      const [st, label] = stOf(a);
      sum[st]++;
      a.dataset.st = st;
      let pill = a.querySelector(".prk-state");
      if (!pill) {
        const ft = a.querySelector('[data-slot="card-footer"] > div');
        if (!ft) continue;
        pill = document.createElement("span");
        ft.prepend(pill);
      }
      pill.className = "prk-state prk-state-" + st;
      pill.textContent = label;
    }
    const grid = cards[0].parentElement;
    const host = grid.closest('[data-slot="card-content"]');
    if (!host) return;
    let r = host.querySelector(":scope > .prk-ribbon");
    if (!r) {
      r = document.createElement("div");
      r.className = "prk-ribbon";
      host.prepend(r);
    }
    const total = cards.length;
    const key = [sum.done, sum.running, sum.error, sum.idle].join();
    if (r.dataset.k === key) return;
    r.dataset.k = key;
    const seg = ["done", "running", "error", "idle"].map((k) => `<i class="prk-seg prk-seg-${k}" style="flex:${sum[k]}"></i>`).join("");
    const leg = [["done", "no ar"], ["running", "implantando"], ["error", "com erro"], ["idle", "parados"]]
      .map(([k, t]) => `<span class="${sum[k] ? "" : "prk-dim"}"><i class="prk-dot prk-seg-${k}"></i><b>${sum[k]}</b> ${t}</span>`).join("");
    r.innerHTML = `<div class="prk-ribbon-top"><div><strong>${sum.done}</strong><span>de ${total} ${total === 1 ? "serviço" : "serviços"} no ar</span></div><div class="prk-legend">${leg}</div></div><div class="prk-bar">${seg}</div>`;
  }

  const isLogin = () => !!document.getElementById("login-form");

  function fixText(node) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;
    const p = node.parentElement;
    if (!p || p.closest(SKIP)) return;
    let text = raw.trim();
    let out = text;
    if (isLogin() && LOGIN.has(text)) out = LOGIN.get(text);
    if (!p.closest('a[href*="/services/"] [data-slot="card-title"]')) out = DICT.get(text) || out;
    if (inProject()) out = ptAgo(text) || ENV.get(text) || ptPat(text) || out;
    if (/Dokploy/.test(out)) out = out.replace(/Dokploy/g, NAME);
    if (out !== text) {
      node.nodeValue = raw.replace(text, out);
      if (p.matches("blockquote p")) p.classList.add("prk-tagline");
    }
  }

  function fixTree(root) {
    if (root.nodeType === 3) return fixText(root);
    if (root.nodeType !== 1) return;
    if (root.matches && root.matches(SKIP)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(fixText);
    brandSvgs(root);
    for (const i of root.querySelectorAll("input[placeholder]")) {
      const t = DICT.get(i.placeholder) || PHX.get(i.placeholder);
      if (t) i.placeholder = t;
    }
    if (inProject()) {
      for (const a of root.querySelectorAll('a[data-slot="context-menu-trigger"][href*="/services/"]')) {
        if (a.dataset.prk) continue;
        a.dataset.prk = "1";
        const kind = (/\/services\/([a-z]+)\//.exec(a.getAttribute("href")) || [])[1] || "";
        const label = { application: "app", compose: "compose" }[kind] || kind;
        const ft = a.querySelector('[data-slot="card-footer"] > div');
        if (ft && label) {
          const b = document.createElement("span");
          b.className = "prk-kind";
          b.textContent = label;
          ft.append(b);
        }
      }
      enhanceEnv();
    }
    if (isLogin()) {
      for (const i of root.querySelectorAll("input[placeholder]")) {
        const t = PLACEHOLDERS.get(i.getAttribute("placeholder"));
        if (t) i.setAttribute("placeholder", t);
      }
      const hero = root.querySelector(".absolute.inset-0.bg-muted");
      if (hero) hero.classList.add("prk-hero");
      const form = root.querySelector("#login-form");
      if (form && form.parentElement) form.parentElement.classList.add("prk-login-form");
      const pk = root.querySelector('#login-form ~ button[data-variant="outline"]');
      if (pk && !pk.previousElementSibling?.classList.contains("prk-or")) {
        const or = document.createElement("div");
        or.className = "prk-or";
        or.textContent = "ou";
        pk.before(or);
      }
    }
  }

  function fixTitle() {
    if (/Dokploy/.test(document.title)) document.title = document.title.replace(/Dokploy/g, NAME);
  }

  /* ---------------- tema claro / escuro ---------------- */
  const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  const MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>';
  const html = document.documentElement;
  const isDark = () => html.classList.contains("dark");

  function paintToggle(btn) {
    const dark = isDark();
    btn.querySelector("svg").innerHTML = dark ? SUN : MOON;
    btn.querySelector(".prk-theme-label").textContent = dark ? "Tema claro" : "Tema escuro";
    btn.setAttribute("aria-label", dark ? "Mudar para o tema claro" : "Mudar para o tema escuro");
  }

  function setTheme(next) {
    html.classList.add("prk-switching");
    try { localStorage.setItem("theme", next); } catch { /* ignora */ }
    // next-themes (usado pelo Dokploy) escuta este evento e troca a classe sozinho
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: "theme", newValue: next, storageArea: localStorage }));
    } catch { /* ignora */ }
    setTimeout(() => {
      if (isDark() !== (next === "dark")) {
        html.classList.toggle("dark", next === "dark");
        html.style.colorScheme = next;
      }
    }, 60);
    setTimeout(() => html.classList.remove("prk-switching"), 450);
  }

  function makeToggle(float) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "prk-theme" + (float ? " prk-theme-float" : "");
    b.dataset.prk = "theme";
    b.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"></svg><span class="prk-theme-label"></span>';
    paintToggle(b);
    b.addEventListener("click", () => setTheme(isDark() ? "light" : "dark"));
    return b;
  }

  function syncToggle() {
    const footer = document.querySelector('[data-sidebar="footer"]');
    const hasSidebarBtn = document.querySelector("[data-sidebar] .prk-theme");
    if (footer && !hasSidebarBtn) {
      document.querySelector(".prk-theme-float")?.remove();
      footer.prepend(makeToggle(false));
    } else if (!footer && isLogin() && !document.querySelector(".prk-theme")) {
      // só o login não tem sidebar; no painel o botão fica no rodapé da sidebar
      document.body.append(makeToggle(true));
    }
    if (footer) document.querySelector(".prk-theme-float")?.remove();
  }

  new MutationObserver(() => {
    for (const b of document.querySelectorAll(".prk-theme")) paintToggle(b);
  }).observe(html, { attributes: true, attributeFilter: ["class"] });

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const still = reduced;

  /* ---------------- transição entre telas ---------------- */
  let lastPath = location.pathname;
  let waiting = false, minTimer = 0, quietTimer = 0, capTimer = 0;
  const getMain = () => document.querySelector('[data-slot="sidebar-inset"]') || document.querySelector("main");
  // 1) a rota mudou: o conteúdo atual some de leve (sidebar e topbar não mexem)
  function startWait() {
    const main = getMain();
    if (!main || reduced) return;
    waiting = true;
    main.classList.remove("prk-in");
    main.classList.add("prk-wait");
    clearTimeout(minTimer); clearTimeout(capTimer);
    minTimer = setTimeout(bump, 140);
    capTimer = setTimeout(endWait, 1600);
  }
  // 2) enquanto a nova página monta, espera o DOM sossegar
  function bump() {
    if (!waiting) return;
    clearTimeout(quietTimer);
    quietTimer = setTimeout(endWait, 90);
  }
  // 3) conteúdo novo entra com fade + subida suave
  function endWait() {
    if (!waiting) return;
    waiting = false;
    clearTimeout(minTimer); clearTimeout(quietTimer); clearTimeout(capTimer);
    const main = getMain();
    if (!main) return;
    main.classList.remove("prk-wait");
    void main.offsetWidth;
    main.classList.add("prk-in");
    setTimeout(() => main.classList.remove("prk-in"), 700);
  }
  function routeChanged() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    startWait();
  }

  /* ---------------- laço principal ---------------- */
  let pending = new Set();
  let queued = false;
  const flush = () => {
    queued = false;
    const batch = pending;
    pending = new Set();
    try {
      for (const n of batch) if (n.isConnected) fixTree(n);
      fixTitle();
      syncToggle();
      routeChanged();
    } catch (e) { console.warn("[prakon]", e); }
  };
  const queue = (n) => {
    pending.add(n);
    if (!queued) { queued = true; requestAnimationFrame(flush); }
  };

  new MutationObserver((records) => {
    if (waiting) bump();
    for (const r of records) {
      if (r.type === "characterData") queue(r.target);
      else for (const n of r.addedNodes) if (n.nodeType === 1 || n.nodeType === 3) queue(n);
    }
    if (!queued) { queued = true; requestAnimationFrame(flush); }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  for (const m of ["pushState", "replaceState"]) {
    const orig = history[m];
    history[m] = function (...a) {
      const r = orig.apply(this, a);
      routeChanged();
      return r;
    };
  }
  window.addEventListener("popstate", routeChanged);

  /* ---------------- login: grade que acende perto do cursor ---------------- */
  let glow = null;
  function initGlow() {
    const box = document.querySelector(".container:has(#login-form)");
    if (!box || box.__prkGlow || still) return;
    box.__prkGlow = true;
    let tx = innerWidth / 2, ty = innerHeight * 0.4, x = tx, y = ty, run = false;
    const paint = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      box.style.setProperty("--mx", x.toFixed(1) + "px");
      box.style.setProperty("--my", y.toFixed(1) + "px");
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.5) requestAnimationFrame(paint);
      else run = false;
    };
    const go = () => { if (!run) { run = true; requestAnimationFrame(paint); } };
    window.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; box.classList.add("prk-glow-on"); go(); }, { passive: true });
    document.addEventListener("pointerleave", () => box.classList.remove("prk-glow-on"));
    box.style.setProperty("--mx", x + "px");
    box.style.setProperty("--my", y + "px");
    glow = box;
  }
  setInterval(initGlow, 600);
  initGlow();

  /* ---------------- sidebar: brilho que segue o cursor nos itens ---------------- */
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest && e.target.closest('[data-sidebar="menu-button"]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--sx", (e.clientX - r.left).toFixed(0) + "px");
    el.style.setProperty("--sy", (e.clientY - r.top).toFixed(0) + "px");
  }, { passive: true });

  queue(document.body);
})();
