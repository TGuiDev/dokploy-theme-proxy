/* Tema do Dokploy: painéis extras na home (/dashboard/home).
 *
 *  - Traduz os textos da home para português
 *  - Alerta quando algum serviço está com erro
 *  - Uso do servidor (CPU / memória / disco) em medidores de LED
 *  - Grade de apps com busca e link direto para abrir cada site
 *
 * Estilo: Tailwind v4 com prefixo "dk:" (ver src/input.css). As classes precisam
 * aparecer escritas por inteiro neste arquivo; depois de editar rode `npm run build`.
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
  const SEGMENTS = 24;

  /* ---------------------------- utilidades ---------------------------- */

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /** Zera a rolagem da janela e de qualquer contêiner rolável (o painel rola dentro de um <main>). */
  const scrollTop = () => {
    window.scrollTo(0, 0);
    for (const n of document.querySelectorAll("main, [class*='overflow-y'], [class*='overflow-auto']")) {
      if (n.scrollTop) n.scrollTop = 0;
    }
  };

  const navigate = (href) => {
    scrollTop();
    const r = window.next && window.next.router;
    if (r && typeof r.push === "function") r.push(href);
    else location.assign(href);
    // a nova tela monta depois do push: garante que ela comece no topo
    for (const ms of [50, 250, 600]) setTimeout(scrollTop, ms);
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
  const hostOf = (url) => {
    try { return new URL(url).host; } catch { return url; }
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
    // /dashboard/projects
    [/^Create and manage your projects$/, "Crie e gerencie seus projetos"],
    [/^Create Project$/, "Criar projeto"],
    [/^No projects found$/, "Nenhum projeto encontrado"],
    [/^Loading\.\.\.$/, "Carregando..."],
    [/^Created$/, "Criado"],
    [/^(\d+) services?$/, (m, n) => `${n} ${n === "1" ? "serviço" : "serviços"}`],
    [/^Name \(A-Z\)$/, "Nome (A-Z)"],
    [/^Name \(Z-A\)$/, "Nome (Z-A)"],
    [/^Newest first$/, "Mais recentes"],
    [/^Oldest first$/, "Mais antigos"],
    [/^Most services$/, "Mais serviços"],
    [/^Least services$/, "Menos serviços"],
    [/^Sort by\.\.\.$/, "Ordenar por..."],
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

  /* Classes completas (o Tailwind só enxerga o que está escrito por inteiro). */
  const STATUS_STYLE = {
    done: {
      led: "dk:bg-(--ok) dk:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ok)_18%,transparent)]",
      chip: "dk:bg-(--ok)/10 dk:text-(--ok)",
    },
    running: {
      led: "dk:bg-(--warn) dk:animate-pulse dk:motion-reduce:animate-none",
      chip: "dk:bg-(--warn)/10 dk:text-(--warn)",
    },
    error: {
      led: "dk:bg-(--destructive) dk:shadow-[0_0_0_3px_color-mix(in_oklab,var(--destructive)_22%,transparent)]",
      chip: "dk:bg-(--destructive)/10 dk:text-(--destructive)",
    },
    idle: {
      led: "dk:bg-(--muted-foreground)",
      chip: "dk:bg-(--muted) dk:text-(--muted-foreground)",
    },
  };
  const styleOf = (status) => STATUS_STYLE[status] || STATUS_STYLE.idle;

  const SEG_OFF = "dk:bg-(--muted)";
  const SEG_ON = {
    ok: "dk:bg-(--ok)",
    warn: "dk:bg-(--warn)",
    err: "dk:bg-(--destructive)",
  };
  const SEG_BASE =
    "dk:h-3 dk:flex-1 dk:rounded-[2px] dk:transition-colors dk:duration-500 dk:motion-reduce:transition-none";

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

  /** Medidor de LEDs: N segmentos que acendem conforme o uso. */
  function buildMeter(label) {
    const wrap = el("div", "dk:flex dk:flex-col dk:gap-2");
    const top = el("div", "dk:flex dk:items-baseline dk:justify-between dk:gap-3");
    top.append(
      el("span", "dk:text-xs dk:font-medium dk:uppercase dk:tracking-wider dk:text-(--muted-foreground)", label),
      (() => {
        const v = el("span", "dk:font-mono dk:text-sm dk:tabular-nums dk:text-(--foreground)", "—");
        v.dataset.value = "";
        return v;
      })(),
    );
    const row = el("div", "dk:flex dk:gap-[3px]");
    const segs = Array.from({ length: SEGMENTS }, () => el("i", `${SEG_BASE} ${SEG_OFF}`));
    row.append(...segs);
    wrap.append(top, row);

    wrap.set = (pct, text) => {
      const p = Math.max(0, Math.min(100, pct));
      const on = Math.round((p / 100) * SEGMENTS);
      const level = p >= 90 ? "err" : p >= 75 ? "warn" : "ok";
      top.querySelector("[data-value]").textContent = text;
      segs.forEach((s, i) => {
        s.className = `${SEG_BASE} ${i < on ? SEG_ON[level] : SEG_OFF}`;
      });
    };
    return wrap;
  }

  function buildServerCard() {
    const card = el(
      "section",
      "dk:flex dk:flex-col dk:gap-5 dk:rounded-2xl dk:border dk:border-(--border) dk:bg-(--card) dk:p-5 dk:text-(--foreground) dk:shadow-lg dk:shadow-black/20",
    );
    const head = el("div", "dk:flex dk:items-center dk:justify-between dk:gap-3");
    const title = el("div", "dk:flex dk:items-center dk:gap-2");
    title.append(
      el("span", "dk:size-2 dk:rounded-full dk:bg-teal-400 dk:shadow-[0_0_0_3px_rgba(45,212,191,0.2)]"),
      el("h2", "dk:text-sm dk:font-semibold dk:tracking-tight", "Servidor"),
    );
    const uptime = el("span", "dk:font-mono dk:text-xs dk:text-(--muted-foreground)", "");
    head.append(title, uptime);

    const meters = {
      cpu: buildMeter("CPU"),
      mem: buildMeter("Memória"),
      disk: buildMeter("Disco"),
    };
    const foot = el("p", "dk:font-mono dk:text-xs dk:text-(--foreground)0", "");
    card.append(head, meters.cpu, meters.mem, meters.disk, foot);

    card.update = (s) => {
      if (!s) {
        foot.textContent = "Métricas indisponíveis";
        return;
      }
      meters.cpu.set(s.cpu.percent, s.cpu.percent.toFixed(0) + "%");
      meters.mem.set((s.memory.used / s.memory.total) * 100, `${fmtGB(s.memory.used)} / ${fmtGB(s.memory.total)}`);
      meters.disk.set((s.disk.used / s.disk.total) * 100, `${fmtGB(s.disk.used)} / ${fmtGB(s.disk.total)}`);
      uptime.textContent = "ligado há " + fmtUptime(s.uptime);
      foot.textContent = `${s.cpu.cores} núcleos · carga ${s.cpu.load.map((x) => x.toFixed(2)).join(" / ")}`;
    };
    return card;
  }

  const MUTED_PAGE = "dk:text-[hsl(var(--muted-foreground))]";

  function buildAppsSection() {
    const section = el("section", "dk:flex dk:min-w-0 dk:flex-col dk:gap-3");

    const head = el("div", "dk:flex dk:flex-wrap dk:items-center dk:justify-between dk:gap-3");
    const heading = el("div", "dk:flex dk:flex-col");
    const title = el("h2", "dk:text-base dk:font-semibold dk:tracking-tight dk:text-[hsl(var(--foreground))]", "Seus apps");
    const summary = el("p", `dk:text-xs ${MUTED_PAGE}`, "");
    heading.append(title, summary);

    const search = el(
      "input",
      "dk:h-9 dk:w-full dk:max-w-60 dk:rounded-lg dk:border dk:border-(--border) dk:bg-(--card) dk:px-3 dk:text-sm dk:text-(--foreground) dk:outline-none dk:placeholder:text-(--foreground)0 dk:focus:ring-2 dk:focus:ring-(--ring)/60",
    );
    search.type = "search";
    search.placeholder = "Buscar app ou projeto…  ( / )";
    search.setAttribute("aria-label", "Buscar app ou projeto");
    head.append(heading, search);

    const GRID = "dk:grid dk:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] dk:gap-3";
    const grid = el("div", GRID);
    for (let i = 0; i < 6; i++) {
      grid.append(el("div", "dk:h-28 dk:animate-pulse dk:rounded-xl dk:bg-(--muted) dk:motion-reduce:animate-none"));
    }
    section.append(head, grid);

    let services = [];
    let urls = {};
    let firstPaint = true;

    const buildTile = (s, index) => {
      const st = styleOf(s.status);
      const tile = el(
        "div",
        "dk:group dk:flex dk:cursor-pointer dk:flex-col dk:gap-3 dk:rounded-xl dk:border dk:border-(--border) dk:bg-(--card) dk:p-4 dk:text-(--foreground) dk:shadow-md dk:shadow-black/10 dk:transition dk:duration-150 dk:hover:bg-(--muted) dk:motion-reduce:transition-none" +
          (firstPaint ? " dk:animate-rise dk:motion-reduce:animate-none" : ""),
      );
      if (firstPaint) tile.style.animationDelay = Math.min(index, 14) * 35 + "ms";

      const top = el("div", "dk:flex dk:items-center dk:gap-2.5");
      top.append(el("span", `dk:size-2 dk:shrink-0 dk:rounded-full ${st.led}`));
      const name = el("a", "dk:min-w-0 dk:flex-1 dk:truncate dk:text-sm dk:font-semibold dk:text-(--foreground) dk:no-underline", s.name);
      name.href = s.href;
      name.addEventListener("click", (e) => e.stopPropagation());
      top.append(name);

      if (urls[s.id]) {
        const open = el(
          "a",
          "dk:flex dk:size-7 dk:shrink-0 dk:items-center dk:justify-center dk:rounded-full dk:bg-(--muted) dk:text-sm dk:text-(--foreground) dk:no-underline dk:transition dk:hover:bg-(--foreground) dk:hover:text-(--background) dk:group-hover:bg-zinc-700",
          "↗",
        );
        open.href = urls[s.id];
        open.target = "_blank";
        open.rel = "noopener noreferrer";
        open.title = `Abrir ${urls[s.id]}`;
        open.setAttribute("aria-label", `Abrir ${s.name} em nova aba`);
        open.dataset.open = "";
        top.append(open);
      }

      const sub = el("div", "dk:flex dk:flex-col dk:gap-0.5");
      sub.append(el("span", "dk:truncate dk:text-xs dk:text-(--muted-foreground)", `${s.project} · ${s.env}`));
      sub.append(
        el(
          "span",
          "dk:truncate dk:font-mono dk:text-[11px] dk:text-(--foreground)0",
          urls[s.id] ? hostOf(urls[s.id]) : "sem domínio",
        ),
      );

      const bot = el("div", "dk:mt-auto dk:flex dk:items-center dk:gap-2");
      bot.append(
        el(
          "span",
          `dk:rounded-full dk:px-2 dk:py-0.5 dk:text-[10px] dk:font-medium dk:uppercase dk:tracking-wider ${st.chip}`,
          STATUS_LABEL[s.status] || s.status,
        ),
      );
      if (s.kind === "compose") {
        bot.append(el("span", "dk:text-[10px] dk:uppercase dk:tracking-wider dk:text-(--foreground)0", "compose"));
      }

      tile.append(top, sub, bot);
      tile.addEventListener("click", (e) => {
        if (e.target.closest("[data-open]")) return;
        navigate(s.href);
      });
      return tile;
    };

    const render = () => {
      const q = search.value.trim().toLowerCase();
      const shown = services.filter((s) =>
        !q || `${s.name} ${s.project} ${s.env} ${urls[s.id] || ""}`.toLowerCase().includes(q),
      );

      const count = (st) => services.filter((s) => s.status === st).length;
      const parts = [`${count("done")} no ar`];
      if (count("running")) parts.push(`${count("running")} implantando`);
      if (count("error")) parts.push(`${count("error")} com erro`);
      if (count("idle")) parts.push(`${count("idle")} parados`);
      title.textContent = `Seus apps (${shown.length}${q ? ` de ${services.length}` : ""})`;
      summary.textContent = services.length ? parts.join(" · ") : "";

      grid.replaceChildren();
      if (!shown.length) {
        grid.className = "";
        grid.append(
          el(
            "div",
            `dk:rounded-xl dk:bg-(--muted) dk:px-4 dk:py-10 dk:text-center dk:text-sm dk:text-(--muted-foreground)`,
            q ? "Nada encontrado para essa busca." : "Nenhum app ainda. Crie o primeiro em Projetos.",
          ),
        );
        return;
      }
      grid.className = GRID;
      shown.forEach((s, i) => grid.append(buildTile(s, i)));
      if (services.length) firstPaint = false;
    };

    search.addEventListener("input", render);
    section.search = search;
    section.update = (list, map) => {
      services = list;
      urls = map || urls;
      render();
    };
    return section;
  }

  function buildAlert(errors) {
    const box = el(
      "div",
      "dk:order-first dk:flex dk:flex-wrap dk:items-center dk:gap-2.5 dk:rounded-xl dk:bg-red-950 dk:px-4 dk:py-3 dk:text-sm dk:text-red-100",
    );
    box.dataset.dk = "alert";
    box.setAttribute("role", "alert");
    box.append(el("span", "dk:size-2 dk:rounded-full dk:bg-(--destructive) dk:animate-pulse dk:motion-reduce:animate-none"));
    const n = errors.length;
    box.append(el("strong", "dk:font-semibold", n === 1 ? "1 serviço com erro:" : `${n} serviços com erro:`));
    for (const s of errors.slice(0, 6)) {
      const a = el(
        "a",
        "dk:rounded-full dk:bg-(--destructive)/20 dk:px-2.5 dk:py-0.5 dk:text-xs dk:text-red-50 dk:no-underline dk:transition dk:hover:bg-(--destructive)/35",
        s.name,
      );
      a.href = s.href;
      box.append(a);
    }
    if (n > 6) box.append(el("span", "dk:text-xs dk:text-(--destructive)", `+${n - 6}`));
    return box;
  }

  /* --------------------------- montagem ------------------------------- */

  function mount(container) {
    container.__dkt = true;

    const panels = el(
      "div",
      "dk:order-1 dk:grid dk:grid-cols-1 dk:items-start dk:gap-4 dk:lg:grid-cols-[340px_minmax(0,1fr)]",
    );
    panels.dataset.dk = "panels";
    const server = buildServerCard();
    const apps = buildAppsSection();
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

  /* ----------------- estilo dos blocos nativos do Dokploy ------------- */

  const NATIVE_STAT =
    "dk:border-transparent dk:border dk:border-(--border) dk:bg-(--card) dk:text-(--foreground) dk:shadow-md dk:shadow-black/10 dk:transition dk:duration-150 dk:hover:bg-(--muted) dk:motion-reduce:transition-none dk:[&_.text-muted-foreground]:text-(--muted-foreground) dk:[&_.text-foreground]:text-(--foreground) dk:[&_.text-3xl]:tabular-nums dk:[&_.text-3xl]:tracking-tight";
  const NATIVE_BLOCK = "dk:border-transparent dk:shadow-md dk:shadow-black/10";
  const AFTER = "dk:order-2";

  function styleNative(container) {
    for (const card of container.querySelectorAll(".rounded-xl.border")) {
      if (card.__dkn || card.closest("[data-dk]")) continue;
      card.__dkn = true;
      const isStat = card.parentElement && card.parentElement.classList.contains("grid");
      card.classList.add(...(isStat ? NATIVE_STAT : NATIVE_BLOCK).split(" "));
    }
  }

  /* ================= /dashboard/projects (página própria) ================
   * A lista nativa fica escondida (continua no DOM, só sem aparecer) e esta
   * página a substitui, usando os mesmos dados do painel (project.all) e as
   * mesmas mutações (project.create / update / remove). Visual estilo Vercel:
   * Geist, bordas finas, botão primário invertido, claro e escuro.
   * ===================================================================== */

  const PROJECTS_PATH = /^\/dashboard\/projects\/?$/;
  const SERVICE_KEYS = ["applications", "compose", "postgres", "mysql", "mariadb", "mongo", "redis", "libsql"];
  const DB_KEYS = ["postgres", "mysql", "mariadb", "mongo", "redis", "libsql"];

  const ICON_PATHS = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    external: '<path d="M7 17 17 7M7 7h10v10"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    open: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };
  /** Ícone SVG inline (herda a cor do texto). `cls` define o tamanho. */
  const icon = (name, cls) => {
    const s = el("span", `dk:inline-flex dk:shrink-0 ${cls}`);
    s.innerHTML =
      `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
    return s;
  };

  const rtf = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" }) : null;
  const ago = (date) => {
    const diff = (new Date(date).getTime() - Date.now()) / 1000;
    for (const [unit, sec] of [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]]) {
      if (Math.abs(diff) >= sec) return rtf.format(Math.round(diff / sec), unit);
    }
    return "agora";
  };

  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /** Mutação tRPC (POST) usando a sessão de quem está logado. */
  async function mutate(path, input) {
    const res = await fetch(`/api/trpc/${path}?batch=1`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 0: { json: input } }),
    });
    const body = await res.json();
    const r = Array.isArray(body) ? body[0] : body;
    if (r && r.error) throw new Error((r.error.json && r.error.json.message) || "Falha na operação");
    return r && r.result && r.result.data ? r.result.data.json : null;
  }

  /** Aviso rápido no canto da tela. */
  function toast(text, bad) {
    const t = el(
      "div",
      "dkv dk:fixed dk:bottom-5 dk:right-5 dk:z-[200] dk:max-w-sm dk:animate-rise dk:rounded-lg dk:border dk:border-(--v-border-strong) dk:bg-(--v-card) dk:px-4 dk:py-3 dk:text-sm dk:text-(--v-fg) dk:shadow-lg dk:shadow-black/20",
    );
    t.setAttribute("role", "status");
    t.append(el("span", `dk:mr-2 dk:inline-block dk:size-2 dk:rounded-full ${bad ? "dk:bg-(--destructive)" : "dk:bg-(--ok)"}`), document.createTextNode(text));
    document.body.append(t);
    setTimeout(() => t.remove(), 3800);
  }

  const BTN_BASE =
    "dk:inline-flex dk:h-10 dk:items-center dk:justify-center dk:gap-2 dk:rounded-lg dk:px-4 dk:text-sm dk:font-medium dk:whitespace-nowrap dk:transition dk:duration-150 dk:outline-none dk:focus-visible:ring-2 dk:focus-visible:ring-(--v-fg)/40 dk:disabled:cursor-not-allowed dk:disabled:opacity-50";
  const BTN_PRIMARY = `${BTN_BASE} dk:bg-(--v-btn-bg) dk:text-(--v-btn-fg) dk:hover:bg-(--v-btn-hover)`;
  const BTN_GHOST = `${BTN_BASE} dk:border dk:border-(--v-border) dk:bg-(--v-card) dk:text-(--v-fg) dk:hover:border-(--v-border-strong) dk:hover:bg-(--v-hover)`;
  const BTN_DANGER = `${BTN_BASE} dk:bg-red-600 dk:text-white dk:hover:bg-(--destructive)`;
  const INPUT =
    "dk:rounded-lg dk:border dk:border-(--v-border) dk:bg-(--v-card) dk:px-3 dk:text-sm dk:text-(--v-fg) dk:outline-none dk:transition dk:placeholder:text-(--v-subtle) dk:hover:border-(--v-border-strong) dk:focus:border-(--v-fg) dk:focus:ring-2 dk:focus:ring-(--v-fg)/15";

  /** Diálogo simples. `onSubmit(valores)` pode lançar erro para exibir no diálogo. */
  function openModal({ title, description, fields = [], confirmLabel, danger, confirmDisabled, onSubmit }) {
    const overlay = el(
      "div",
      "dkv dk:fixed dk:inset-0 dk:z-[150] dk:flex dk:items-center dk:justify-center dk:bg-black/60 dk:p-4 dk:backdrop-blur-sm",
    );
    const box = el(
      "form",
      "dk:flex dk:w-full dk:max-w-md dk:animate-rise dk:flex-col dk:gap-5 dk:rounded-xl dk:border dk:border-(--v-border-strong) dk:bg-(--v-card) dk:p-6 dk:text-(--v-fg) dk:shadow-2xl dk:shadow-black/30",
    );
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", title);

    const head = el("div", "dk:flex dk:flex-col dk:gap-1.5");
    head.append(el("h2", "dk:text-lg dk:font-semibold dk:tracking-[-0.02em]", title));
    if (description) head.append(el("p", "dk:text-sm dk:leading-relaxed dk:text-(--v-muted)", description));
    box.append(head);

    const inputs = {};
    for (const f of fields) {
      const wrap = el("label", "dk:flex dk:flex-col dk:gap-1.5");
      wrap.append(el("span", "dk:text-[13px] dk:font-medium", f.label));
      const input = f.multiline ? el("textarea", `${INPUT} dk:w-full dk:min-h-20 dk:resize-y dk:py-2`) : el("input", `${INPUT} dk:w-full dk:h-9`);
      if (!f.multiline) input.type = "text";
      input.value = f.value || "";
      input.placeholder = f.placeholder || "";
      if (f.required) input.required = true;
      wrap.append(input);
      box.append(wrap);
      inputs[f.name] = input;
    }

    const error = el("p", "dk:hidden dk:rounded-lg dk:bg-(--destructive)/10 dk:px-3 dk:py-2 dk:text-sm dk:text-red-500");
    error.setAttribute("role", "alert");
    const actions = el("div", "dk:flex dk:justify-end dk:gap-2");
    const cancel = el("button", BTN_GHOST, "Cancelar");
    cancel.type = "button";
    const ok = el("button", danger ? BTN_DANGER : BTN_PRIMARY, confirmLabel);
    ok.type = "submit";
    ok.disabled = !!confirmDisabled;
    actions.append(cancel, ok);
    box.append(error, actions);
    overlay.append(box);

    const close = () => {
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKey, true);
    cancel.addEventListener("click", close);
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) close();
    });
    box.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (ok.disabled) return;
      ok.disabled = true;
      error.classList.add("dk:hidden");
      const values = Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.value.trim()]));
      try {
        await onSubmit(values);
        close();
      } catch (err) {
        error.textContent = err && err.message ? err.message : "Algo deu errado. Tente de novo.";
        error.classList.remove("dk:hidden");
        ok.disabled = false;
      }
    });

    document.body.append(overlay);
    const first = Object.values(inputs)[0];
    (first || ok).focus();
  }

  /* ---------- modelo de dados de cada projeto ---------- */

  const SORTS = {
    "createdAt-desc": "Mais recentes",
    "createdAt-asc": "Mais antigos",
    "name-asc": "Nome (A–Z)",
    "name-desc": "Nome (Z–A)",
    "services-desc": "Mais serviços",
    attention: "Precisam de atenção",
  };

  function deriveProject(p) {
    const count = { error: 0, running: 0, done: 0, idle: 0 };
    let total = 0;
    let apps = 0;
    let compose = 0;
    let dbs = 0;
    const urlTargets = [];
    const ticks = [];
    for (const env of p.environments || []) {
      for (const key of SERVICE_KEYS) {
        for (const item of env[key] || []) {
          total++;
          const st = item.applicationStatus || item.composeStatus || "idle";
          count[st in count ? st : "idle"]++;
          ticks.push({ st: st in count ? st : "idle", name: item.name || (DB_KEYS.includes(key) ? key.replace(/^(mysql|postgres|mariadb|mongo|redis|libsql).*/, "$1") : key), kind: key });
          if (key === "applications") {
            apps++;
            urlTargets.push({ kind: "application", id: item.applicationId });
          } else if (key === "compose") {
            compose++;
            urlTargets.push({ kind: "compose", id: item.composeId });
          } else if (DB_KEYS.includes(key)) dbs++;
        }
      }
    }
    const env = (p.environments || []).find((e) => e.isDefault) || (p.environments || [])[0];
    return {
      raw: p,
      id: p.projectId,
      name: p.name,
      description: p.description || "",
      createdAt: p.createdAt,
      tags: (p.projectTags || []).map((t) => t.tag).filter(Boolean),
      total,
      ticks: ticks.sort((a, b) => (STATUS_ORDER[a.st] ?? 9) - (STATUS_ORDER[b.st] ?? 9)),
      apps,
      compose,
      dbs,
      count,
      urlTargets,
      href: env ? `/dashboard/project/${p.projectId}/environment/${env.environmentId}` : "",
    };
  }

  function healthOf(p) {
    const ok = { dot: "dk:bg-(--s-ok)", pill: "dk:bg-(--s-ok)/12 dk:text-(--s-ok)" };
    const warn = { dot: "dk:bg-(--s-warn) dk:animate-pulse dk:motion-reduce:animate-none", pill: "dk:bg-(--s-warn)/14 dk:text-(--s-warn)" };
    const err = { dot: "dk:bg-(--s-err)", pill: "dk:bg-(--s-err)/12 dk:text-(--s-err)" };
    const off = { dot: "dk:bg-(--v-border-strong)", pill: "dk:bg-(--v-hover) dk:text-(--v-muted)" };
    if (!p.total) return { ...off, text: "Vazio", rank: 3 };
    if (p.count.error) return { ...err, text: plural(p.count.error, "com erro", "com erro"), rank: 0 };
    if (p.count.running) return { ...warn, text: "Implantando", rank: 1 };
    if (p.count.done) return { ...ok, text: "No ar", rank: 2 };
    return { ...off, text: "Parado", rank: 2 };
  }

  /** Selo de estado: ponto + texto em fundo suave. */
  const statusPill = (h) => {
    const colour = h.pill.split(" ").find((c) => c.includes("text-")) || "";
    const n = el("span", `dk:inline-flex dk:w-fit dk:items-center dk:gap-2 dk:text-[13px] dk:whitespace-nowrap ${colour}`);
    n.append(el("span", `dk:size-1.5 dk:rounded-full ${h.dot}`), document.createTextNode(h.text));
    return n;
  };

  const TICK_COLOR = {
    done: "dk:bg-(--s-ok)",
    running: "dk:bg-(--s-warn) dk:animate-pulse dk:motion-reduce:animate-none",
    error: "dk:bg-(--s-err)",
    idle: "dk:bg-(--v-border-strong)",
  };
  /** Um traço por serviço: a cor diz o estado, o tooltip diz qual é. */
  const tick = (t, cls) => {
    const n = el("span", `dk:inline-block dk:shrink-0 dk:rounded-[2px] ${TICK_COLOR[t.st] || TICK_COLOR.idle} ${cls}`);
    n.title = `${t.name} · ${STATUS_LABEL[t.st] || "parado"}`;
    return n;
  };

  function servicesLabel(p) {
    const parts = [];
    if (p.apps) parts.push(plural(p.apps, "app", "apps"));
    if (p.compose) parts.push(plural(p.compose, "compose", "composes"));
    if (p.dbs) parts.push(plural(p.dbs, "banco", "bancos"));
    return parts.length ? parts.join(" · ") : "Sem serviços";
  }

  /** Monograma neutro: o destaque da página é o estado, não a cor do projeto. */
  function avatar(name, size) {
    const letters = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2) || "?";
    return el("span", `dk:flex dk:shrink-0 dk:items-center dk:justify-center dk:rounded-lg dk:border dk:border-(--v-border) dk:bg-(--v-hover) dk:font-mono dk:text-xs dk:font-medium dk:uppercase dk:text-(--v-muted) ${size}`, letters);
  }

  /* ---------- página ---------- */

  function mountProjects(nativeRoot) {
    const page = el("div", "dkv dk:flex dk:w-full dk:flex-col dk:gap-5 dk:py-2 dk:text-(--v-fg)");
    page.dataset.dk = "projects";
    nativeRoot.classList.add("dk:hidden");
    nativeRoot.after(page);
    nativeRoot.__dkp = page;
    let openMenu = null;
    const alive = () => {
      const ok = page.isConnected;
      if (!ok && openMenu) { openMenu.remove(); openMenu = null; }
      return ok;
    };

    const store = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
    const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignora */ } };

    const state = {
      projects: [],
      urls: {},
      perms: { create: true, remove: true },
      loading: true,
      failed: false,
      query: "",
      tag: "",
      filter: "all",
      sort: SORTS[store("dkt-psort", "")] ? store("dkt-psort", "") : "createdAt-desc",
      view: store("dkt-pview3", "list") === "grid" ? "grid" : "list",
    };

    /* ----- cabeçalho ----- */
    const create = el("button", BTN_PRIMARY);
    create.type = "button";
    create.append(icon("plus", "dk:size-4"), document.createTextNode("Novo projeto"));

    const header = el("div", "dk:flex dk:flex-wrap dk:items-end dk:justify-between dk:gap-x-6 dk:gap-y-3");
    const titles0 = el("div", "dk:flex dk:flex-col dk:gap-1");
    titles0.append(el("h1", "dk:m-0 dk:text-[28px] dk:leading-none dk:font-semibold dk:tracking-[-0.04em]", "Projetos"));
    const summary = el("p", "dk:m-0 dk:font-mono dk:text-[13px] dk:text-(--v-muted)", "Carregando…");
    titles0.append(summary);
    header.append(titles0, create);

    /* Faixa da frota: cada serviço é um segmento, agrupados por estado */
    const fleet = el("section", "dk:flex dk:flex-col dk:gap-4 dk:rounded-2xl dk:border dk:border-(--v-border) dk:bg-(--v-card) dk:px-5 dk:py-4");
    fleet.setAttribute("aria-label", "Resumo");
    const fTop = el("div", "dk:flex dk:flex-wrap dk:items-end dk:justify-between dk:gap-x-8 dk:gap-y-3");
    const fBig = el("div", "dk:flex dk:items-baseline dk:gap-2.5");
    const fNum = el("span", "dk:text-[34px] dk:leading-none dk:font-semibold dk:tracking-[-0.04em] dk:tabular-nums", "–");
    const fOf = el("span", "dk:text-sm dk:text-(--v-muted)", "");
    fBig.append(fNum, fOf);
    const fLegend = el("div", "dk:flex dk:flex-wrap dk:items-center dk:gap-x-5 dk:gap-y-1.5 dk:text-[13px]");
    fTop.append(fBig, fLegend);
    const fBar = el("div", "dk:flex dk:h-2.5 dk:items-stretch dk:gap-[3px]");
    fBar.setAttribute("aria-hidden", "true");
    fleet.append(fTop, fBar);

    /* ----- barra de controles ----- */
    const bar = el("div", "dk:flex dk:flex-wrap dk:items-center dk:gap-2");

    const searchWrap = el("div", "dk:relative dk:min-w-56 dk:flex-1");
    const search = el("input", `${INPUT} dk:w-full dk:h-10 dk:pr-9 dk:pl-9`);
    search.type = "search";
    search.placeholder = "Buscar projetos…";
    search.setAttribute("aria-label", "Buscar projetos");
    const sIcon = icon("search", "dk:pointer-events-none dk:absolute dk:top-1/2 dk:left-3 dk:size-4 dk:-translate-y-1/2 dk:text-(--v-subtle)");
    const kbd = el("kbd", "dk:pointer-events-none dk:absolute dk:top-1/2 dk:right-2.5 dk:-translate-y-1/2 dk:rounded dk:border dk:border-(--v-border) dk:px-1.5 dk:font-mono dk:text-[11px] dk:text-(--v-subtle)", "/");
    searchWrap.append(sIcon, search, kbd);

    const SEG = "dk:flex dk:rounded-lg dk:border dk:border-(--v-border) dk:bg-(--v-card) dk:p-0.5";
    const SEG_BTN = "dk:flex dk:h-8 dk:items-center dk:justify-center dk:rounded-md dk:text-[13px] dk:font-medium dk:transition dk:outline-none dk:focus-visible:ring-2 dk:focus-visible:ring-(--v-accent)";
    const SEG_ON_CLS = "dk:bg-(--v-fg) dk:text-(--v-bg)";
    const SEG_OFF_CLS = "dk:text-(--v-muted) dk:hover:text-(--v-fg)";

    const filterBox = el("div", SEG);
    filterBox.setAttribute("role", "group");
    filterBox.setAttribute("aria-label", "Filtrar por estado");
    const filterBtns = {};
    for (const [key, label] of [["all", "Todos"], ["attention", "Atenção"], ["live", "No ar"]]) {
      const b = el("button", `${SEG_BTN} dk:px-3`, label);
      b.type = "button";
      b.addEventListener("click", () => {
        state.filter = key;
        paintFilter();
        renderList();
      });
      filterBtns[key] = b;
      filterBox.append(b);
    }
    const paintFilter = () => {
      for (const [key, b] of Object.entries(filterBtns)) {
        const on = state.filter === key;
        b.setAttribute("aria-pressed", String(on));
        b.className = `${SEG_BTN} dk:px-3 ${on ? SEG_ON_CLS : SEG_OFF_CLS}`;
      }
    };
    paintFilter();

    const sort = el("select", `${INPUT} dk:h-10 dk:w-44 dk:cursor-pointer dk:pr-8 dk:[color-scheme:light] dk:dark:[color-scheme:dark]`);
    sort.setAttribute("aria-label", "Ordenar projetos");
    for (const [value, label] of Object.entries(SORTS)) {
      const o = el("option", null, label);
      o.value = value;
      sort.append(o);
    }
    sort.value = state.sort;

    const toggle = el("div", SEG);
    const viewBtns = {};
    for (const [mode, ic, label] of [["list", "list", "Ver em lista"], ["grid", "grid", "Ver em grade"]]) {
      const b = el("button", `${SEG_BTN} dk:w-8`);
      b.type = "button";
      b.title = label;
      b.setAttribute("aria-label", label);
      b.append(icon(ic, "dk:size-4"));
      b.addEventListener("click", () => {
        state.view = mode;
        save("dkt-pview3", mode);
        paintToggle();
        renderList();
      });
      viewBtns[mode] = b;
      toggle.append(b);
    }
    const paintToggle = () => {
      for (const [mode, b] of Object.entries(viewBtns)) {
        const on = state.view === mode;
        b.setAttribute("aria-pressed", String(on));
        b.className = `${SEG_BTN} dk:w-8 ${on ? SEG_ON_CLS : SEG_OFF_CLS}`;
      }
    };
    paintToggle();

    bar.append(searchWrap, filterBox, sort, toggle);

    const tagsRow = el("div", "dk:flex dk:flex-wrap dk:items-center dk:gap-2");
    const foot = el("p", "dk:m-0 dk:text-center dk:font-mono dk:text-xs dk:text-(--v-subtle)");
    const results = el("div", "dk:flex dk:flex-col");
    page.append(header, bar, tagsRow, results, foot);

    /* ----- ações ----- */
    const refresh = async () => {
      const [projects] = await trpc([{ path: "project.all" }]);
      state.projects = (projects || []).map(deriveProject);
      state.loading = false;
      state.failed = false;
      paintAll();
      const targets = state.projects.flatMap((p) => p.urlTargets.map((t) => ({ ...t })));
      resolveDomains(targets).then((map) => {
        if (!alive()) return;
        state.urls = map;
        renderList();
      });
    };

    const askCreate = () =>
      openModal({
        title: "Novo projeto",
        description: "Um projeto agrupa os apps, bancos e serviços que pertencem ao mesmo produto.",
        fields: [
          { name: "name", label: "Nome", placeholder: "ex.: loja-online", required: true },
          { name: "description", label: "Descrição (opcional)", multiline: true, placeholder: "Para que serve este projeto?" },
        ],
        confirmLabel: "Criar projeto",
        onSubmit: async (v) => {
          if (!v.name) throw new Error("Informe o nome do projeto.");
          const r = await mutate("project.create", { name: v.name, description: v.description });
          toast(`Projeto “${v.name}” criado`);
          const pid = r && r.project && r.project.projectId;
          const eid = r && r.environment && r.environment.environmentId;
          if (pid && eid) navigate(`/dashboard/project/${pid}/environment/${eid}`);
          else await refresh();
        },
      });

    const askEdit = (p) =>
      openModal({
        title: "Editar projeto",
        fields: [
          { name: "name", label: "Nome", value: p.name, required: true },
          { name: "description", label: "Descrição", value: p.description, multiline: true },
        ],
        confirmLabel: "Salvar alterações",
        onSubmit: async (v) => {
          if (!v.name) throw new Error("Informe o nome do projeto.");
          await mutate("project.update", { projectId: p.id, name: v.name, description: v.description });
          toast("Projeto atualizado");
          await refresh();
        },
      });

    const askDelete = (p) =>
      openModal({
        title: `Excluir “${p.name}”?`,
        description: p.total
          ? `Este projeto ainda tem ${plural(p.total, "serviço", "serviços")}. Exclua os serviços primeiro para poder remover o projeto.`
          : "Esta ação não pode ser desfeita.",
        confirmLabel: "Excluir projeto",
        danger: true,
        confirmDisabled: p.total > 0,
        onSubmit: async () => {
          await mutate("project.remove", { projectId: p.id });
          toast("Projeto excluído");
          await refresh();
        },
      });

    create.addEventListener("click", askCreate);

    /* ----- menu ⋯ de cada card ----- */
    const closeMenu = () => {
      if (openMenu) openMenu.remove();
      openMenu = null;
    };
    document.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    const showMenu = (anchor, p) => {
      closeMenu();
      const menu = el(
        "div",
        "dkv dk:fixed dk:z-[120] dk:flex dk:w-44 dk:animate-rise dk:motion-reduce:animate-none dk:flex-col dk:rounded-lg dk:border dk:border-(--v-border-strong) dk:bg-(--v-card) dk:p-1 dk:text-sm dk:text-(--v-fg) dk:shadow-xl dk:shadow-black/20",
      );
      menu.setAttribute("role", "menu");
      const item = (ic, label, fn, danger, off) => {
        const b = el(
          "button",
          `dk:flex dk:items-center dk:gap-2.5 dk:rounded-md dk:px-2.5 dk:py-2 dk:text-left dk:transition dk:outline-none dk:hover:bg-(--v-hover) dk:focus-visible:bg-(--v-hover) ${danger ? "dk:text-red-500" : ""}`,
        );
        b.type = "button";
        b.setAttribute("role", "menuitem");
        b.append(icon(ic, "dk:size-4"), document.createTextNode(label));
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          closeMenu();
          fn();
        });
        return b;
      };
      if (p.href) menu.append(item("open", "Abrir projeto", () => navigate(p.href)));
      menu.append(item("pencil", "Editar", () => askEdit(p)));
      if (state.perms.remove) {
        menu.append(el("div", "dk:my-1 dk:h-px dk:bg-(--v-border)"), item("trash", "Excluir", () => askDelete(p), true));
      }
      document.body.append(menu);
      const r = anchor.getBoundingClientRect();
      const h = menu.offsetHeight;
      const below = r.bottom + 4 + h <= window.innerHeight;
      menu.style.top = `${below ? r.bottom + 4 : Math.max(8, r.top - 4 - h)}px`;
      menu.style.left = `${Math.max(8, Math.min(r.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8))}px`;
      menu.__anchor = anchor;
      openMenu = menu;
    };

    /* ----- cards ----- */
    const hostOf2 = (p) => {
      for (const t of p.urlTargets) if (state.urls[t.id]) return state.urls[t.id];
      return "";
    };

    const COLS = "dk:grid dk:grid-cols-[minmax(0,1fr)_auto_2rem] dk:items-center dk:gap-x-4 dk:md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)_2rem]";

    const buildCard = (p, index, list) => {
      const h = healthOf(p);
      const url = hostOf2(p);
      const card = el(
        "article",
        list
          ? `${COLS} dk:group dk:relative dk:cursor-pointer dk:border-t dk:border-(--v-border) dk:px-4 dk:py-3.5 dk:transition dk:duration-150 dk:first:border-t-0 dk:hover:bg-(--v-hover)`
          : `dk:group dk:relative dk:flex dk:cursor-pointer dk:flex-col dk:gap-5 dk:rounded-xl dk:border dk:bg-(--v-card) dk:p-4 dk:transition dk:duration-200 dk:hover:shadow-(--v-shadow) ${h.rank === 0 ? "dk:border-(--s-err)/45" : h.rank === 1 ? "dk:border-(--s-warn)/45" : "dk:border-(--v-border) dk:hover:border-(--v-border-strong)"}`,
      );
      if (state.animate) {
        card.classList.add("dk:animate-rise", "dk:motion-reduce:animate-none");
        card.style.animationDelay = Math.min(index, 12) * 30 + "ms";
      }

      const name = el("a", "dk:truncate dk:text-[15px] dk:leading-5 dk:font-semibold dk:tracking-[-0.015em] dk:text-(--v-fg) dk:no-underline dk:outline-none dk:hover:underline dk:focus-visible:underline", p.name);
      if (p.href) name.href = p.href;
      name.addEventListener("click", (e) => e.stopPropagation());

      const domain = url
        ? (() => {
            const a = el("a", "dk:flex dk:min-w-0 dk:items-center dk:gap-1.5 dk:font-mono dk:text-xs dk:text-(--v-muted) dk:no-underline dk:transition dk:hover:text-(--v-accent)");
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.title = `Abrir ${url}`;
            a.append(icon("globe", "dk:size-3.5"), el("span", "dk:truncate", hostOf(url)));
            a.addEventListener("click", (e) => e.stopPropagation());
            return a;
          })()
        : el("span", "dk:font-mono dk:text-xs dk:text-(--v-subtle)", "sem domínio");

      const titles = el("div", "dk:flex dk:min-w-0 dk:flex-1 dk:flex-col dk:gap-0.5");
      titles.append(name, domain);

      const menuHost = el("div", "dk:relative dk:shrink-0");
      const dots = el(
        "button",
        "dk:flex dk:size-8 dk:items-center dk:justify-center dk:rounded-md dk:text-(--v-muted) dk:transition dk:outline-none dk:hover:bg-(--v-border) dk:hover:text-(--v-fg) dk:focus-visible:ring-2 dk:focus-visible:ring-(--v-accent)",
      );
      dots.type = "button";
      dots.setAttribute("aria-label", `Ações de ${p.name}`);
      dots.setAttribute("aria-haspopup", "menu");
      dots.append(icon("dots", "dk:size-4"));
      dots.addEventListener("click", (e) => {
        e.stopPropagation();
        if (openMenu && openMenu.__anchor === menuHost) closeMenu();
        else showMenu(menuHost, p);
      });
      menuHost.append(dots);

      const pill = statusPill(h);
      const meta = el("span", "dk:text-[13px] dk:text-(--v-muted)", servicesLabel(p));
      const when = el("span", "dk:text-[13px] dk:text-(--v-subtle)", p.createdAt ? ago(p.createdAt) : "");

      const strip = el("div", "dk:flex dk:h-4 dk:items-stretch dk:gap-[3px]");
      strip.setAttribute("aria-hidden", "true");
      if (p.ticks.length) for (const t of p.ticks.slice(0, 24)) strip.append(tick(t, "dk:w-1.5"));

      if (list) {
        const left = el("div", "dk:flex dk:min-w-0 dk:items-center dk:gap-3");
        left.append(avatar(p.name, "dk:size-9 dk:max-sm:hidden"), titles);
        const stateCol = el("div", "dk:flex dk:flex-col dk:items-start dk:gap-1.5");
        stateCol.append(pill);
        const svcCol = el("div", "dk:flex dk:flex-col dk:max-md:hidden");
        svcCol.append(meta);
        const whenCol = el("div", "dk:max-md:hidden");
        whenCol.append(when);
        card.append(left, stateCol, svcCol, whenCol, menuHost);
      } else {
        const top = el("div", "dk:flex dk:items-start dk:gap-3");
        top.append(avatar(p.name, "dk:size-9"), titles, menuHost);
        card.append(top);

        const foot2 = el("div", "dk:mt-auto dk:flex dk:items-center dk:justify-between dk:gap-3 dk:border-t dk:border-(--v-border) dk:pt-3");
        foot2.append(pill, meta);
        card.append(foot2);
      }

      card.addEventListener("click", () => p.href && navigate(p.href));
      return card;
    };

    /* ----- lista / estados ----- */
    const visible = () => {
      const q = state.query.trim().toLowerCase();
      let out = state.projects.filter(
        (p) =>
          (!q || `${p.name} ${p.description} ${p.tags.map((t) => t.name).join(" ")}`.toLowerCase().includes(q)) &&
          (!state.tag || p.tags.some((t) => t.tagId === state.tag)) &&
          (state.filter === "all" ||
            (state.filter === "attention" ? p.count.error > 0 || p.count.running > 0 : p.count.done > 0 && !p.count.error)),
      );
      const [key, dir] = state.sort.split("-");
      const sorters = {
        createdAt: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
        services: (a, b) => a.total - b.total,
      };
      if (state.sort === "attention") out = [...out].sort((a, b) => healthOf(a).rank - healthOf(b).rank || a.name.localeCompare(b.name, "pt-BR"));
      else out = [...out].sort((a, b) => (sorters[key](a, b)) * (dir === "asc" ? 1 : -1));
      return out;
    };

    const emptyState = (filtered) => {
      const box = el("div", "dk:flex dk:flex-col dk:items-center dk:gap-3 dk:rounded-xl dk:border dk:border-dashed dk:border-(--v-border-strong) dk:px-6 dk:py-16 dk:text-center");
      box.append(icon("folder", "dk:size-8 dk:text-(--v-subtle)"));
      box.append(el("h2", "dk:text-base dk:font-semibold dk:tracking-[-0.01em]", filtered ? "Nenhum projeto encontrado" : "Você ainda não tem projetos"));
      box.append(el("p", "dk:max-w-sm dk:text-sm dk:text-(--v-muted)", filtered ? "Tente outro termo de busca ou limpe os filtros." : "Crie o primeiro projeto para começar a publicar apps e bancos de dados."));
      if (filtered) {
        const clear = el("button", BTN_GHOST, "Limpar filtros");
        clear.type = "button";
        clear.addEventListener("click", () => {
          state.query = "";
          state.tag = "";
          state.filter = "all";
          paintFilter();
          search.value = "";
          paintTags();
          renderList();
        });
        box.append(clear);
      } else if (state.perms.create) {
        const b = el("button", BTN_PRIMARY);
        b.type = "button";
        b.append(icon("plus", "dk:size-4"), document.createTextNode("Criar projeto"));
        b.addEventListener("click", askCreate);
        box.append(b);
      }
      return box;
    };

    function renderList() {
      results.replaceChildren();
      if (state.loading) {
        const g = el("div", "dk:grid dk:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] dk:gap-4");
        for (let i = 0; i < 6; i++) g.append(el("div", "dk:h-16 dk:animate-pulse dk:rounded-xl dk:border dk:border-(--v-border) dk:bg-(--v-hover) dk:motion-reduce:animate-none"));
        results.append(g);
        return;
      }
      if (state.failed && !state.projects.length) {
        const retry = el("button", BTN_GHOST, "Tentar de novo");
        retry.type = "button";
        retry.addEventListener("click", () => { state.loading = true; renderList(); refresh().catch(fail); });
        const box = el("div", "dk:flex dk:flex-col dk:items-center dk:gap-3 dk:rounded-xl dk:border dk:border-(--v-border) dk:px-6 dk:py-16 dk:text-center");
        box.append(el("h2", "dk:text-base dk:font-semibold", "Não foi possível carregar os projetos"), el("p", "dk:text-sm dk:text-(--v-muted)", "Verifique sua conexão e tente novamente."), retry);
        results.append(box);
        return;
      }
      const shown = visible();
      foot.textContent = "";
      if (!shown.length) {
        results.append(emptyState(!!(state.query || state.tag || state.filter !== "all") && state.projects.length > 0));
        return;
      }
      if (state.view === "list") {
        const wrap = el("div", "dk:flex dk:flex-col dk:overflow-hidden dk:rounded-xl dk:border dk:border-(--v-border) dk:bg-(--v-card)");
        const head = el("div", `${COLS} dk:border-b dk:border-(--v-border) dk:px-4 dk:py-2.5 dk:text-xs dk:text-(--v-subtle)`);
        head.append(el("span", null, "Projeto"), el("span", null, "Estado"), el("span", "dk:max-md:hidden", "Serviços"), el("span", "dk:max-md:hidden", "Criação"), el("span"));
        head.children[1].classList.add("dk:max-md:justify-self-end");
        wrap.append(head);
        shown.forEach((p, i) => wrap.append(buildCard(p, i, true)));
        results.append(wrap);
      } else {
        const g = el("div", "dk:grid dk:grid-cols-[repeat(auto-fill,minmax(340px,1fr))] dk:gap-4");
        shown.forEach((p, i) => g.append(buildCard(p, i, false)));
        results.append(g);
      }
      foot.textContent = shown.length === state.projects.length ? `${plural(shown.length, "projeto", "projetos")}` : `Mostrando ${shown.length} de ${plural(state.projects.length, "projeto", "projetos")}`;
      state.animate = false;
    }

    function paintTags() {
      tagsRow.replaceChildren();
      const all = new Map();
      for (const p of state.projects) for (const t of p.tags) all.set(t.tagId, t);
      if (!all.size) return;
      const chip = (label, id) => {
        const on = state.tag === id;
        const b = el(
          "button",
          `dk:rounded-full dk:border dk:px-3 dk:py-1 dk:text-xs dk:font-medium dk:transition dk:outline-none dk:focus-visible:ring-2 dk:focus-visible:ring-(--v-fg)/40 ${on ? "dk:border-(--v-fg) dk:bg-(--v-fg) dk:text-(--v-bg)" : "dk:border-(--v-border) dk:text-(--v-muted) dk:hover:border-(--v-border-strong) dk:hover:text-(--v-fg)"}`,
          label,
        );
        b.type = "button";
        b.setAttribute("aria-pressed", String(on));
        b.addEventListener("click", () => {
          state.tag = on ? "" : id;
          paintTags();
          renderList();
        });
        return b;
      };
      tagsRow.append(chip("Todas as tags", ""));
      for (const t of all.values()) tagsRow.append(chip(t.name, t.tagId));
    }

    function paintSummary() {
      if (state.loading) return;
      const n = state.projects.length;
      const sum = { done: 0, running: 0, error: 0, idle: 0 };
      const all = [];
      for (const p of state.projects) for (const t of p.ticks) {
        const st = t.st in sum ? t.st : "idle";
        sum[st]++;
        all.push({ st, name: `${p.name} · ${t.name}` });
      }
      const services = all.length;
      summary.textContent = `${plural(n, "projeto", "projetos")} · ${sum.done} de ${plural(services, "serviço", "serviços")} no ar`;

      fNum.textContent = String(sum.done);
      fOf.textContent = services ? `de ${plural(services, "serviço", "serviços")} no ar` : "nenhum serviço ainda";
      fBar.replaceChildren();
      for (const st of ["done", "running", "error", "idle"]) {
        for (const t of all.filter((x) => x.st === st)) {
          const seg = tick({ st, name: t.name }, "dk:flex-1 dk:min-w-1 dk:rounded-[3px]");
          fBar.append(seg);
        }
      }
      if (!services) fBar.append(el("span", "dk:flex-1 dk:rounded-[3px] dk:bg-(--v-hover)"));
      fLegend.replaceChildren();
      for (const [st, label] of [["done", "no ar"], ["running", "implantando"], ["error", "com erro"], ["idle", "parados"]]) {
        const item = el("span", `dk:inline-flex dk:items-center dk:gap-1.5 ${sum[st] ? "dk:text-(--v-fg)" : "dk:text-(--v-subtle)"}`);
        item.append(el("span", `dk:size-2 dk:rounded-[2px] ${TICK_COLOR[st].split(" ")[0]}`), el("b", "dk:font-semibold dk:tabular-nums", String(sum[st])), document.createTextNode(label));
        fLegend.append(item);
      }
      fleet.classList.toggle("dk:hidden", !n);
    }

    function paintAll() {
      paintSummary();
      paintTags();
      create.classList.toggle("dk:hidden", !state.perms.create);
      renderList();
    }

    search.addEventListener("input", () => {
      state.query = search.value;
      renderList();
    });
    sort.addEventListener("change", () => {
      state.sort = sort.value;
      save("dkt-psort", state.sort);
      renderList();
    });

    const onKey = (e) => {
      if (!alive()) return document.removeEventListener("keydown", onKey);
      const t = e.target;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        search.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    const fail = () => {
      state.loading = false;
      state.failed = true;
      summary.textContent = "Não foi possível carregar";
      renderList();
    };

    state.animate = true;
    renderList();
    trpc([{ path: "user.getPermissions" }])
      .then(([perm]) => {
        if (perm && perm.project) {
          state.perms = { create: perm.project.create !== false, remove: perm.project.delete !== false };
          create.classList.toggle("dk:hidden", !state.perms.create);
        }
      })
      .catch(() => { /* mantém o padrão */ });
    refresh().catch(fail);

    // Atualiza sozinho de tempos em tempos (status dos serviços)
    (function loop() {
      setTimeout(async () => {
        if (!alive()) return;
        try { await refresh(); } catch { /* mantém a tela */ }
        loop();
      }, 30000);
    })();
  }

  /** Remove páginas injetadas que não pertencem mais à tela atual (o React não as conhece). */
  function dropProjectsPages(keep) {
    for (const n of document.querySelectorAll('[data-dk="projects"]')) if (n !== keep) n.remove();
  }

  function syncProjects() {
    const card = document.querySelector("div.bg-sidebar.rounded-xl.h-full.p-2\\.5");
    const nativeRoot = card && card.parentElement;
    if (!nativeRoot) return;
    if (nativeRoot.__dkp && nativeRoot.__dkp.isConnected) {
      dropProjectsPages(nativeRoot.__dkp);
      return;
    }
    dropProjectsPages(null);
    mountProjects(nativeRoot);
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
    if (PROJECTS_PATH.test(location.pathname)) {
      syncProjects();
      return;
    }
    // Saiu de /dashboard/projects: a página injetada não pode ficar no meio da próxima tela
    dropProjectsPages(null);
    if (!HOME_PATH.test(location.pathname)) return;
    const container = findHomeContainer();
    if (!container) return;
    if (!container.__dkt) mount(container);

    // Bloco nativo de "Deploys recentes" fica depois dos painéis do tema
    for (const child of container.children) {
      if (child.dataset.dk) continue;
      if (/recent deployments|deploys recentes/i.test(child.textContent.slice(0, 80))) {
        if (!child.__dka) {
          child.__dka = true;
          child.classList.add(AFTER);
        }
      }
    }
    styleNative(container);
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
