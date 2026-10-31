// Bill Kockritz Memorial Curator Admin Logic
// Manages Service and Long Show playlists, reordering, video volume, and saving

(function() {
  let allMedia = [];
  let servicePlaylist = [];
  let longPlaylist = [];
  let activeTab = 'service';
  let currentPacingMs = 5500;

  function init() {
    allMedia = window.BILL_MEDIA || [];
    currentPacingMs = UTILS.getSavedPacingMs();

    const pacingSelect = document.getElementById('pacing-select');
    if (pacingSelect) {
      pacingSelect.value = currentPacingMs.toString();
      pacingSelect.addEventListener('change', (e) => {
        currentPacingMs = parseInt(e.target.value, 10);
        updateStats();
      });
    }

    loadPlaylists();
    bindHeaderActions();
    bindTabs();
    renderTable();
  }

  function getDefaultService() {
    const finale = allMedia.find(m => m.isFinale);
    const regular = allMedia.filter(m => !m.isFinale);

    if (regular.length <= 65) {
      const list = [...regular];
      if (finale) list.push(finale);
      return list;
    }

    const step = regular.length / 64;
    const list = [];
    for (let i = 0; i < 64; i++) {
      list.push(regular[Math.floor(i * step)]);
    }
    if (finale) list.push(finale);
    return list;
  }

  function getDefaultLong() {
    const finale = allMedia.find(m => m.isFinale);
    const regular = allMedia.filter(m => !m.isFinale);
    const list = [...regular];
    if (finale) list.push(finale);
    return list;
  }

  function loadPlaylists() {
    servicePlaylist = UTILS.getSavedPlaylist(CONFIG.storageKeyService, getDefaultService);
    longPlaylist = UTILS.getSavedPlaylist(CONFIG.storageKeyLong, getDefaultLong);
  }

  function getActiveList() {
    return activeTab === 'service' ? servicePlaylist : longPlaylist;
  }

  function renderTable() {
    const tbody = document.getElementById('media-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const list = getActiveList();

    list.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.className = 'media-row';

      // Index
      const tdIdx = document.createElement('td');
      tdIdx.textContent = (index + 1).toString();
      tr.appendChild(tdIdx);

      // Thumbnail
      const tdThumb = document.createElement('td');
      if (item.type === 'video') {
        tdThumb.innerHTML = '<div class="admin-thumb" style="display:flex;align-items:center;justify-content:center;color:#e2b768;font-size:1.2rem;">▶</div>';
      } else {
        const img = document.createElement('img');
        img.src = item.src;
        img.className = 'admin-thumb';
        img.loading = 'lazy';
        tdThumb.appendChild(img);
      }
      tr.appendChild(tdThumb);

      // Caption & Filename
      const tdInfo = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.value = item.caption || '';
      input.style.width = '100%';
      input.style.background = 'var(--bg-primary)';
      input.style.border = '1px solid var(--border-subtle)';
      input.style.color = 'var(--text-main)';
      input.style.padding = '6px 10px';
      input.style.borderRadius = '6px';
      input.style.fontSize = '0.85rem';
      input.addEventListener('change', (e) => {
        item.caption = e.target.value;
      });

      const fileSub = document.createElement('div');
      fileSub.textContent = item.src;
      fileSub.style.fontSize = '0.75rem';
      fileSub.style.color = 'var(--text-muted)';
      fileSub.style.marginTop = '4px';

      tdInfo.appendChild(input);
      tdInfo.appendChild(fileSub);
      tr.appendChild(tdInfo);

      // Type Badge
      const tdType = document.createElement('td');
      if (item.isFinale) {
        tdType.innerHTML = '<span class="badge badge-finale">Locked Finale</span>';
      } else if (item.type === 'video') {
        tdType.innerHTML = '<span class="badge badge-video">Video Clip</span>';
      } else {
        tdType.innerHTML = '<span class="badge badge-image">Photo</span>';
      }
      tr.appendChild(tdType);

      // Timing / Volume
      const tdTiming = document.createElement('td');
      if (item.type === 'video') {
        const wrap = document.createElement('div');
        wrap.className = 'volume-slider-wrap';
        const volVal = Math.round(((item.volume !== undefined) ? item.volume : CONFIG.videoTargetVolume) * 100);
        wrap.innerHTML = `<span>Vol:</span> <input type="range" class="volume-slider" min="0" max="100" value="${volVal}"> <span>${volVal}%</span>`;

        const slider = wrap.querySelector('input');
        const valSpan = wrap.querySelectorAll('span')[1];
        slider.addEventListener('input', (e) => {
          const v = parseInt(e.target.value, 10);
          item.volume = v / 100;
          valSpan.textContent = `${v}%`;
        });

        tdTiming.appendChild(wrap);
      } else {
        tdTiming.innerHTML = `<span style="color:var(--text-muted);font-size:0.85rem;">${(currentPacingMs / 1000).toFixed(1)}s pace</span>`;
      }
      tr.appendChild(tdTiming);

      // Order / Actions
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'right';
      const rowActs = document.createElement('div');
      rowActs.className = 'row-actions';
      rowActs.style.justifyContent = 'flex-end';

      if (!item.isFinale) {
        const upBtn = document.createElement('button');
        upBtn.className = 'btn-icon';
        upBtn.textContent = '▲';
        upBtn.title = 'Move Up';
        upBtn.disabled = (index === 0);
        upBtn.addEventListener('click', () => moveItem(index, -1));

        const downBtn = document.createElement('button');
        downBtn.className = 'btn-icon';
        downBtn.textContent = '▼';
        downBtn.title = 'Move Down';
        downBtn.disabled = (index >= list.length - 2 && list[list.length - 1]?.isFinale);
        downBtn.addEventListener('click', () => moveItem(index, 1));

        const delBtn = document.createElement('button');
        delBtn.className = 'btn-icon';
        delBtn.textContent = '✖';
        delBtn.title = 'Remove from this playlist';
        delBtn.style.color = '#ff6b6b';
        delBtn.addEventListener('click', () => removeItem(index));

        rowActs.appendChild(upBtn);
        rowActs.appendChild(downBtn);
        rowActs.appendChild(delBtn);
      } else {
        rowActs.innerHTML = '<span style="font-size:0.75rem;color:var(--text-muted);">Permanently Anchored</span>';
      }

      tdActions.appendChild(rowActs);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });

    updateStats();
  }

  function moveItem(index, direction) {
    const list = getActiveList();
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    if (list[target]?.isFinale || list[index]?.isFinale) return;

    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;

    renderTable();
  }

  function removeItem(index) {
    const list = getActiveList();
    if (list[index]?.isFinale) return;
    list.splice(index, 1);
    renderTable();
  }

  function updateStats() {
    const list = getActiveList();
    const countEl = document.getElementById('item-count');
    const runtimeEl = document.getElementById('runtime-estimate');

    if (countEl) countEl.textContent = list.length.toString();

    let totalSecs = 0;
    list.forEach(item => {
      if (item.type === 'video') {
        totalSecs += (item.duration || 15);
      } else {
        totalSecs += (currentPacingMs / 1000);
      }
    });

    if (runtimeEl) {
      runtimeEl.textContent = `~${UTILS.formatTime(totalSecs)}`;
    }
  }

  function bindTabs() {
    const serviceTab = document.getElementById('tab-service-btn');
    const longTab = document.getElementById('tab-long-btn');

    if (serviceTab && longTab) {
      serviceTab.addEventListener('click', () => {
        activeTab = 'service';
        serviceTab.classList.add('active');
        longTab.classList.remove('active');
        renderTable();
      });

      longTab.addEventListener('click', () => {
        activeTab = 'long';
        longTab.classList.add('active');
        serviceTab.classList.remove('active');
        renderTable();
      });
    }
  }

  function bindHeaderActions() {
    const saveBtn = document.getElementById('save-browser-btn');
    const resetBtn = document.getElementById('reset-master-btn');
    const notice = document.getElementById('save-notice');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        localStorage.setItem(CONFIG.storageKeyService, JSON.stringify(servicePlaylist));
        localStorage.setItem(CONFIG.storageKeyLong, JSON.stringify(longPlaylist));
        localStorage.setItem(CONFIG.storageKeyPacing, currentPacingMs.toString());

        if (notice) {
          notice.style.display = 'block';
          setTimeout(() => {
            notice.style.display = 'none';
          }, 3500);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset both playlists to the original master list?')) {
          localStorage.removeItem(CONFIG.storageKeyService);
          localStorage.removeItem(CONFIG.storageKeyLong);
          localStorage.removeItem(CONFIG.storageKeyPacing);

          servicePlaylist = getDefaultService();
          longPlaylist = getDefaultLong();
          currentPacingMs = CONFIG.defaultPhotoPacingMs;

          const pacingSelect = document.getElementById('pacing-select');
          if (pacingSelect) pacingSelect.value = currentPacingMs.toString();

          renderTable();
          alert('Playlists have been reset to master defaults.');
        }
      });
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
