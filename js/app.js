(function () {
  const presentation = document.getElementById("presentation-view");
  const mediaSlot = document.getElementById("media-slot");
  const counter = document.getElementById("slide-counter");
  const progressBar = document.getElementById("progress-bar");
  
  const shownInPrelude = new Set();
  
  let activePlaylist = [];
  let activeMode = null;
  let currentIndex = 0;
  let isPlaying = false;
  let slideTimer = null;
  let currentDuration = 5500;

  function init() {
    if (window.location.hash === "#admin") { window.location.href = "admin.html"; return; }
    if (document.getElementById("archive-count")) document.getElementById("archive-count").textContent = MediaStore.getMasterMedia().length;
    
    AudioManager.init();
    ArchiveManager.init();

    bindGlobalEvents();
    applyModeChange("service");
  }

  function renderSlide(index) {
    if (index < 0) index = activePlaylist.length - 1;
    if (index >= activePlaylist.length) index = 0;
    currentIndex = index;

    const item = activePlaylist[currentIndex];
    if (!item) return;

    mediaSlot.innerHTML = "";
    if (item.type === "video") AudioManager.duck();
    else AudioManager.unduck();

    if (item.isFinale) {
      mediaSlot.innerHTML = `
        <div class="finale-container">
          <img src="${item.src}" alt="Well Done">
          <p class="finale-quote">${item.caption}</p>
        </div>`;
    } else if (item.type === "video") {
      const vid = document.createElement("video");
      vid.src = item.src;
      vid.autoplay = isPlaying;
      vid.controls = true;
      AudioManager.prepareVideo(vid, item.volume ?? window.CONFIG?.videoTargetVolume ?? 0.55);
      vid.onended = () => {
        if (isPlaying) nextSlide();
      };
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

  function nextSlide() {
    if (activeMode === "service" && currentIndex >= activePlaylist.length - 1) {
      clearTimeout(slideTimer);
      isPlaying = false;
      const btn = document.getElementById("play-pause-btn");
      if (btn) btn.textContent = "▶";
      AudioManager.fadeOut();
      return;
    }

    renderSlide(currentIndex + 1);
    startTimer();
  }
  function prevSlide() { renderSlide(currentIndex - 1); startTimer(); }
  
  function togglePlay() {
    isPlaying = !isPlaying;
    const btn = document.getElementById("play-pause-btn");
    if (btn) btn.textContent = isPlaying ? "❚❚" : "▶";
    AudioManager.setPresentationPlaying(isPlaying);
    const video = mediaSlot.querySelector("video");
    if (video) {
      if (isPlaying) {
        if (video.ended) nextSlide();
        else video.play().catch(error => console.warn("Could not resume presentation video.", error));
      } else {
        video.pause();
      }
    }
    isPlaying ? startTimer() : clearTimeout(slideTimer);
  }

  function updateFullscreenUI() {
    const isFullscreen = document.fullscreenElement === presentation;
    presentation?.classList.toggle("is-fullscreen", isFullscreen);
    const fullscreenButton = document.getElementById("fullscreen-btn");
    if (fullscreenButton) {
      fullscreenButton.title = isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)";
      fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      if (!document.exitFullscreen) {
        console.error("Fullscreen exit is not supported by this browser.");
        return;
      }
      document.exitFullscreen().catch(error => {
        console.error("Could not exit fullscreen presentation.", error);
      });
      return;
    }

    if (!presentation?.requestFullscreen) {
      console.error("Fullscreen presentation is not supported by this browser.");
      return;
    }

    presentation.requestFullscreen().catch(error => {
      console.error("Could not enter fullscreen presentation.", error);
    });
  }

  function applyModeChange(mode) {
    clearTimeout(slideTimer);
    isPlaying = false;
    mediaSlot.querySelector("video")?.pause();
    AudioManager.setPresentationPlaying(false);
    activeMode = mode;
    ["prelude", "service", "postlude", "long", "archive"].forEach(m => {
      document.getElementById(`mode-${m}-btn`)?.classList.remove("active");
    });
    
    document.getElementById(`mode-${mode}-btn`)?.classList.add("active");

    if (mode === "archive") {
      document.getElementById("presentation-view")?.classList.add("hidden");
      document.getElementById("archive-view")?.classList.remove("hidden");
      const btn = document.getElementById("play-pause-btn");
      if (btn) btn.textContent = "▶";
      return;
    }

    document.getElementById("presentation-view")?.classList.remove("hidden");
    document.getElementById("archive-view")?.classList.add("hidden");

    if (mode === "service") {
      activePlaylist = MediaStore.getServicePlaylist();
      currentDuration = MediaStore.getPacingMs('service');
      AudioManager.selectServiceMusic();
    } else if (mode === "long") {
      activePlaylist = MediaStore.getLongShowPlaylist();
      currentDuration = MediaStore.getPacingMs('long');
    } else if (mode === "prelude") {
      const pool = MediaStore.getLongShowPlaylist().filter(m => !m.isFinale);
      activePlaylist = window.UTILS ? window.UTILS.shuffle(pool) : pool;
      currentDuration = MediaStore.getPacingMs('long');
    }

    // Sync UI selector
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

    const btn = document.getElementById("play-pause-btn");
    if (btn) btn.textContent = "▶";
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

    document.getElementById("fullscreen-btn")?.addEventListener("click", toggleFullscreen);
    document.getElementById("exit-fullscreen-btn")?.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", updateFullscreenUI);

    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    });

    let pendingMode = null;
    ["prelude", "service", "postlude", "long", "archive"].forEach(mode => {
      document.getElementById(`mode-${mode}-btn`)?.addEventListener("click", () => {
        if (mode === "archive") { applyModeChange("archive"); return; }
        clearTimeout(slideTimer);
        applyModeChange(mode);
      });
    });

    document.getElementById("billism-btn")?.addEventListener("click", () => {
      document.getElementById("billism-text").textContent = (window.CONFIG?.billisms || ["Go Seahawks!"])[Math.floor(Math.random() * (window.CONFIG?.billisms?.length || 1))];
      document.getElementById("billism-modal")?.classList.remove("hidden");
    });
    document.getElementById("billism-close-btn")?.addEventListener("click", () => document.getElementById("billism-modal")?.classList.add("hidden"));
    
  }

  window.addEventListener("DOMContentLoaded", init);
})();
