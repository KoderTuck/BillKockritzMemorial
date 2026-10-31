(function() {
  const master = [...(window.BILL_MASTER_MEDIA || [])];
  let currentData = window.UTILS ? window.UTILS.getActiveMediaList(master) : [...master];
  let photoDuration = window.UTILS ? (window.UTILS.getSavedPacingMs() / 1000) : 5.5;

  const els = {
    pacingInp: document.getElementById("pacing-input"),
    srvList: document.getElementById("service-list"),
    poolList: document.getElementById("pool-list"),
    srvCount: document.getElementById("service-count"),
    hdrCount: document.getElementById("service-header-count"),
    poolCount: document.getElementById("pool-count"),
    estTime: document.getElementById("est-time"),
    diffPill: document.getElementById("target-diff-pill"),
    srvSearch: document.getElementById("service-search"),
    poolSearch: document.getElementById("pool-search")
  };

  if (els.pacingInp) els.pacingInp.value = photoDuration;

  function updateCalculations() {
    const srv = currentData.filter(i => i.inService);
    if (els.srvCount) els.srvCount.textContent = srv.length;
    if (els.hdrCount) els.hdrCount.textContent = srv.length;
    if (els.poolCount) els.poolCount.textContent = master.length;

    let sec = 0;
    srv.forEach(i => sec += (i.type === "video" ? (i.duration || 20) : photoDuration));

    const formTime = `${Math.floor(sec/60)}m ${Math.round(sec%60).toString().padStart(2, '0')}s`;
    if (els.estTime) els.estTime.textContent = `${formTime} (Target: 7m ± 1m)`;

    if (!els.diffPill) return;

    if (sec >= 360 && sec <= 480) {
      els.diffPill.innerHTML = `<span style="color:var(--green); background:rgba(126,231,135,0.15); padding:5px 12px; border-radius:8px; font-weight:700;">✅ Perfect Window (${Math.round(sec-420)}s off 7m)</span>`;
      els.estTime.style.color = "var(--green)";
    } else if (sec < 360) {
      els.diffPill.innerHTML = `<span style="color:var(--gold); background:rgba(229,179,87,0.15); padding:5px 12px; border-radius:8px; font-weight:600;">⏳ Short. Add ~${Math.ceil((360-sec)/photoDuration)} photos</span>`;
      els.estTime.style.color = "var(--gold)";
    } else {
      els.diffPill.innerHTML = `<span style="color:var(--red); background:rgba(255,123,114,0.15); padding:5px 12px; border-radius:8px; font-weight:600;">⏱️ Long. Trim ~${Math.ceil((sec-480)/photoDuration)} photos</span>`;
      els.estTime.style.color = "var(--red)";
    }
  }

  function buildSlider(item) {
    const vol = item.volume !== undefined ? item.volume : (window.CONFIG ? window.CONFIG.videoTargetVolume : 0.55);
    const w = document.createElement("div");
    w.className = "volume-slider-wrap";
    w.innerHTML = `<label>🔊:</label><input type="range" class="volume-range" min="0" max="1" step="0.05" value="${vol}"><span class="volume-pct">${Math.round(vol*100)}%</span>`;
    w.querySelector("input").oninput = (e) => {
      const v = parseFloat(e.target.value);
      item.volume = v;
      w.querySelector("span").textContent = `${Math.round(v*100)}%`;
      const m = master.find(x => x.src === item.src); if (m) m.volume = v;
    };
    return w;
  }

  function renderList(container, isSrv, query) {
    if (!container) return;
    container.innerHTML = "";
    
    let items = isSrv ? currentData.filter(i => i.inService) : master;
    const nonFinCount = currentData.filter(i => i.inService && !i.isFinale).length;

    items.forEach((item, idx) => {
      const fn = item.src.split("/").pop();
      const cap = item.caption || fn;
      const q = query.toLowerCase().trim();
      if (q && !fn.toLowerCase().includes(q) && !cap.toLowerCase().includes(q)) return;

      const row = document.createElement("div");
      row.className = `item-row ${item.isFinale ? 'is-finale' : ''}`;
      
      const thumb = document.createElement("img");
      thumb.className = "item-thumb"; thumb.src = item.src;
      thumb.loading = "lazy";
      thumb.onerror = () => { thumb.style.display = "none"; };

      const inSrvStatus = currentData.some(c => c.src === item.src && c.inService);
      const meta = `<span class="filename-code">${fn}</span> ` +
        (item.type === "video" ? `<span class="badge-video">🎬 Video</span>` : `<span>Photo</span>`) +
        (isSrv ? (item.isFinale ? `<span class="badge-finale">LOCKED FINALE</span>` : '') : ` • ${inSrvStatus ? '<strong style="color:var(--green)">In Service</strong>' : 'Archive'}`);

      const info = document.createElement("div");
      info.className = "item-info";
      info.innerHTML = `<div class="item-title">${cap}</div><div class="item-meta">${meta}</div>`;
      if (item.type === "video") info.lastChild.appendChild(buildSlider(item));

      const acts = document.createElement("div");
      acts.className = "btn-group";

      if (!item.isFinale) {
        if (isSrv) {
          acts.innerHTML = `
            <div class="jump-box-wrap"><label>#</label><input type="number" class="jump-input" value="${idx+1}" min="1" max="${nonFinCount}"></div>
            <button class="btn-icon" data-act="top">⏮</button>
            <button class="btn-icon" data-act="up">▲</button>
            <button class="btn-icon" data-act="dn">▼</button>
            <button class="btn-icon" data-act="btm">⏭</button>
            <button class="btn-icon btn-danger" data-act="rm">✕</button>
          `;
          acts.querySelector("input").onchange = (e) => jump(item, parseInt(e.target.value));
          acts.querySelectorAll("button").forEach(b => {
            b.onclick = () => {
              const a = b.dataset.act;
              if (a==='top') jump(item, 1); if (a==='up') step(item, -1);
              if (a==='dn') step(item, 1); if (a==='btm') jump(item, nonFinCount);
              if (a==='rm') toggle(item, false);
            };
          });
        } else {
          acts.innerHTML = `<button class="btn ${inSrvStatus ? 'btn-outline':'btn-gold'}" style="padding:4px 10px;font-size:0.75rem">${inSrvStatus ? 'Exclude' : '+ Add'}</button>`;
          acts.querySelector("button").onclick = () => toggle(item, !inSrvStatus);
        }
      }
      
      row.append(thumb, info, acts);
      container.appendChild(row);
    });
  }

  function jump(item, tarOrig) {
    const srv = currentData.filter(i => i.inService && !i.isFinale);
    const old = srv.findIndex(i => i.src === item.src);
    if (old < 0) return;
    let tar = Math.max(0, Math.min(tarOrig - 1, srv.length - 1));
    srv.splice(tar, 0, srv.splice(old, 1)[0]);
    
    const fin = currentData.find(i => i.isFinale);
    currentData = [...srv, ...currentData.filter(i => !i.inService)];
    if (fin) currentData.push(fin);
    renderAll();
  }
  
  function step(item, dir) { jump(item, currentData.filter(i => i.inService && !i.isFinale).findIndex(i => i.src===item.src) + 1 + dir); }
  
  function toggle(item, status) {
    const match = currentData.find(c => c.src === item.src);
    match ? match.inService = status : currentData.push({...item, inService: status});
    renderAll();
  }

  function renderAll() {
    updateCalculations();
    renderList(els.srvList, true, els.srvSearch?.value || "");
    renderList(els.poolList, false, els.poolSearch?.value || "");
  }

  els.pacingInp?.addEventListener("input", e => { photoDuration = parseFloat(e.target.value); renderAll(); });
  els.srvSearch?.addEventListener("input", renderAll);
  els.poolSearch?.addEventListener("input", renderAll);

  document.getElementById("save-browser-btn").onclick = () => {
    localStorage.setItem("BILL_SERVICE_CUSTOM_MEDIA", JSON.stringify(currentData));
    localStorage.setItem("BILL_SERVICE_PHOTO_DURATION", photoDuration.toString());
    alert("Layout Saved to Browser!");
  };

  document.getElementById("reset-default-btn").onclick = () => {
    if (confirm("Are you sure you want to clear your saved curation and reload the 419 master files?")) {
      localStorage.removeItem("BILL_SERVICE_CUSTOM_MEDIA");
      localStorage.removeItem("BILL_SERVICE_PHOTO_DURATION");
      window.location.reload();
    }
  };

  document.getElementById("export-js-btn").onclick = () => {
    const js = `// Curated Export
const MASTER_MEDIA_LIST = ${JSON.stringify(currentData, null, 2)};
window.BILL_MEDIA = MASTER_MEDIA_LIST;
window.BILL_MASTER_MEDIA = MASTER_MEDIA_LIST;`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([js], { type: "application/javascript" }));
    a.download = "media-data.js"; a.click();
  };

  renderAll();
})();
