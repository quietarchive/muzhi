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

  const railList = document.getElementById("railList");
  const hotspots = document.getElementById("hotspots");
  const overlay = document.getElementById("overlay");
  const legend = document.getElementById("legend");
  const footerNote = document.getElementById("footerNote");

  footerNote.textContent = DATA.meta?.sourceNote || "";

  const relations = DATA.meta?.relations || Object.keys(REL_COLORS);
  legend.innerHTML = relations
    .map(
      (r) =>
        `<span><i class="swatch" style="background:${REL_COLORS[r] || REL_COLORS["未判"]}"></i>${r}</span>`
    )
    .join("");

  function shortLabel(g) {
    if (g.hotspot?.label) return g.hotspot.label;
    const t = (g.muzhi || "").replace(/（首题）/, "").trim();
    return t.slice(0, 12) || g.id;
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
        <button class="entry" type="button" data-id="${g.id}">
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
    document.querySelectorAll(".entry").forEach((el) => {
      el.classList.toggle("active", el.dataset.id === id);
    });
    document.querySelectorAll(".hotspot").forEach((el) => {
      el.classList.toggle("active", el.dataset.id === id);
    });
  }

  function openPair(id) {
    const g = byId[id];
    if (!g) return;
    setActive(id);

    const rel = g.relation || "未判";
    const relTag = document.getElementById("relTag");
    relTag.textContent = rel;
    relTag.style.setProperty("--rel", REL_COLORS[rel] || REL_COLORS["未判"]);
    relTag.style.background = REL_COLORS[rel] || REL_COLORS["未判"];

    document.getElementById("muzhiMeta").innerHTML = [
      `<span>${g.id}</span>`,
      g.phase ? `<span>${g.phase}</span>` : "",
      g.subject ? `<span>${g.subject}</span>` : "",
      g.aspect ? `<span>${g.aspect}</span>` : "",
      g.value ? `<span>${g.value}</span>` : "",
    ]
      .filter(Boolean)
      .join("");

    const muzhiText = (g.muzhiRaw || g.muzhi || "未载").replaceAll("/", "／");
    document.getElementById("muzhiQuote").textContent = muzhiText || "未载";

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
            <div class="source-cite">${s.cite || "出处待补"}</div>
            <div class="source-text">${text}</div>
            ${s.note ? `<div class="source-note">${s.note}</div>` : ""}
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
  }

  renderRail();
  renderHotspots();

  railList.addEventListener("click", (e) => {
    const btn = e.target.closest(".entry");
    if (btn) openPair(btn.dataset.id);
  });

  hotspots.addEventListener("click", (e) => {
    const btn = e.target.closest(".hotspot");
    if (btn) openPair(btn.dataset.id);
  });

  document.getElementById("closeBtn").addEventListener("click", closePair);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePair();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePair();
  });
})();
