/* Tema do Dokploy: painéis extras na home (/dashboard/home).
 *
 *  - Traduz os textos da home para português
 *  - Alerta quando algum serviço está com erro
 *  - Uso do servidor (CPU / memória / disco)
 *  - Grade de apps com busca e link direto para abrir cada site
 *
 * Tudo roda no navegador, usando a sessão de quem já está logado no painel.
 * Se algo falhar, a home original continua funcionando normalmente.
 */
(() => {
  "use strict";

  const HOME_PATH = /^\/dashboard\/home\/?$/;
  const DOMAIN_TTL = 10 * 60 * 1000;
  const APPS_REFRESH = 15000;
  const SERVER_REFRESH = 5000;

  /* ---------------------------- utilidades ---------------------------- */

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const navigate = (href) => {
    const r = window.next && window.next.router;
    if (r && typeof r.push === "function") r.push(href);
    else location.assign(href);
  };

  /** Chama a API tRPC do próprio painel (várias chamadas em um único request). */
  async function trpc(calls) {
    const input = {};
    calls.forEach((c, i) => {
      input[i] = { json: c.input === undefined ? null : c.input };
    });
    const url =
      "/api/trpc/" + calls.map((c) => c.path).join(",") +
      "?batch=1&input=" + encodeURIComponent(JSON.stringify(input));
    const res = await fetch(url, { credentials: "same-origin" });
    const body = await res.json();
    return body.map((x) => (x && x.result && x.result.data ? x.result.data.json : null));
  }

  const fmtGB = (b) => {
    const gb = b / 1024 ** 3;
    return (gb >= 100 ? gb.toFixed(0) : gb.toFixed(1)) + " GB";
  };
  const fmtUptime = (s) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  /* ---------------------------- tradução ------------------------------ */

  const CARD_STATUS = { running: "no ar", errored: "com erro", idle: "parado" };
  const DEPLOY_STATUS = { done: "concluído", running: "em andamento", error: "erro", idle: "parado" };
  const AGO_UNIT = {
    minute: () => "min",
    hour: () => "h",
    day: (n) => (n === 1 ? "dia" : "dias"),
    month: (n) => (n === 1 ? "mês" : "meses"),
    year: (n) => (n === 1 ? "ano" : "anos"),
  };

  const RULES = [
    [/^Welcome back, (.+)$/, "Bem-vindo de volta, $1"],
    [/^Welcome back$/, "Bem-vindo de volta"],
    [/^Go to projects$/, "Ir para projetos"],
    [/^Projects$/, "Projetos"],
    [/^Services$/, "Serviços"],
    [/^Deploys \/ 7d$/, "Deploys / 7 dias"],
    [/^(\d+) environments?$/, (m, n) => `${n} ${n === "1" ? "ambiente" : "ambientes"}`],
    [/^(\d+) apps · (\d+) compose · (\d+) db$/, "$1 apps · $2 compose · $3 bancos"],
    [/^([+-]\d+)% vs prev 7d$/, "$1% vs 7 dias anteriores"],
    [/^no prior data$/, "sem dados anteriores"],
    [/^no activity yet$/, "sem atividade ainda"],
    [/^Recent deployments$/, "Deploys recentes"],
    [/^view all →$/, "ver todos →"],
    [/^No deployments yet\.$/, "Nenhum deploy ainda."],
    [/^You do not have permission to view deployments\.$/, "Você não tem permissão para ver deploys."],
    [/^less than a minute ago$/, "há menos de 1 min"],
    [
      /^(?:about |over |almost )?(\d+) (minute|hour|day|month|year)s? ago$/,
      (m, n, u) => `há ${n} ${AGO_UNIT[u](Number(n))}`,
    ],
  ];

  function translateText(node) {
    const raw = node.nodeValue;
    const text = raw.trim();
    if (!text) return;

    let out = text;
    const inDeployRow = node.parentElement && node.parentElement.closest("ul.divide-y");
    const dict = inDeployRow ? DEPLOY_STATUS : CARD_STATUS;
    if (Object.prototype.hasOwnProperty.call(dict, text)) {
      out = dict[text];
    } else {
      for (const [re, rep] of RULES) {
        if (re.test(text)) {
          out = text.replace(re, rep);
          break;
        }
      }
    }
    if (out !== text) node.nodeValue = raw.replace(text, out);
  }

  function translateTree(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateText);
  }

  /* ----------------------------- dados -------------------------------- */

  const STATUS_ORDER = { error: 0, running: 1, done: 2, idle: 3 };
  const STATUS_LABEL = { error: "erro", running: "implantando", done: "no ar", idle: "parado" };

  /** Transforma project.all em uma lista simples de serviços (apps e compose). */
  function flattenServices(projects) {
    const out = [];
    for (const p of projects || []) {
      for (const e of p.environments || []) {
        for (const a of e.applications || []) {
          out.push({
            kind: "application",
            id: a.applicationId,
            name: a.name,
            status: a.applicationStatus || "idle",
            project: p.name,
            env: e.name,
            href: `/dashboard/project/${p.projectId}/environment/${e.environmentId}/services/application/${a.applicationId}`,
          });
        }
        for (const c of e.compose || []) {
          out.push({
            kind: "compose",
            id: c.composeId,
            name: c.name,
            status: c.composeStatus || "idle",
            project: p.name,
            env: e.name,
            href: `/dashboard/project/${p.projectId}/environment/${e.environmentId}/services/compose/${c.composeId}`,
          });
        }
      }
    }
    return out.sort(
      (a, b) =>
        (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
        a.name.localeCompare(b.name),
    );
  }

  const loadCache = () => {
    try { return JSON.parse(localStorage.getItem("dkt-domains") || "{}"); } catch { return {}; }
  };
  const saveCache = (c) => {
    try { localStorage.setItem("dkt-domains", JSON.stringify(c)); } catch { /* cheio/bloqueado */ }
  };

  const domainUrl = (list) => {
    const d = (list || [])[0];
    if (!d || !d.host) return "";
    const path = d.path && d.path !== "/" ? d.path : "";
    return `${d.https ? "https" : "http"}://${d.host}${path}`;
  };

  /** Descobre o site de cada serviço (com cache, pois domínios quase não mudam). */
  async function resolveDomains(services) {
    const cache = loadCache();
    const now = Date.now();
    const missing = services.filter((s) => !cache[s.id] || now - cache[s.id].t > DOMAIN_TTL);

    for (let i = 0; i < missing.length; i += 20) {
      const chunk = missing.slice(i, i + 20);
      try {
        const res = await trpc(
          chunk.map((s) =>
            s.kind === "compose"
              ? { path: "domain.byComposeId", input: { composeId: s.id } }
              : { path: "domain.byApplicationId", input: { applicationId: s.id } },
          ),
        );
        chunk.forEach((s, idx) => {
          cache[s.id] = { t: now, url: domainUrl(res[idx]) };
        });
      } catch { /* tenta de novo no próximo ciclo */ }
    }
    saveCache(cache);
    return Object.fromEntries(services.map((s) => [s.id, (cache[s.id] || {}).url || ""]));
  }

  /* ------------------------------ UI ---------------------------------- */

  function buildServerCard() {
    const card = el("section", "dkt-card");
    const head = el("div", "dkt-card-h");
    head.append(el("h2", null, "Servidor"), el("span", "dkt-muted dkt-uptime", ""));
    const body = el("div", "dkt-server");

    const meters = {};
    for (const key of ["cpu", "mem", "disk"]) {
      const wrap = el("div");
      const top = el("div", "dkt-meter-top");
      const label = el("span", null, { cpu: "CPU", mem: "Memória", disk: "Disco" }[key]);
      const value = el("span", null, "—");
      top.append(label, value);
      const bar = el("div", "dkt-bar");
      const fill = document.createElement("i");
      bar.append(fill);
      wrap.append(top, bar);
      body.append(wrap);
      meters[key] = { value, fill };
    }
    const foot = el("div", "dkt-foot dkt-muted", "");
    body.append(foot);
    card.append(head, body);

    const setMeter = (m, pct, text) => {
      const p = Math.max(0, Math.min(100, pct));
      m.value.textContent = text;
      m.fill.style.width = p + "%";
      m.fill.className = p >= 90 ? "err" : p >= 75 ? "warn" : "";
    };

    card.update = (s) => {
      if (!s) {
        foot.textContent = "Métricas indisponíveis";
        return;
      }
      setMeter(meters.cpu, s.cpu.percent, s.cpu.percent.toFixed(0) + "%");
      setMeter(meters.mem, (s.memory.used / s.memory.total) * 100, `${fmtGB(s.memory.used)} / ${fmtGB(s.memory.total)}`);
      setMeter(meters.disk, (s.disk.used / s.disk.total) * 100, `${fmtGB(s.disk.used)} / ${fmtGB(s.disk.total)}`);
      head.querySelector(".dkt-uptime").textContent = "ligado há " + fmtUptime(s.uptime);
      foot.textContent = `${s.cpu.cores} núcleos · carga ${s.cpu.load.map((x) => x.toFixed(2)).join(" / ")}`;
    };
    return card;
  }

  function buildAppsCard() {
    const card = el("section", "dkt-card");
    const head = el("div", "dkt-card-h");
    const title = el("h2", null, "Seus apps");
    const search = el("input", "dkt-search");
    search.type = "search";
    search.placeholder = "Buscar app ou projeto…  ( / )";
    search.setAttribute("aria-label", "Buscar app ou projeto");
    head.append(title, search);

    const grid = el("div", "dkt-grid");
    for (let i = 0; i < 6; i++) grid.append(el("div", "dkt-skel"));
    card.append(head, grid);

    let services = [];
    let urls = {};

    const render = () => {
      const q = search.value.trim().toLowerCase();
      const shown = services.filter((s) =>
        !q || `${s.name} ${s.project} ${s.env} ${urls[s.id] || ""}`.toLowerCase().includes(q),
      );
      title.textContent = `Seus apps (${shown.length}${q ? ` de ${services.length}` : ""})`;
      grid.replaceChildren();
      if (!shown.length) {
        grid.append(el("div", "dkt-empty dkt-muted", q ? "Nada encontrado para essa busca." : "Nenhum app ainda."));
        grid.style.display = "block";
        return;
      }
      grid.style.display = "";
      for (const s of shown) {
        const item = el("div", "dkt-app");
        const top = el("div", "dkt-app-top");
        top.append(el("span", "dkt-dot " + s.status));
        const name = el("a", "dkt-app-name", s.name);
        name.href = s.href;
        name.addEventListener("click", (e) => e.stopPropagation());
        top.append(name);
        const sub = el("div", "dkt-app-sub", `${s.project} · ${s.env}`);
        const bot = el("div", "dkt-app-bot");
        bot.append(el("span", "dkt-tag", STATUS_LABEL[s.status] || s.status));
        if (urls[s.id]) {
          const open = el("a", "dkt-open", "Abrir ↗");
          open.href = urls[s.id];
          open.target = "_blank";
          open.rel = "noopener noreferrer";
          open.title = urls[s.id];
          bot.append(open);
        }
        item.append(top, sub, bot);
        item.addEventListener("click", (e) => {
          if (e.target.closest(".dkt-open")) return;
          navigate(s.href);
        });
        grid.append(item);
      }
    };

    search.addEventListener("input", render);
    card.search = search;
    card.update = (list, map) => {
      services = list;
      urls = map || urls;
      render();
    };
    return card;
  }

  function buildAlert(errors) {
    const box = el("div", "dkt-alert");
    box.setAttribute("role", "alert");
    const n = errors.length;
    box.append(el("strong", null, n === 1 ? "1 serviço com erro:" : `${n} serviços com erro:`));
    for (const s of errors.slice(0, 6)) {
      const a = el("a", null, s.name);
      a.href = s.href;
      box.append(a);
    }
    if (n > 6) box.append(el("span", "dkt-muted", `+${n - 6}`));
    return box;
  }

  /* --------------------------- montagem ------------------------------- */

  function mount(container) {
    container.dataset.dkt = "home";
    container.__dkt = true;

    const panels = el("div", "dkt-panels");
    const server = buildServerCard();
    const apps = buildAppsCard();
    panels.append(server, apps);
    container.append(panels);

    let alertBox = null;
    const alive = () => container.isConnected;

    const onKey = (e) => {
      if (!alive()) return document.removeEventListener("keydown", onKey);
      const t = e.target;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        apps.search.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    async function refreshApps() {
      if (!alive()) return;
      try {
        const [projects] = await trpc([{ path: "project.all" }]);
        const services = flattenServices(projects);
        apps.update(services);
        resolveDomains(services).then((map) => alive() && apps.update(services, map));

        const errors = services.filter((s) => s.status === "error");
        if (alertBox) alertBox.remove();
        alertBox = errors.length ? buildAlert(errors) : null;
        if (alertBox) container.append(alertBox);
      } catch {
        /* mantém o que já estava na tela */
      }
      if (alive()) setTimeout(refreshApps, APPS_REFRESH);
    }

    async function refreshServer() {
      if (!alive()) return;
      try {
        const res = await fetch("/__stats", { credentials: "same-origin", cache: "no-store" });
        server.update(res.ok ? await res.json() : null);
      } catch {
        server.update(null);
      }
      if (alive()) setTimeout(refreshServer, SERVER_REFRESH);
    }

    refreshApps();
    refreshServer();
  }

  /* ----------------------- detecção da página ------------------------- */

  function findHomeContainer() {
    const h1 = Array.from(document.querySelectorAll("h1")).find((h) =>
      /^(welcome back|bem-vindo de volta)/i.test(h.textContent.trim()),
    );
    // h1 -> div do cabeçalho -> container flex da home
    return h1 && h1.parentElement ? h1.parentElement.parentElement : null;
  }

  function sync() {
    if (!HOME_PATH.test(location.pathname)) return;
    const container = findHomeContainer();
    if (!container) return;
    if (!container.__dkt) mount(container);

    // Bloco nativo de "Deploys recentes" fica depois dos painéis do tema
    for (const child of container.children) {
      if (child.classList.contains("dkt-panels") || child.classList.contains("dkt-alert")) continue;
      if (/recent deployments|deploys recentes/i.test(child.textContent.slice(0, 80))) {
        child.setAttribute("data-dkt-after", "");
      }
    }
    translateTree(container);
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      try { sync(); } catch (e) { console.warn("[dokploy-theme]", e); }
    });
  };

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  for (const m of ["pushState", "replaceState"]) {
    const orig = history[m];
    history[m] = function (...args) {
      const r = orig.apply(this, args);
      schedule();
      return r;
    };
  }
  window.addEventListener("popstate", schedule);
  schedule();
})();
