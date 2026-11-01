(function() {
  const master = MediaStore.getMasterMedia();
  let servicePlaylist = MediaStore.getServicePlaylist();
  let longPlaylist = MediaStore.getLongShowPlaylist();
  
  let servicePacing = MediaStore.getPacingMs('service') / 1000;
  let longPacing = MediaStore.getPacingMs('long') / 1000;
  let activeTab = 'service'; // 'service' or 'long'

  const els = {
    tabSrv: document.getElementById("tab-service-btn"),
    tabLong: document.getElementById("tab-long-btn"),
    pacingInp: document.getElementById("pacing-input"),
    curatedList: document.getElementById("service-list"),
    poolList: document.getElementById("pool-list"),
    curatedCount: document.getElementById("service-count"),
    hdrCount: document.getElementById("service-header-count"),
    poolCount: document.getElementById("pool-count"),
    estTime: document.getElementById("est-time"),
    diffPill: document.getElementById("target-diff-pill"),
    curatedSearch: document.getElementById("service-search"),
    poolSearch: document.getElementById("pool-search")
  };

  if (!els.tabSrv && !els.tabLong) {
    // Inject tabs if missing from DOM
    const bar = document.querySelector(".stats-bar");
    if (bar) {
      const tabs = document.createElement("div");
      tabs.innerHTML = `
        <button id="tab-service-btn" class="btn active">⏱️ 7-Min Service</button>
        <button id="tab-long-btn" class="btn btn-outline">📽️ Long Show</button>
      `;
      bar.prepend(tabs);
      els.tabSrv = document.getElementById("tab-service-btn");
      els.tabLong = document.getElementById("tab-long-btn");
    }
  }

  if (els.tabSrv) els.tabSrv.onclick = () => { activeTab = 'service'; els.tabSrv.className="btn active"; if(els.tabLong) els.tabLong.className="btn btn-outline"; renderAll(); };
  if (els.tabLong) els.tabLong.onclick = () => { activeTab = 'long'; els.tabLong.className="btn active"; if(els.tabSrv) els.tabSrv.className="btn btn-outline"; renderAll(); };

  function getActiveList() { return activeTab === 'service' ? servicePlaylist : longPlaylist; }
  function setActiveList(newList) { activeTab === 'service' ? (servicePlaylist = newList) : (longPlaylist = newList); }
  function getActivePacing() { return activeTab === 'service' ? servicePacing : longPacing; }
  function setActivePacing(val) { activeTab === 'service' ? (servicePacing = val) : (longPacing = val); }

  function updateCalculations() {
    const list = getActiveList();
    const pacing = getActivePacing();
    if (els.pacingInp) els.pacingInp.value = pacing;
    if (els.curatedCount) els.curatedCount.textContent = list.length;
    if (els.hdrCount) els.hdrCount.textContent = list.length;
    if (els.poolCount) els.poolCount.textContent = master.length;

    let sec = 0;
    list.forEach(i => sec += (i.type === "video" ? (i.duration || 20) : pacing));

    const formTime = `${Math.floor(sec/60)}m ${Math.round(sec%60).toString().padStart(2, '0')}s`;
    
    if (els.estTime) {
      els.estTime.textContent = activeTab === 'service' ? `${formTime} (Target: 7m ± 1m)` : `${formTime} Total`;
    }

    if (!els.diffPill) return;

    if (activeTab === 'long') {
      els.diffPill.innerHTML = `<span style="color:var(--text-light); background:rgba(255,255,255,0.1); padding:5px 12px; border-radius:8px;">Continuous Loop</span>`;
      return;
    }

    if (sec >= 360 && sec <= 480) {
      els.diffPill.innerHTML = `<span style="color:var(--green); background:rgba(126,231,135,0.15); padding:5px 12px; border-radius:8px; font-weight:700;">✅ Perfect Window (${Math.round(sec-420)}s off 7m)</span>`;
    } else if (sec < 360) {
      els.diffPill.innerHTML = `<span style="color:var(--gold); background:rgba(229,179,87,0.15); padding:5px 12px; border-radius:8px; font-weight:600;">⏳ Short. Add ~${Math.ceil((360-sec)/pacing)} photos</span>`;
    } else {
      els.diffPill.innerHTML = `<span style="color:var(--red); background:rgba(255,123,114,0.15); padding:5px 12px; border-radius:8px; font-weight:600;">⏱️ Long. Trim ~${Math.ceil((sec-480)/pacing)} photos</span>`;
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
      
      // Update in all lists so changes sync
      [master, servicePlaylist, longPlaylist].forEach(lst => {
        const m = lst.find(x => x.src === item.src);
        if (m) m.volume = v;
      });
    };
    return w;
  }

  function renderList(container, isCuratedView, query) {
    if (!container) return;
    container.innerHTML = "";
    
    const currentList = getActiveList();
    let items = isCuratedView ? currentList : master;
    const nonFinCount = currentList.filter(i => !i.isFinale).length;

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

      const isIncluded = currentList.some(c => c.src === item.src);
      const meta = `<span class="filename-code">${fn}</span> ` +
        (item.type === "video" ? `<span class="badge-video">🎬 Video</span>` : `<span>Photo</span>`) +
        (isCuratedView ? (item.isFinale ? `<span class="badge-finale">LOCKED FINALE</span>` : '') : ` • ${isIncluded ? '<strong style="color:var(--green)">Added</strong>' : 'Archive'}`);

      const info = document.createElement("div");
      info.className = "item-info";
      info.innerHTML = `<div class="item-title">${cap}</div><div class="item-meta">${meta}</div>`;
      if (item.type === "video") info.lastChild.appendChild(buildSlider(item));

      const acts = document.createElement("div");
      acts.className = "btn-group";

      if (!item.isFinale) {
        if (isCuratedView) {
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
          acts.innerHTML = `<button class="btn ${isIncluded ? 'btn-outline':'btn-gold'}" style="padding:4px 10px;font-size:0.75rem">${isIncluded ? 'Remove' : '+ Add'}</button>`;
          acts.querySelector("button").onclick = () => toggle(item, !isIncluded);
        }
      }
      
      row.append(thumb, info, acts);
      container.appendChild(row);
    });
  }

  function jump(item, tarOrig) {
    const list = getActiveList();
    const nonFin = list.filter(i => !i.isFinale);
    const old = nonFin.findIndex(i => i.src === item.src);
    if (old < 0) return;
    let tar = Math.max(0, Math.min(tarOrig - 1, nonFin.length - 1));
    nonFin.splice(tar, 0, nonFin.splice(old, 1)[0]);
    
    const fin = list.find(i => i.isFinale);
    const newList = [...nonFin];
    if (fin) newList.push(fin);
    setActiveList(newList);
    renderAll();
  }
  
  function step(item, dir) { jump(item, getActiveList().filter(i => !i.isFinale).findIndex(i => i.src===item.src) + 1 + dir); }
  
  function toggle(item, include) {
    let list = getActiveList();
    if (include) {
      if (!list.find(c => c.src === item.src)) {
        // Insert before finale if exists
        const finIdx = list.findIndex(i => i.isFinale);
        if (finIdx !== -1) list.splice(finIdx, 0, {...item});
        else list.push({...item});
      }
    } else {
      list = list.filter(c => c.src !== item.src);
    }
    setActiveList(list);
    renderAll();
  }

  function renderAll() {
    updateCalculations();
    renderList(els.curatedList, true, els.curatedSearch?.value || "");
    renderList(els.poolList, false, els.poolSearch?.value || "");
  }

  els.pacingInp?.addEventListener("input", e => { setActivePacing(parseFloat(e.target.value)); renderAll(); });
  els.curatedSearch?.addEventListener("input", renderAll);
  els.poolSearch?.addEventListener("input", renderAll);

  document.getElementById("save-browser-btn").onclick = () => {
    MediaStore.savePlaylists(servicePlaylist, longPlaylist, servicePacing, longPacing);
    alert(`Saved to Browser!
• 7-Min Service: ${servicePlaylist.length} slides
• Long Show: ${longPlaylist.length} slides`);
  };

  document.getElementById("reset-default-btn").onclick = () => {
    if (confirm("Are you sure you want to clear your saved curation and restore the defaults from media-data.js?")) {
      MediaStore.resetToMaster();
      window.location.reload();
    }
  };

  document.getElementById("export-js-btn").onclick = () => {
    const js = `// Bill Kockritz Memorial Media Registry
// Centralized Data Layer

` +
      `const BILL_SERVICE_PLAYLIST = ${JSON.stringify(servicePlaylist, null, 2)};

` +
      `const BILL_MASTER_MEDIA = ${JSON.stringify(master, null, 2)};

` +
      `window.BILL_SERVICE_PLAYLIST = BILL_SERVICE_PLAYLIST;
` +
      `window.BILL_MASTER_MEDIA = BILL_MASTER_MEDIA;
` +
      `// Backwards Compatibility
window.BILL_MEDIA = BILL_MASTER_MEDIA;`;
      
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([js], { type: "application/javascript" }));
    a.download = "media-data.js"; 
    a.click();
  };

  renderAll();
})();
