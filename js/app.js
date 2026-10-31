// Bill Kockritz Memorial Main Presentation Orchestrator
// Connects Mode switching, Slide engine, Timers, Audio ducking, and Billisms

(function() {
  let allMedia = [];
  let currentPlaylist = [];
  let currentMode = "service"; // "service" | "long" | "archive"
  let currentIndex = 0;
  let isPlaying = true;
  let slideTimer = null;
  let pacingMs = 5500;

  let stage, mediaSlot, counter, progressBar, progressTrack;
  let prevBtn, playPauseBtn, nextBtn, speedSelect, fullscreenBtn;
  let presentationView, archiveView;
  let modeLongBtn, modeServiceBtn, modeArchiveBtn;
  let billismBtn, billismModal, billismText, billismCloseBtn;

  function init() {
    allMedia = window.BILL_MEDIA || [];
    if (allMedia.length === 0) {
      console.warn("No media found in window.BILL_MEDIA!");
    }

    cacheDOM();
    bindEvents();

    if (window.AudioManager) window.AudioManager.init();
    if (window.ArchiveManager) window.ArchiveManager.init();

    pacingMs = UTILS.getSavedPacingMs();
    if (speedSelect) {
      speedSelect.value = pacingMs.toString();
    }

    switchMode("service");
  }

  function cacheDOM() {
    stage = document.getElementById("theater-stage");
    mediaSlot = document.getElementById("media-slot");
    counter = document.getElementById("slide-counter");
    progressBar = document.getElementById("progress-bar");
    progressTrack = document.getElementById("progress-track");

    prevBtn = document.getElementById("prev-btn");
    playPauseBtn = document.getElementById("play-pause-btn");
    nextBtn = document.getElementById("next-btn");
    speedSelect = document.getElementById("speed-select");
    fullscreenBtn = document.getElementById("fullscreen-btn");

    presentationView = document.getElementById("presentation-view");
    archiveView = document.getElementById("archive-view");

    modeLongBtn = document.getElementById("mode-long-btn");
    modeServiceBtn = document.getElementById("mode-service-btn");
    modeArchiveBtn = document.getElementById("mode-archive-btn");

    billismBtn = document.getElementById("billism-btn");
    billismModal = document.getElementById("billism-modal");
    billismText = document.getElementById("billism-text");
    billismCloseBtn = document.getElementById("billism-close-btn");
  }

  function getDefaultServicePlaylist() {
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

  function getDefaultLongPlaylist() {
    const finale = allMedia.find(m => m.isFinale);
    const regular = allMedia.filter(m => !m.isFinale);
    const list = [...regular];
    if (finale) list.push(finale);
    return list;
  }

  function buildPlaylist(mode) {
    if (mode === "service") {
      currentPlaylist = UTILS.getSavedPlaylist(CONFIG.storageKeyService, getDefaultServicePlaylist);
    } else if (mode === "long") {
      currentPlaylist = UTILS.getSavedPlaylist(CONFIG.storageKeyLong, getDefaultLongPlaylist);
    }
    if (!currentPlaylist || currentPlaylist.length === 0) {
      currentPlaylist = [...allMedia];
    }
  }

  function renderSlide(index) {
    if (!currentPlaylist || currentPlaylist.length === 0) return;
    if (index < 0) index = 0;
    if (index >= currentPlaylist.length) index = 0;
    currentIndex = index;

    const item = currentPlaylist[currentIndex];
    if (!mediaSlot) return;
    mediaSlot.innerHTML = "";

    if (item.isFinale) {
      if (window.AudioManager) window.AudioManager.unduck();

      const wrap = document.createElement("div");
      wrap.className = "finale-container";

      const img = document.createElement("img");
      img.src = item.src;
      img.alt = "Well Done Faithful Servant";

      const quote = document.createElement("p");
      quote.className = "finale-quote";
      quote.textContent = item.caption || "“My life’s goal is to get to the end and hear Jesus say, well done, good and faithful servant!”";

      wrap.appendChild(img);
      wrap.appendChild(quote);
      mediaSlot.appendChild(wrap);

    } else if (item.type === "video") {
      // Auto-ducking: Pause background music during video playback
      if (window.AudioManager) window.AudioManager.duck();

      const video = document.createElement("video");
      video.src = item.src;
      video.autoplay = true;
      video.controls = true;
      video.playsInline = true;
      video.volume = (item.volume !== undefined) ? item.volume : CONFIG.videoTargetVolume;

      video.onended = () => {
        if (window.AudioManager) window.AudioManager.unduck();
        nextSlide();
      };

      mediaSlot.appendChild(video);

    } else {
      // Image slide
      if (window.AudioManager) window.AudioManager.unduck();

      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.caption || "Bill Kockritz Memory";
      mediaSlot.appendChild(img);
    }

    if (counter) {
      counter.textContent = `${currentIndex + 1} / ${currentPlaylist.length}`;
    }
    if (progressBar) {
      const pct = ((currentIndex + 1) / currentPlaylist.length) * 100;
      progressBar.style.width = `${pct}%`;
    }
  }

  function startTimer() {
    clearTimeout(slideTimer);
    if (!isPlaying) return;

    const currentItem = currentPlaylist[currentIndex];
    if (currentItem && currentItem.type === "video") {
      return;
    }

    slideTimer = setTimeout(() => {
      nextSlide();
    }, pacingMs);
  }

  function nextSlide() {
    let nextIdx = currentIndex + 1;
    if (nextIdx >= currentPlaylist.length) {
      nextIdx = 0;
    }
    renderSlide(nextIdx);
    startTimer();
  }

  function prevSlide() {
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = currentPlaylist.length - 1;
    renderSlide(prevIdx);
    startTimer();
  }

  function togglePlayPause() {
    isPlaying = !isPlaying;
    if (playPauseBtn) playPauseBtn.textContent = isPlaying ? "❚❚" : "▶";
    if (isPlaying) {
      startTimer();
    } else {
      clearTimeout(slideTimer);
    }
  }

  function switchMode(mode) {
    currentMode = mode;

    if (mode === "archive") {
      presentationView?.classList.add("hidden");
      archiveView?.classList.remove("hidden");

      modeLongBtn?.classList.remove("active");
      modeServiceBtn?.classList.remove("active");
      modeArchiveBtn?.classList.add("active");

      clearTimeout(slideTimer);
      isPlaying = false;
      if (playPauseBtn) playPauseBtn.textContent = "▶";
    } else {
      presentationView?.classList.remove("hidden");
      archiveView?.classList.add("hidden");

      modeLongBtn?.classList.toggle("active", mode === "long");
      modeServiceBtn?.classList.toggle("active", mode === "service");
      modeArchiveBtn?.classList.remove("active");

      buildPlaylist(mode);
      isPlaying = true;
      if (playPauseBtn) playPauseBtn.textContent = "❚❚";
      renderSlide(0);
      startTimer();
    }
  }

  function bindEvents() {
    prevBtn?.addEventListener("click", prevSlide);
    nextBtn?.addEventListener("click", nextSlide);
    playPauseBtn?.addEventListener("click", togglePlayPause);

    speedSelect?.addEventListener("change", (e) => {
      pacingMs = parseInt(e.target.value, 10);
      if (isPlaying) startTimer();
    });

    progressTrack?.addEventListener("click", (e) => {
      const rect = progressTrack.getBoundingClientRect();
      const clickPos = (e.clientX - rect.left) / rect.width;
      const targetIndex = Math.floor(clickPos * currentPlaylist.length);
      renderSlide(targetIndex);
      startTimer();
    });

    fullscreenBtn?.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        stage?.requestFullscreen().catch(err => console.warn(err));
      } else {
        document.exitFullscreen().catch(err => console.warn(err));
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
      }
      if (e.key === "f" || e.key === "F") {
        fullscreenBtn?.click();
      }
    });

    modeLongBtn?.addEventListener("click", () => switchMode("long"));
    modeServiceBtn?.addEventListener("click", () => switchMode("service"));
    modeArchiveBtn?.addEventListener("click", () => switchMode("archive"));

    billismBtn?.addEventListener("click", () => {
      const quotes = CONFIG.billisms;
      const randomQuip = quotes[Math.floor(Math.random() * quotes.length)];
      if (billismText) billismText.textContent = randomQuip;
      billismModal?.classList.remove("hidden");
    });

    billismCloseBtn?.addEventListener("click", () => {
      billismModal?.classList.add("hidden");
    });

    billismModal?.addEventListener("click", (e) => {
      if (e.target === billismModal) billismModal?.classList.add("hidden");
    });
  }

  window.addEventListener("DOMContentLoaded", init);
})();
