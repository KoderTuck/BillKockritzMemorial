// Bill Kockritz Memorial Media Archive & Lightbox
// Builds searchable gallery and full-screen lightbox navigation (Left/Right arrows)

(function() {
  let masterMedia = [];
  let currentFilteredList = [];
  let activeLightboxIndex = 0;

  function initArchive() {
    masterMedia = window.BILL_MEDIA || window.BILL_MASTER_MEDIA || [];
    currentFilteredList = [...masterMedia];

    const searchInput = document.getElementById('archive-search');
    const searchStats = document.getElementById('archive-search-stats');
    const archiveCount = document.getElementById('archive-count');

    if (archiveCount) {
      archiveCount.textContent = masterMedia.length;
    }

    renderGrid(currentFilteredList);

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          currentFilteredList = [...masterMedia];
          if (searchStats) searchStats.textContent = '';
        } else {
          currentFilteredList = masterMedia.filter(item => {
            const cap = (item.caption || '').toLowerCase();
            const src = (item.src || '').toLowerCase();
            return cap.includes(query) || src.includes(query);
          });
          if (searchStats) {
            searchStats.textContent = `Showing ${currentFilteredList.length} of ${masterMedia.length}`;
          }
        }
        renderGrid(currentFilteredList);
      });
    }

    setupLightboxEvents();
  }

  function renderGrid(list) {
    const grid = document.getElementById('archive-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (list.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-size: 1.1rem;">No memories found matching your search.</div>';
      return;
    }

    list.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'archive-card';

      const thumb = document.createElement('div');
      thumb.className = 'archive-card-thumb';

      if (item.type === 'video') {
        thumb.innerHTML = '<span class="video-badge">▶ Video</span><div style="color:#8e9bb0; font-size: 0.85rem;">🎬 Video Clip</div>';
      } else {
        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.caption || 'Bill Kockritz Memory';
        img.loading = 'lazy';
        thumb.appendChild(img);
      }

      const info = document.createElement('div');
      info.className = 'archive-card-info';
      const captionP = document.createElement('p');
      captionP.textContent = item.caption || item.src.split('/').pop();
      info.appendChild(captionP);

      card.appendChild(thumb);
      card.appendChild(info);

      card.addEventListener('click', () => {
        openLightbox(index);
      });

      grid.appendChild(card);
    });
  }

  function openLightbox(index) {
    if (index < 0 || index >= currentFilteredList.length) return;
    activeLightboxIndex = index;

    const modal = document.getElementById('archive-lightbox-modal');
    if (modal) {
      modal.classList.remove('hidden');
      renderLightboxContent();
    }
  }

  function closeLightbox() {
    const modal = document.getElementById('archive-lightbox-modal');
    if (modal) {
      modal.classList.add('hidden');
      const container = document.getElementById('lightbox-media-container');
      if (container) container.innerHTML = '';
    }
  }

  function nextLightbox() {
    if (currentFilteredList.length <= 1) return;
    activeLightboxIndex = (activeLightboxIndex + 1) % currentFilteredList.length;
    renderLightboxContent();
  }

  function prevLightbox() {
    if (currentFilteredList.length <= 1) return;
    activeLightboxIndex = (activeLightboxIndex - 1 + currentFilteredList.length) % currentFilteredList.length;
    renderLightboxContent();
  }

  function renderLightboxContent() {
    const container = document.getElementById('lightbox-media-container');
    const captionEl = document.getElementById('lightbox-caption-text');
    const counterEl = document.getElementById('lightbox-counter');

    if (!container) return;
    container.innerHTML = '';

    const item = currentFilteredList[activeLightboxIndex];
    if (!item) return;

    if (item.type === 'video') {
      const vid = document.createElement('video');
      vid.src = item.src;
      vid.controls = true;
      vid.autoplay = true;
      vid.playsInline = true;
      window.AudioManager?.prepareVideo(vid, item.volume ?? window.CONFIG?.videoTargetVolume ?? 0.55);
      vid.style.maxHeight = '72vh';
      vid.style.maxWidth = '82vw';
      container.appendChild(vid);
    } else {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.caption || 'Bill Kockritz Memorial';
      img.style.maxHeight = '75vh';
      img.style.maxWidth = '84vw';
      container.appendChild(img);
    }

    if (captionEl) {
      captionEl.textContent = item.caption || '';
    }
    if (counterEl) {
      counterEl.textContent = `${activeLightboxIndex + 1} / ${currentFilteredList.length}`;
    }
  }

  function setupLightboxEvents() {
    const closeBtn = document.getElementById('lightbox-close-btn');
    const prevBtn = document.getElementById('lightbox-prev-btn');
    const nextBtn = document.getElementById('lightbox-next-btn');
    const modal = document.getElementById('archive-lightbox-modal');

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', prevLightbox);
    if (nextBtn) nextBtn.addEventListener('click', nextLightbox);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeLightbox();
      });
    }

    window.addEventListener('keydown', (e) => {
      const modalOpen = modal && !modal.classList.contains('hidden');
      if (!modalOpen) return;

      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextLightbox();
      if (e.key === 'ArrowLeft') prevLightbox();
    });
  }

  window.ArchiveManager = {
    init: initArchive,
    open: openLightbox,
    close: closeLightbox
  };
})();
