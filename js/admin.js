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
    saveNotice: document.getElementById("save-notice"),
    previewModal: document.getElementById("image-preview-modal"),
    previewImage: document.getElementById("image-preview-image")
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
    const configuredVolume = Number.isFinite(item.volume)
      ? item.volume
      : (window.CONFIG?.videoTargetVolume ?? 0.55);
    const vol = Math.max(0, Math.min(configuredVolume, 1));
    item.volume = vol;
    [master, servicePlaylist, longPlaylist].forEach(list => {
      const match = list.find(entry => entry.src === item.src);
      if (match) match.volume = vol;
    });
    const w = document.createElement("div");
    w.className = "volume-slider-wrap";
    w.innerHTML = `<label title="Maximum volume is 100%">🔊:</label><input type="range" class="volume-range" min="0" max="1" step="0.05" value="${vol}"><span class="volume-pct">${Math.round(vol*100)}%</span>`;
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
      numberCell.textContent = !isIncluded ? "—" : item.isFinale ? "Finale" : (currentList.filter(entry => !entry.isFinale).indexOf(item) + 1).toString();

      const previewCell = document.createElement("td");
      const thumb = document.createElement("img");
      thumb.className = "admin-thumb";
      thumb.src = item.src;
      thumb.alt = item.caption || filename;
      thumb.loading = "lazy";
      thumb.onerror = () => { thumb.style.display = "none"; };
      const thumbButton = document.createElement("button");
      thumbButton.className = "admin-thumb-button";
      thumbButton.type = "button";
      thumbButton.title = `View ${item.caption || filename} larger`;
      thumbButton.setAttribute("aria-label", `View ${item.caption || filename} larger`);
      thumbButton.addEventListener("click", event => {
        event.stopPropagation();
        openImagePreview(item);
      });
      thumbButton.appendChild(thumb);
      previewCell.appendChild(thumbButton);

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
        const nonFinalCount = currentList.filter(entry => !entry.isFinale).length;
        const itemPosition = currentList.filter(entry => !entry.isFinale).indexOf(item);
        const topButton = createActionButton("Top", "Move to top", itemPosition === 0);
        topButton.onclick = () => moveItemToPosition(item, 1);
        const upButton = createActionButton("▲", "Move up", itemPosition === 0);
        upButton.onclick = () => moveItemToPosition(item, itemPosition);
        const downButton = createActionButton("▼", "Move down", itemPosition === nonFinalCount - 1);
        downButton.onclick = () => moveItemToPosition(item, itemPosition + 2);
        const bottomButton = createActionButton("Bottom", "Move to bottom", itemPosition === nonFinalCount - 1);
        bottomButton.onclick = () => moveItemToPosition(item, nonFinalCount);
        const removeButton = createActionButton("Remove", "Remove from playlist");
        removeButton.onclick = () => toggle(item, false);
        const positionInput = document.createElement("input");
        positionInput.className = "position-input";
        positionInput.type = "number";
        positionInput.min = "1";
        positionInput.max = nonFinalCount.toString();
        positionInput.step = "1";
        positionInput.value = (itemPosition + 1).toString();
        positionInput.setAttribute("aria-label", `Move ${item.caption || filename} to position`);
        positionInput.title = `Enter a position from 1 to ${nonFinalCount}`;
        const moveButton = createActionButton("Move", "Move to entered position");
        moveButton.onclick = () => moveItemToPosition(item, Number(positionInput.value), positionInput);
        positionInput.addEventListener("change", () => moveItemToPosition(item, Number(positionInput.value), positionInput));
        positionInput.addEventListener("keydown", event => {
          if (event.key === "Enter") {
            event.preventDefault();
            moveItemToPosition(item, Number(positionInput.value), positionInput);
          }
        });
        actions.append(topButton, upButton, downButton, bottomButton, positionInput, moveButton, removeButton);
      } else if (isIncluded && item.isFinale) {
        const finaleBadge = document.createElement("span");
        finaleBadge.className = "badge badge-finale";
        finaleBadge.textContent = "Locked finale";
        actions.appendChild(finaleBadge);
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

  function openImagePreview(item) {
    if (item.type !== "image" || !els.previewModal || !els.previewImage) return;
    els.previewImage.src = item.src;
    els.previewImage.alt = item.caption || item.src.split("/").pop();
    els.previewModal.classList.remove("hidden");
  }

  function closeImagePreview() {
    if (!els.previewModal?.classList.contains("hidden")) {
      els.previewModal.classList.add("hidden");
      if (els.previewImage) {
        els.previewImage.removeAttribute("src");
        els.previewImage.alt = "";
      }
    }
  }

  els.previewModal?.addEventListener("click", closeImagePreview);
  els.previewImage?.addEventListener("click", closeImagePreview);
  document.addEventListener("click", event => {
    if (!els.previewModal?.classList.contains("hidden") && !els.previewModal.contains(event.target)) {
      closeImagePreview();
    }
  });
  document.addEventListener("keydown", event => {
    if (!els.previewModal?.classList.contains("hidden")) closeImagePreview();
  });

  function moveItemToPosition(item, requestedPosition, input) {
    const list = getActiveList();
    const movableItems = list.filter(entry => !entry.isFinale);
    const currentPosition = movableItems.findIndex(entry => entry.src === item.src);
    if (currentPosition === -1) return;

    if (!Number.isInteger(requestedPosition) || requestedPosition < 1 || requestedPosition > movableItems.length) {
      if (input) {
        input.setCustomValidity(`Enter a position from 1 to ${movableItems.length}.`);
        input.reportValidity();
        input.setCustomValidity("");
        input.value = (currentPosition + 1).toString();
      }
      return;
    }

    const targetPosition = requestedPosition - 1;
    if (targetPosition === currentPosition) return;
    movableItems.splice(targetPosition, 0, movableItems.splice(currentPosition, 1)[0]);
    const finale = list.find(entry => entry.isFinale);
    setActiveList(finale ? [...movableItems, finale] : movableItems);
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

  document.getElementById("download-media-data-btn")?.addEventListener("click", () => {
    const source = `// Bill Kockritz Memorial Media Registry
// Generated from the curator admin page.

const BILL_SERVICE_PLAYLIST = ${JSON.stringify(servicePlaylist, null, 2)};

const BILL_LONG_PLAYLIST = ${JSON.stringify(longPlaylist, null, 2)};

const BILL_MASTER_MEDIA = ${JSON.stringify(master, null, 2)};

window.BILL_SERVICE_PLAYLIST = BILL_SERVICE_PLAYLIST;
window.BILL_LONG_PLAYLIST = BILL_LONG_PLAYLIST;
window.BILL_MASTER_MEDIA = BILL_MASTER_MEDIA;
window.BILL_MEDIA = BILL_MASTER_MEDIA;
`;
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "media-data.js";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  document.getElementById("reset-master-btn")?.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your saved curation and restore the defaults from media-data.js?")) {
      MediaStore.resetToMaster();
      window.location.reload();
    }
  });

  renderAll();
})();
