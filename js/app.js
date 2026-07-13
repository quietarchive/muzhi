(() => {
  const DATA = window.DUIDU_DATA;
  if (!DATA) {
    console.error("Missing DUIDU_DATA");
    return;
  }

  const REL_COLORS = {
    一致: "var(--一致)",
    增补: "var(--增补)",
    事实抵牾: "var(--事实抵牾)",
    立场差异: "var(--立场差异)",
    缺载: "var(--缺载)",
    未判: "var(--未判)",
  };

  const groups = DATA.groups.filter((g) => /^D\d+/.test(g.id));
  const byId = Object.fromEntries(groups.map((g) => [g.id, g]));
  let selectedId = null;
  let hoverId = null;

  const railList = document.getElementById("railList");
  const pairList = document.getElementById("pairList");
  const hotspots = document.getElementById("hotspots");
  const overlay = document.getElementById("overlay");
  const legend = document.getElementById("legend");
  const footerNote = document.getElementById("footerNote");
  const leftRail = document.querySelector(".rail-left");
  const rightRail = document.querySelector(".rail-right");

  footerNote.textContent = DATA.meta?.sourceNote || "";

  const relations = DATA.meta?.relations || Object.keys(REL_COLORS);
  legend.innerHTML = relations
    .map(
      (r) =>
        `<span><i class="swatch" style="background:${REL_COLORS[r] || REL_COLORS["未判"]}"></i>${r}</span>`
    )
    .join("");

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function shortLabel(g) {
    if (g.hotspot?.label) return g.hotspot.label;
    const t = (g.muzhi || "").replace(/（首题）/, "").trim();
    return t.slice(0, 12) || g.id;
  }

  function muzhiText(g) {
    return ((g.muzhiRaw || g.muzhi || "未载").replaceAll("/", "／") || "未载").trim();
  }

  function sourcesHtml(g) {
    if (!g.sources || g.sources.length === 0) {
      return '<div class="pair-empty">传世史料未见对应记载</div>';
    }
    return g.sources
      .map((s) => {
        const text = (s.text || "未载").trim() || "未载";
        return `<div class="pair-source">
          <div class="pair-cite">${escapeHtml(s.cite || "出处待补")}</div>
          <div class="pair-source-text">${escapeHtml(text)}</div>
          ${s.note ? `<div class="pair-note">${escapeHtml(s.note)}</div>` : ""}
        </div>`;
      })
      .join("");
  }

  function renderRail() {
    const phases = [];
    for (const g of groups) {
      if (!phases.length || phases[phases.length - 1].name !== g.phase) {
        phases.push({ name: g.phase || "未分阶段", items: [] });
      }
      phases[phases.length - 1].items.push(g);
    }

    railList.innerHTML = phases
      .map(
        (p) => `
      <div class="phase">${p.name}</div>
      ${p.items
        .map(
          (g) => `
        <button class="entry" type="button" data-id="${g.id}"
          style="--rel:${REL_COLORS[g.relation] || REL_COLORS["未判"]}">
          <div class="entry-id">
            <i class="entry-dot" style="background:${REL_COLORS[g.relation] || REL_COLORS["未判"]}"></i>
            ${g.id} · ${g.aspect || "—"}
          </div>
          <div class="entry-title">${shortLabel(g)}</div>
        </button>`
        )
        .join("")}`
      )
      .join("");
  }

  function renderPairs() {
    pairList.innerHTML = groups
      .map((g) => {
        const rel = g.relation || "未判";
        return `<article class="pair-card" data-id="${g.id}" tabindex="0"
          style="--rel:${REL_COLORS[rel] || REL_COLORS["未判"]}"
          role="button" aria-label="${g.id} ${shortLabel(g)}">
          <div class="pair-head">
            <span class="pair-id">
              <i class="entry-dot" style="background:${REL_COLORS[rel] || REL_COLORS["未判"]}"></i>
              ${g.id} · ${escapeHtml(shortLabel(g))}
            </span>
            <span class="pair-rel">${escapeHtml(rel)}</span>
          </div>
          <div class="pair-block muzhi">
            <div class="pair-kicker">墓志原文</div>
            <div class="pair-quote">${escapeHtml(muzhiText(g))}</div>
          </div>
          <div class="pair-block sources">
            <div class="pair-kicker">传世史料</div>
            ${sourcesHtml(g)}
          </div>
          ${
            g.explain
              ? `<div class="pair-explain">${escapeHtml(g.explain)}</div>`
              : ""
          }
        </article>`;
      })
      .join("");
  }

  function renderHotspots() {
    hotspots.innerHTML = groups
      .filter((g) => g.hotspot)
      .map((g) => {
        const h = g.hotspot;
        return `<button class="hotspot" type="button" data-id="${g.id}"
          style="left:${h.x}%;top:${h.y}%;width:${h.w}%;height:${h.h}%;--rel:${REL_COLORS[g.relation] || REL_COLORS["未判"]}"
          aria-label="${g.id} ${h.label || ""}">
          <span class="hotspot-label">${g.id} ${h.label || ""}</span>
        </button>`;
      })
      .join("");
  }

  function setActive(id) {
    selectedId = id;
    document.querySelectorAll(".entry").forEach((el) => {
      el.classList.toggle("active", el.dataset.id === id);
    });
    document.querySelectorAll(".hotspot").forEach((el) => {
      el.classList.toggle("active", el.dataset.id === id);
    });
    document.querySelectorAll(".pair-card").forEach((el) => {
      el.classList.toggle("active", el.dataset.id === id);
    });
  }

  function scrollRailsAligned(id) {
    if (!leftRail || !rightRail) return;
    const leftEl = railList.querySelector(`.entry[data-id="${id}"]`);
    const rightEl = pairList.querySelector(`.pair-card[data-id="${id}"]`);
    if (!leftEl || !rightEl) return;

    // Place both selected items at the same vertical band in each rail.
    const ratio = 0.22;
    const align = (container, el) => {
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const delta = eRect.top - cRect.top - cRect.height * ratio;
      container.scrollBy({ top: delta, behavior: "smooth" });
    };

    align(leftRail, leftEl);
    // Wait one frame so both start from current layout, then nudge again if needed.
    requestAnimationFrame(() => align(rightRail, rightEl));
  }

  function applyGlow(id) {
    document.querySelectorAll(".entry").forEach((el) => {
      el.classList.toggle("rail-glow", el.dataset.id === id);
    });
    document.querySelectorAll(".pair-card").forEach((el) => {
      el.classList.toggle("rail-glow", el.dataset.id === id);
    });
  }

  function setSyncGlow(id, { align = true } = {}) {
    hoverId = id;
    applyGlow(id);
    if (align) scrollRailsAligned(id);
  }

  function clearSyncGlow() {
    hoverId = null;
    const keep = selectedId;
    if (keep) {
      applyGlow(keep);
      scrollRailsAligned(keep);
    } else {
      document
        .querySelectorAll(".entry.rail-glow, .pair-card.rail-glow")
        .forEach((el) => el.classList.remove("rail-glow"));
    }
  }

  function selectFromStage(id) {
    setActive(id);
    setSyncGlow(id, { align: true });
  }

  function openPair(id) {
    const g = byId[id];
    if (!g) return;
    selectFromStage(id);

    const rel = g.relation || "未判";
    const relTag = document.getElementById("relTag");
    relTag.textContent = rel;
    relTag.style.setProperty("--rel", REL_COLORS[rel] || REL_COLORS["未判"]);
    relTag.style.background = REL_COLORS[rel] || REL_COLORS["未判"];

    document.getElementById("muzhiMeta").innerHTML = [
      `<span>${g.id}</span>`,
      g.phase ? `<span>${escapeHtml(g.phase)}</span>` : "",
      g.subject ? `<span>${escapeHtml(g.subject)}</span>` : "",
      g.aspect ? `<span>${escapeHtml(g.aspect)}</span>` : "",
      g.value ? `<span>${escapeHtml(g.value)}</span>` : "",
    ]
      .filter(Boolean)
      .join("");

    document.getElementById("muzhiQuote").textContent = muzhiText(g);

    const explain = document.getElementById("explain");
    if (g.explain) {
      explain.hidden = false;
      explain.style.setProperty("--rel", REL_COLORS[rel] || REL_COLORS["未判"]);
      explain.textContent = g.explain;
    } else {
      explain.hidden = true;
      explain.textContent = "";
    }

    const body = document.getElementById("sourcesBody");
    if (!g.sources || g.sources.length === 0) {
      body.innerHTML =
        '<div class="empty-state">传世史料未见对应记载（或缺载条目尚未录入出处原文）。</div>';
    } else {
      body.innerHTML = g.sources
        .map((s) => {
          const text = (s.text || "未载").trim() || "未载";
          return `<div class="source-card">
            <div class="source-cite">${escapeHtml(s.cite || "出处待补")}</div>
            <div class="source-text">${escapeHtml(text)}</div>
            ${s.note ? `<div class="source-note">${escapeHtml(s.note)}</div>` : ""}
          </div>`;
        })
        .join("");
    }

    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
  }

  function closePair() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    if (selectedId) {
      applyGlow(selectedId);
      scrollRailsAligned(selectedId);
    }
  }

  function bindHoverSync(root, selector) {
    root.addEventListener("pointerover", (e) => {
      const el = e.target.closest(selector);
      if (el?.dataset.id) setSyncGlow(el.dataset.id, { align: true });
    });
    root.addEventListener("pointerout", (e) => {
      const el = e.target.closest(selector);
      if (!el) return;
      const next = e.relatedTarget?.closest?.(selector);
      if (next && next.dataset.id === el.dataset.id) return;
      clearSyncGlow();
    });
  }

  renderRail();
  renderPairs();
  renderHotspots();

  railList.addEventListener("click", (e) => {
    const btn = e.target.closest(".entry");
    if (btn) openPair(btn.dataset.id);
  });

  pairList.addEventListener("click", (e) => {
    const card = e.target.closest(".pair-card");
    if (card) openPair(card.dataset.id);
  });

  pairList.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".pair-card");
    if (!card) return;
    e.preventDefault();
    openPair(card.dataset.id);
  });

  hotspots.addEventListener("click", (e) => {
    const btn = e.target.closest(".hotspot");
    if (btn) openPair(btn.dataset.id);
  });

  bindHoverSync(hotspots, ".hotspot");
  bindHoverSync(railList, ".entry");
  bindHoverSync(pairList, ".pair-card");

  document.getElementById("closeBtn").addEventListener("click", closePair);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePair();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePair();
  });
})();
