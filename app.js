const data = window.LUCE_DATA;
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const saved = new Set(JSON.parse(localStorage.getItem("luce-saved") || "[]"));
function persist() { localStorage.setItem("luce-saved", JSON.stringify([...saved])); }

function euro(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

const state = { filter: "all", q: "", sort: "price" };

function matches(l) {
  const f = state.filter;
  if (f === "saved" && !saved.has(l.id)) return false;
  if (f === "ready" && l.status !== "ready") return false;
  if (f === "new-build" && l.status !== "new-build") return false;
  if (f === "lakes" && !["Lake Como", "Lake Garda"].includes(l.area)) return false;
  if (f === "islands" && !["Sardinia", "Sicily"].includes(l.region)) return false;
  if (["Puglia", "Tuscany", "Lombardy", "Liguria", "Lazio"].includes(f) && l.region !== f) return false;
  if (state.q) {
    const blob = [l.name, l.headline, l.location, l.region, l.area, l.note, l.why].join(" ").toLowerCase();
    if (!blob.includes(state.q.toLowerCase())) return false;
  }
  return true;
}

function sorted(list) {
  const out = [...list];
  if (state.sort === "price") out.sort((a,b) => a.price - b.price);
  if (state.sort === "size") out.sort((a,b) => (b.sqm||0) - (a.sqm||0));
  if (state.sort === "beds") out.sort((a,b) => (b.beds||0) - (a.beds||0));
  if (state.sort === "name") out.sort((a,b) => a.name.localeCompare(b.name));
  return out;
}

function statusLabel(s) {
  if (s === "new-build") return "New-build";
  if (s === "incomplete") return "Unfinished";
  return "Ready";
}

function card(l) {
  const photo = l.photo
    ? `<div class="photo" style="background-image:url('${l.photo}')"></div>`
    : `<div class="photo none">${l.region.slice(0,2)}</div>`;
  const heart = saved.has(l.id) ? "on" : "";
  const stats = [
    l.beds ? `${l.beds} bed` : null,
    l.sqm ? `${l.sqm} sqm` : null,
    l.pool ? "Pool" : "No pool",
    l.land ? `${(l.land/1000).toFixed(l.land>=10000?0:1)} ha` : null
  ].filter(Boolean).map(s => `<span class="stat">${s}</span>`).join("");
  return `<article class="card" data-id="${l.id}">
    ${photo}
    <span class="badge ${l.status}">${statusLabel(l.status)}</span>
    <button class="heart ${heart}" data-save="${l.id}" aria-label="Save">♥</button>
    <div class="body">
      <div class="where">${l.area} · ${l.region}</div>
      <h2>${l.name}</h2>
      <div class="sub">${l.headline}</div>
      <div class="stats">${stats}</div>
      <div class="price">${euro(l.price)}</div>
    </div>
  </article>`;
}

function render() {
  const list = sorted(data.listings.filter(matches));
  $("#count").textContent = `${list.length} of ${data.listings.length}`;
  $("#grid").innerHTML = list.length ? list.map(card).join("") : `<div class="empty">Nothing in this filter.</div>`;
}

function openDrawer(id) {
  const l = data.listings.find(x => x.id === id);
  if (!l) return;
  const photo = l.photo
    ? `<div class="photo" style="background-image:url('${l.photo}')"></div>`
    : `<div class="photo none">${l.region}</div>`;
  $("#drawer").innerHTML = `
    <button class="close" id="close">✕</button>
    ${photo}
    <div class="drawer-inner">
      <div class="where">${l.location}</div>
      <h2>${l.name}</h2>
      <div class="price">${euro(l.price)}</div>
      <p class="why">${l.why}</p>
      <p class="note">${l.note || ""}</p>
      <dl class="facts">
        <div><dt>Size</dt><dd>${l.sqm} sqm · ${l.beds} bed · ${l.baths} bath</dd></div>
        <div><dt>Land</dt><dd>${l.land ? l.land.toLocaleString("de-DE") + " sqm" : "See listing"}</dd></div>
        <div><dt>Pool</dt><dd>${l.pool || "None"}</dd></div>
        <div><dt>Status</dt><dd>${statusLabel(l.status)} · ${l.year}</dd></div>
        <div><dt>Agency</dt><dd>${l.agency}${l.ref ? " · " + l.ref : ""}</dd></div>
        <div><dt>Added</dt><dd>${l.added}</dd></div>
      </dl>
      <a class="cta" href="${l.url}" target="_blank" rel="noopener">Open the listing</a>
    </div>`;
  $("#drawer").classList.add("on");
  $("#shade").classList.add("on");
}

function closeDrawer() {
  $("#drawer").classList.remove("on");
  $("#shade").classList.remove("on");
}

document.addEventListener("click", (e) => {
  const save = e.target.closest("[data-save]");
  if (save) {
    e.stopPropagation();
    const id = save.dataset.save;
    if (saved.has(id)) saved.delete(id); else saved.add(id);
    persist(); render();
    return;
  }
  const cardEl = e.target.closest(".card");
  if (cardEl) openDrawer(cardEl.dataset.id);
  if (e.target.id === "close" || e.target.id === "shade") closeDrawer();
  const chip = e.target.closest(".chip");
  if (chip) {
    state.filter = chip.dataset.filter;
    $$(".chip").forEach(c => c.classList.toggle("on", c === chip));
    render();
  }
});

document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
$("#search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

$("#updated").textContent = data.updatedLabel;
$("#budget").textContent = euro(data.budget);
render();
