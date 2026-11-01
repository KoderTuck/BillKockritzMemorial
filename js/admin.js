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
    pacingInp: document.getElementById("pacing-select"),
    itemCount: document.getElementById("item-count"),
    runtimeEstimate: document.getElementById("runtime-estimate"),
    tableBody: document.getElementById("media-table-body"),
    saveNotice: document.getElementById("save-notice")
  };

  if (els.tabSrv) els.tabSrv.onclick = () => { activeTab = 'service'; updateTabs(); renderAll(); };
  if (els.tabLong) els.tabLong.onclick = () => { activeTab = 'long'; updateTabs(); renderAll(); };

  function updateTabs() {
    els.tabSrv?.classList.toggle("active", activeTab === "service");
    els.tabLong?.classList.toggle("active", activeTab === "long");
  }

  function getActiveList() { return activeTab === 'service' ? servicePlaylist : longPlaylist; }
  function setActiveList(newList) { activeTab === 'service' ? (servicePlaylist = newList) : (longPlaylist = newList); }
  function getActivePacing() { return activeTab === 'service' ? servicePacing : longPacing; }
  function setActivePacing(val) { activeTab === 'service' ? (servicePacing = val) : (longPacing = val); }

  function updateCalculations() {
    const list = getActiveList();
    const pacing = getActivePacing();
    if (els.pacingInp) els.pacingInp.value = Math.round(pacing * 1000).toString();
    if (els.itemCount) els.itemCount.textContent = list.length;

    let sec = 0;
    list.forEach(i => sec += (i.type === "video" ? (i.duration || 20) : pacing));

    const formTime = `${Math.floor(sec/60)}m ${Math.round(sec%60).toString().padStart(2, '0')}s`;
    if (els.runtimeEstimate) els.runtimeEstimate.textContent = `~${formTime}`;
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

  function renderTable() {
    if (!els.tableBody) return;
    els.tableBody.replaceChildren();

    const currentList = getActiveList();
    const included = new Set(currentList.map(item => item.src));
    const items = [...currentList, ...master.filter(item => !included.has(item.src))];

    items.forEach(item => {
      const position = currentList.findIndex(entry => entry.src === item.src);
      const isIncluded = position !== -1;
      const filename = item.src.split("/").pop();
      const row = document.createElement("tr");
      row.className = item.isFinale ? "media-row is-finale" : "media-row";

      const numberCell = document.createElement("td");
      numberCell.textContent = isIncluded ? (position + 1).toString() : "—";

      const previewCell = document.createElement("td");
      const thumb = document.createElement("img");
      thumb.className = "admin-thumb";
      thumb.src = item.src;
      thumb.alt = item.caption || filename;
      thumb.loading = "lazy";
      thumb.onerror = () => { thumb.style.display = "none"; };
      previewCell.appendChild(thumb);

      const captionCell = document.createElement("td");
      captionCell.textContent = item.caption || filename;
      const filenameLabel = document.createElement("small");
      filenameLabel.textContent = filename;
      filenameLabel.style.display = "block";
      filenameLabel.style.color = "var(--text-muted)";
      captionCell.appendChild(filenameLabel);

      const typeCell = document.createElement("td");
      const typeBadge = document.createElement("span");
      typeBadge.className = item.type === "video" ? "badge badge-video" : "badge badge-image";
      typeBadge.textContent = item.type === "video" ? "Video" : "Image";
      typeCell.appendChild(typeBadge);

      const timingCell = document.createElement("td");
      if (item.type === "video") {
        timingCell.appendChild(buildSlider(item));
      } else {
        timingCell.textContent = `${getActivePacing()}s`;
      }

      const actionsCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "row-actions";
      if (isIncluded && !item.isFinale) {
        const upButton = createActionButton("▲", "Move up", position === 0);
        upButton.onclick = () => moveItem(item, -1);
        const downButton = createActionButton("▼", "Move down", position === currentList.length - 1);
        downButton.onclick = () => moveItem(item, 1);
        const removeButton = createActionButton("Remove", "Remove from playlist");
        removeButton.onclick = () => toggle(item, false);
        actions.append(upButton, downButton, removeButton);
      } else if (!isIncluded) {
        const addButton = createActionButton("+ Add", "Add to playlist");
        addButton.onclick = () => toggle(item, true);
        actions.appendChild(addButton);
      }

      actionsCell.appendChild(actions);
      row.append(numberCell, previewCell, captionCell, typeCell, timingCell, actionsCell);
      els.tableBody.appendChild(row);
    });
  }

  function createActionButton(label, title, disabled = false) {
    const button = document.createElement("button");
    button.className = "btn-icon";
    button.textContent = label;
    button.title = title;
    button.disabled = disabled;
    return button;
  }

  function moveItem(item, direction) {
    const list = getActiveList();
    const position = list.findIndex(entry => entry.src === item.src);
    const target = position + direction;
    if (position === -1 || target < 0 || target >= list.length || list[target].isFinale) return;
    [list[position], list[target]] = [list[target], list[position]];
    renderAll();
  }

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
    renderTable();
  }

  els.pacingInp?.addEventListener("change", e => {
    setActivePacing(parseInt(e.target.value, 10) / 1000);
    renderAll();
  });

  document.getElementById("save-browser-btn")?.addEventListener("click", () => {
    MediaStore.savePlaylists(servicePlaylist, longPlaylist, servicePacing, longPacing);
    if (els.saveNotice) {
      els.saveNotice.style.display = "block";
      window.setTimeout(() => { els.saveNotice.style.display = "none"; }, 3000);
    }
  });

  document.getElementById("reset-master-btn")?.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your saved curation and restore the defaults from media-data.js?")) {
      MediaStore.resetToMaster();
      window.location.reload();
    }
  });

  renderAll();
})();
