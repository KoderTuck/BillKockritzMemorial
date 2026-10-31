(function () {
  const stage = document.getElementById("theater-stage");
  const mediaSlot = document.getElementById("media-slot");
  const counter = document.getElementById("slide-counter");
  const progressBar = document.getElementById("progress-bar");
  
  const masterList = window.BILL_MASTER_MEDIA || [];
  const currentData = UTILS.getActiveMediaList(masterList);
  const shownInPrelude = new Set();
  
  let activePlaylist = [];
  let currentIndex = 0;
  let isPlaying = true;
  let slideTimer = null;
  let currentDuration = UTILS.getSavedPacingMs();

  function init() {
    if (window.location.hash === "#admin") { window.location.href = "admin.html"; return; }
    if (document.getElementById("archive-count")) document.getElementById("archive-count").textContent = currentData.length;
    
    AudioManager.init();
    ArchiveManager.buildGrid("archive-grid", currentData, (clickedItem) => {
      activePlaylist = [clickedItem];
      currentIndex = 0;
      document.getElementById("presentation-view")?.classList.remove("hidden");
      document.getElementById("archive-view")?.classList.add("hidden");
      renderSlide(0);
    });

    bindGlobalEvents();
    applyModeChange("service");
  }

  function buildServicePlaylist() {
    const finale = currentData.find(m => m.isFinale);
    activePlaylist = currentData.filter(m => m.inService && !m.isFinale);
    if (finale) activePlaylist.push(finale);
  }

  function buildPreludePlaylist() {
    shownInPrelude.clear();
    const pool = currentData.filter(m => !m.isFinale && !m.inService);
    activePlaylist = UTILS.shuffle(pool.length > 25 ? pool : currentData.filter(m => !m.isFinale));
    activePlaylist.forEach(i => shownInPrelude.add(i.src));
  }

  function buildPostludePlaylist() {
    let unseen = currentData.filter(m => !m.isFinale && !shownInPrelude.has(m.src));
    if (unseen.length < 25) unseen = currentData.filter(m => !m.isFinale);
    activePlaylist = UTILS.shuffle(unseen);
  }

  function renderSlide(index) {
    if (index < 0) index = activePlaylist.length - 1;
    if (index >= activePlaylist.length) index = 0;
    currentIndex = index;

    const item = activePlaylist[currentIndex];
    if (!item) return;

    mediaSlot.innerHTML = "";

    if (item.isFinale) {
      mediaSlot.innerHTML = `
        <div class="finale-container">
          <img src="${item.src}" alt="Well Done">
          <p class="finale-quote">${item.caption}</p>
        </div>`;
    } else if (item.type === "video") {
      AudioManager.duckForVideo();
      const vid = document.createElement("video");
      vid.src = item.src;
      vid.autoplay = true;
      vid.controls = true;
      vid.volume = item.volume !== undefined ? item.volume : CONFIG.videoTargetVolume;
      vid.onended = () => { AudioManager.resumeAfterVideo(); nextSlide(); };
      mediaSlot.appendChild(vid);
    } else {
      const img = document.createElement("img");
      img.src = item.src;
      img.onerror = () => { if (img.src.endsWith(".JPG")) img.src = img.src.replace(".JPG", ".jpg"); };
      mediaSlot.appendChild(img);
    }

    if (counter) counter.textContent = `${currentIndex + 1} / ${activePlaylist.length}`;
    if (progressBar) progressBar.style.width = `${((currentIndex + 1) / activePlaylist.length) * 100}%`;
  }

  function startTimer() {
    clearTimeout(slideTimer);
    if (!isPlaying || activePlaylist[currentIndex]?.type === "video") return;
    slideTimer = setTimeout(nextSlide, currentDuration);
  }

  function nextSlide() { renderSlide(currentIndex + 1); startTimer(); }
  function prevSlide() { renderSlide(currentIndex - 1); startTimer(); }
  
  function togglePlay() {
    isPlaying = !isPlaying;
    const btn = document.getElementById("play-pause-btn");
    if (btn) btn.textContent = isPlaying ? "❚❚" : "▶";
    isPlaying ? startTimer() : clearTimeout(slideTimer);
  }

  function applyModeChange(mode) {
    clearTimeout(slideTimer);
    ["prelude", "service", "postlude", "archive"].forEach(m => {
      document.getElementById(`mode-${m}-btn`)?.classList.remove("active");
    });
    
    document.getElementById(`mode-${mode}-btn`)?.classList.add("active");
    currentDuration = UTILS.getSavedPacingMs();
    
    const speedSelect = document.getElementById("speed-select");
    if (speedSelect) {
      let match = Array.from(speedSelect.options).find(opt => parseInt(opt.value, 10) === currentDuration);
      if (!match) {
        const customOpt = document.createElement("option");
        customOpt.value = currentDuration.toString();
        customOpt.textContent = `${(currentDuration / 1000).toFixed(1)}s (Curator)`;
        speedSelect.appendChild(customOpt);
        customOpt.selected = true;
      } else {
        match.selected = true;
      }
    }

    if (mode === "archive") {
      document.getElementById("presentation-view")?.classList.add("hidden");
      document.getElementById("archive-view")?.classList.remove("hidden");
      isPlaying = false;
      return;
    }

    document.getElementById("presentation-view")?.classList.remove("hidden");
    document.getElementById("archive-view")?.classList.add("hidden");

    if (mode === "service") buildServicePlaylist();
    if (mode === "prelude") buildPreludePlaylist();
    if (mode === "postlude") buildPostludePlaylist();

    isPlaying = true;
    const btn = document.getElementById("play-pause-btn");
    if (btn) btn.textContent = "❚❚";
    renderSlide(0);
    startTimer();
  }

  function bindGlobalEvents() {
    document.getElementById("next-btn")?.addEventListener("click", nextSlide);
    document.getElementById("prev-btn")?.addEventListener("click", prevSlide);
    document.getElementById("play-pause-btn")?.addEventListener("click", togglePlay);
    
    document.getElementById("speed-select")?.addEventListener("change", (e) => {
      currentDuration = parseInt(e.target.value, 10);
      if (isPlaying) startTimer();
    });

    document.getElementById("progress-track")?.addEventListener("click", (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickPos = (e.clientX - rect.left) / rect.width;
      renderSlide(Math.floor(clickPos * activePlaylist.length));
      startTimer();
    });

    document.getElementById("fullscreen-btn")?.addEventListener("click", () => {
      const el = stage || document.documentElement;
      !document.fullscreenElement ? el.requestFullscreen?.() : document.exitFullscreen?.();
    });

    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.key === "f" || e.key === "F") {
        const el = stage || document.documentElement;
        !document.fullscreenElement ? el.requestFullscreen?.() : document.exitFullscreen?.();
      }
    });

    let pendingMode = null;
    const promptModal = document.getElementById("music-prompt-modal");

    ["prelude", "service", "postlude", "archive"].forEach(mode => {
      document.getElementById(`mode-${mode}-btn`)?.addEventListener("click", () => {
        if (mode === "archive") { applyModeChange("archive"); return; }
        clearTimeout(slideTimer);
        pendingMode = mode;
        const titles = { prelude: "Walk-In (Prelude Slideshow)", service: "7-Minute Service Presentation", postlude: "Walk-Out (Postlude Slideshow)" };
        if (document.getElementById("prompt-slideshow-title")) {
          document.getElementById("prompt-slideshow-title").textContent = titles[mode];
        }
        promptModal?.classList.remove("hidden");
      });
    });

    document.getElementById("choose-country-btn")?.addEventListener("click", () => {
      AudioManager.activeSource = "country"; promptModal?.classList.add("hidden"); applyModeChange(pendingMode); AudioManager.play();
    });
    document.getElementById("choose-spotify-btn")?.addEventListener("click", () => {
      AudioManager.activeSource = "spotify"; promptModal?.classList.add("hidden"); applyModeChange(pendingMode); AudioManager.play();
    });
    document.getElementById("choose-none-btn")?.addEventListener("click", () => {
      promptModal?.classList.add("hidden"); AudioManager.pause(); applyModeChange(pendingMode);
    });

    document.getElementById("archive-search")?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      ArchiveManager.buildGrid("archive-grid", q ? currentData.filter(m => (m.caption || m.src).toLowerCase().includes(q)) : currentData, (item) => {
        activePlaylist = [item]; currentIndex = 0;
        document.getElementById("presentation-view")?.classList.remove("hidden");
        document.getElementById("archive-view")?.classList.add("hidden");
        renderSlide(0);
      });
    });

    document.getElementById("billism-btn")?.addEventListener("click", () => {
      document.getElementById("billism-text").textContent = CONFIG.billisms[Math.floor(Math.random() * CONFIG.billisms.length)];
      document.getElementById("billism-modal")?.classList.remove("hidden");
    });
    document.getElementById("billism-close-btn")?.addEventListener("click", () => document.getElementById("billism-modal")?.classList.add("hidden"));
    
    document.getElementById("music-drawer-toggle")?.addEventListener("click", () => document.getElementById("music-drawer")?.classList.toggle("hidden"));
    document.getElementById("close-drawer-btn")?.addEventListener("click", () => document.getElementById("music-drawer")?.classList.add("hidden"));
  }

  window.addEventListener("DOMContentLoaded", init);
})();
