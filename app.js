// Bill Kockritz Memorial Application Engine (Synchronized Pacing, Fullscreen & Audio Level Matching)

(function () {
  // DOM References
  const stage = document.getElementById("theater-stage");
  const mediaSlot = document.getElementById("media-slot");
  const captionText = document.getElementById("slide-caption-text");
  const counter = document.getElementById("slide-counter");
  const progressBar = document.getElementById("progress-bar");
  const progressTrack = document.getElementById("progress-track");

  const prevBtn = document.getElementById("prev-btn");
  const playPauseBtn = document.getElementById("play-pause-btn");
  const nextBtn = document.getElementById("next-btn");
  const speedSelect = document.getElementById("speed-select");
  const fullscreenBtn = document.getElementById("fullscreen-btn");

  const presentationView = document.getElementById("presentation-view");
  const archiveView = document.getElementById("archive-view");
  const modePreludeBtn = document.getElementById("mode-prelude-btn");
  const modeServiceBtn = document.getElementById("mode-service-btn");
  const modePostludeBtn = document.getElementById("mode-postlude-btn");
  const modeArchiveBtn = document.getElementById("mode-archive-btn");

  const archiveCount = document.getElementById("archive-count");
  const archiveGrid = document.getElementById("archive-grid");
  const archiveSearch = document.getElementById("archive-search");

  // Music Elements
  const quickMusicBtn = document.getElementById("quick-music-btn");
  const quickMusicIcon = document.getElementById("quick-music-icon");
  const musicDrawerToggle = document.getElementById("music-drawer-toggle");
  const musicDrawer = document.getElementById("music-drawer");
  const closeDrawerBtn = document.getElementById("close-drawer-btn");
  const drawerToggleAudioBtn = document.getElementById("drawer-toggle-audio-btn");

  const tabCountryBtn = document.getElementById("tab-country-btn");
  const tabSpotifyBtn = document.getElementById("tab-spotify-btn");
  const countrySection = document.getElementById("country-player-section");
  const spotifySection = document.getElementById("spotify-player-section");
  const countryIframe = document.getElementById("country-music-iframe");
  const spotifyIframe = document.getElementById("spotify-music-iframe");

  // Music Prompt Modal
  const musicPromptModal = document.getElementById("music-prompt-modal");
  const promptSlideshowTitle = document.getElementById("prompt-slideshow-title");
  const chooseCountryBtn = document.getElementById("choose-country-btn");
  const chooseSpotifyBtn = document.getElementById("choose-spotify-btn");
  const chooseNoneBtn = document.getElementById("choose-none-btn");

  // Billisms
  const billismBtn = document.getElementById("billism-btn");
  const billismModal = document.getElementById("billism-modal");
  const billismText = document.getElementById("billism-text");
  const billismCloseBtn = document.getElementById("billism-close-btn");

  const BILLISMS = [
    "“My life’s goal is to get to the end and hear Jesus say, well done, good and faithful servant!”",
    "“Why catch a small fish when there’s a trophy waiting out in the deep water?”",
    "“You’re never too old to take the 4-wheeler through the biggest mud puddle on the trail.”",
    "“There is no problem that campfire coffee and a good dog can’t improve.”",
    "“Life is always better when you’re wearing the big sombrero.”",
    "“Family first, faithful always, and never turn down second helpings.”",
    "“Go Seahawks!”"
  ];

  // Application State
  const allMedia = window.BILL_MEDIA || [];
  let activePlaylist = [];
  let currentIndex = 0;
  let isPlaying = true;
  let slideTimer = null;

  // Retrieve user's configured curator pacing (default: 5.5s)
  function getCuratorPacingDurationMs() {
    const saved = localStorage.getItem("BILL_SERVICE_PHOTO_DURATION");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) {
        return Math.round(parsed * 1000);
      }
    }
    return 5500;
  }

  let currentDuration = getCuratorPacingDurationMs();
  let currentMode = "service";

  // Audio State & Normalization
  let musicEnabled = false;
  let activeMusicSource = "country";
  let pendingMode = null;
  const VIDEO_TARGET_VOLUME = 0.55; // Calibrated volume to match background streaming music
  const shownInPrelude = new Set();

  function init() {
    if (archiveCount) archiveCount.textContent = allMedia.length;

    if (window.location.hash === "#admin") {
      window.location.href = "admin.html";
      return;
    }

    // Initialize dropdown with curator timing
    syncSpeedSelector(currentDuration);

    applyModeChange("service");
    buildArchiveGrid();
    bindEvents();
    updateAudioUI();
  }

  function syncSpeedSelector(ms) {
    if (!speedSelect) return;
    let match = Array.from(speedSelect.options).find(opt => parseInt(opt.value, 10) === ms);
    if (!match) {
      const customOpt = document.createElement("option");
      customOpt.value = ms.toString();
      customOpt.textContent = `${(ms / 1000).toFixed(1)}s (Curator)`;
      speedSelect.appendChild(customOpt);
      customOpt.selected = true;
    } else {
      match.selected = true;
    }
  }

  // Fisher-Yates Shuffle
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 1. Build 7-Minute Curated Service
  function build7MinServicePlaylist() {
    const finale = allMedia.find(m => m.isFinale);
    const curated = allMedia.filter(m => m.inService && !m.isFinale);
    activePlaylist = [...curated];
    if (finale) activePlaylist.push(finale);
  }

  // 2. Build Walk-In (Prelude): Non-service photos randomized
  function buildPreludePlaylist() {
    shownInPrelude.clear();
    const pool = allMedia.filter(m => !m.isFinale && !m.inService);
    const shuffled = shuffle(pool.length > 25 ? pool : allMedia.filter(m => !m.isFinale));
    shuffled.forEach(item => shownInPrelude.add(item.src));
    activePlaylist = shuffled;
  }

  // 3. Build Walk-Out (Postlude): Photos NOT seen in Walk-In
  function buildPostludePlaylist() {
    let unseen = allMedia.filter(m => !m.isFinale && !shownInPrelude.has(m.src));
    if (unseen.length < 25) {
      unseen = allMedia.filter(m => !m.isFinale);
    }
    activePlaylist = shuffle(unseen);
  }

  // Audio Controls & Muting
  function setMusicSource(source) {
    activeMusicSource = source;
    if (source === "country") {
      if (tabCountryBtn) tabCountryBtn.classList.add("active");
      if (tabSpotifyBtn) tabSpotifyBtn.classList.remove("active");
      if (countrySection) countrySection.classList.remove("hidden");
      if (spotifySection) spotifySection.classList.add("hidden");
    } else if (source === "spotify") {
      if (tabSpotifyBtn) tabSpotifyBtn.classList.add("active");
      if (tabCountryBtn) tabCountryBtn.classList.remove("active");
      if (spotifySection) spotifySection.classList.remove("hidden");
      if (countrySection) countrySection.classList.add("hidden");
    }
  }

  function playMusic() {
    musicEnabled = true;
    updateAudioUI();

    if (activeMusicSource === "country") {
      setMusicSource("country");
      if (countryIframe && !countryIframe.src.includes("autoplay=1")) {
        const separator = countryIframe.src.includes("?") ? "&" : "?";
        countryIframe.src = countryIframe.src + separator + "autoplay=1";
      } else if (countryIframe) {
        sendYouTubeCommand("playVideo");
      }
    } else if (activeMusicSource === "spotify") {
      setMusicSource("spotify");
      if (musicDrawer) musicDrawer.classList.remove("hidden");
    }
  }

  function pauseMusic() {
    musicEnabled = false;
    updateAudioUI();
    sendYouTubeCommand("pauseVideo");
  }

  function sendYouTubeCommand(func) {
    try {
      if (countryIframe && countryIframe.contentWindow) {
        countryIframe.contentWindow.postMessage(JSON.stringify({
          event: "command",
          func: func,
          args: []
        }), "*");
      }
    } catch (e) {}
  }

  function toggleMusic() {
    if (musicEnabled) {
      pauseMusic();
    } else {
      playMusic();
    }
  }

  function updateAudioUI() {
    if (!quickMusicIcon || !quickMusicBtn || !drawerToggleAudioBtn) return;
    if (musicEnabled) {
      quickMusicIcon.textContent = "🔊";
      quickMusicBtn.classList.add("music-active");
      drawerToggleAudioBtn.textContent = "Turn Music Off";
      drawerToggleAudioBtn.classList.remove("btn-outline");
      drawerToggleAudioBtn.classList.add("btn-danger");
    } else {
      quickMusicIcon.textContent = "🔇";
      quickMusicBtn.classList.remove("music-active");
      drawerToggleAudioBtn.textContent = "Turn Music On";
      drawerToggleAudioBtn.classList.remove("btn-danger");
      drawerToggleAudioBtn.classList.add("btn-outline");
    }
  }

  // Render Slide, Window Scaling & Volume Normalization
  function renderSlide(index) {
    if (index < 0) index = 0;
    if (index >= activePlaylist.length) index = 0;
    currentIndex = index;

    const item = activePlaylist[currentIndex];
    if (!item) return;

    mediaSlot.innerHTML = "";

    if (item.isFinale) {
      const wrap = document.createElement("div");
      wrap.className = "finale-container";

      const img = document.createElement("img");
      img.src = item.src;
      img.alt = "Well Done Faithful Servant";

      const quote = document.createElement("p");
      quote.className = "finale-quote";
      quote.textContent = item.caption;

      wrap.appendChild(img);
      wrap.appendChild(quote);
      mediaSlot.appendChild(wrap);
      if (captionText) captionText.textContent = "";
    } else if (item.type === "video") {
      // Duck background music for video
      if (musicEnabled) {
        sendYouTubeCommand("pauseVideo");
      }

      const video = document.createElement("video");
      video.src = item.src;
      video.autoplay = true;
      video.controls = true;
      video.playsInline = true;

      // Match sound level with streaming music
      video.volume = VIDEO_TARGET_VOLUME;

      video.onended = () => {
        // Restore music after video completes
        if (musicEnabled && activeMusicSource === "country") {
          sendYouTubeCommand("playVideo");
        }
        nextSlide();
      };

      mediaSlot.appendChild(video);
      if (captionText) captionText.textContent = item.caption || "";
    } else {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.caption || "Memorial Moment";
      img.onerror = () => {
        if (img.src.endsWith(".JPG")) img.src = img.src.replace(".JPG", ".jpg");
      };
      mediaSlot.appendChild(img);
      if (captionText) captionText.textContent = item.caption || "";
    }

    if (counter) counter.textContent = `${currentIndex + 1} / ${activePlaylist.length}`;
    if (progressBar) {
      const pct = ((currentIndex + 1) / activePlaylist.length) * 100;
      progressBar.style.width = `${pct}%`;
    }
  }

  // Slideshow Timer (Uses Synced Curator Timing for All Modes)
  function startTimer() {
    clearTimeout(slideTimer);
    if (!isPlaying) return;

    const currentItem = activePlaylist[currentIndex];
    if (currentItem && currentItem.type === "video") return;

    slideTimer = setTimeout(() => {
      nextSlide();
    }, currentDuration);
  }

  function nextSlide() {
    let nextIdx = currentIndex + 1;
    if (nextIdx >= activePlaylist.length) nextIdx = 0;
    renderSlide(nextIdx);
    startTimer();
  }

  function prevSlide() {
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = activePlaylist.length - 1;
    renderSlide(prevIdx);
    startTimer();
  }

  function togglePlayPause() {
    isPlaying = !isPlaying;
    if (playPauseBtn) playPauseBtn.textContent = isPlaying ? "❚❚" : "▶";
    if (isPlaying) startTimer();
    else clearTimeout(slideTimer);
  }

  // Presentation Mode Routing
  function requestModeChange(mode) {
    if (mode === "archive") {
      applyModeChange("archive");
      return;
    }

    clearTimeout(slideTimer); // Halt playback while prompt is open
    pendingMode = mode;
    let title = "7-Minute Service Presentation";
    if (mode === "prelude") title = "Walk-In (Prelude Slideshow)";
    if (mode === "postlude") title = "Walk-Out (Postlude Slideshow)";

    if (promptSlideshowTitle) promptSlideshowTitle.textContent = title;
    if (musicPromptModal) musicPromptModal.classList.remove("hidden");
  }

  function applyModeChange(mode) {
    clearTimeout(slideTimer);
    currentMode = mode;

    [modePreludeBtn, modeServiceBtn, modePostludeBtn, modeArchiveBtn].forEach(b => b && b.classList.remove("active"));

    // Every mode uses the duration configured in curator admin
    currentDuration = getCuratorPacingDurationMs();
    syncSpeedSelector(currentDuration);

    if (mode === "service") {
      if (modeServiceBtn) modeServiceBtn.classList.add("active");
      if (presentationView) presentationView.classList.remove("hidden");
      if (archiveView) archiveView.classList.add("hidden");
      build7MinServicePlaylist();
    } else if (mode === "prelude") {
      if (modePreludeBtn) modePreludeBtn.classList.add("active");
      if (presentationView) presentationView.classList.remove("hidden");
      if (archiveView) archiveView.classList.add("hidden");
      buildPreludePlaylist();
    } else if (mode === "postlude") {
      if (modePostludeBtn) modePostludeBtn.classList.add("active");
      if (presentationView) presentationView.classList.remove("hidden");
      if (archiveView) archiveView.classList.add("hidden");
      buildPostludePlaylist();
    } else if (mode === "archive") {
      if (modeArchiveBtn) modeArchiveBtn.classList.add("active");
      if (presentationView) presentationView.classList.add("hidden");
      if (archiveView) archiveView.classList.remove("hidden");
      isPlaying = false;
      if (playPauseBtn) playPauseBtn.textContent = "▶";
      return;
    }

    isPlaying = true;
    if (playPauseBtn) playPauseBtn.textContent = "❚❚";
    renderSlide(0);
    startTimer();
  }

  // Fullscreen Handler
  function toggleFullscreen() {
    const targetElement = stage || document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (targetElement.requestFullscreen) {
        targetElement.requestFullscreen();
      } else if (targetElement.webkitRequestFullscreen) {
        targetElement.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  // Thumbnail Grid
  function buildArchiveGrid(filteredList = null) {
    if (!archiveGrid) return;
    const list = filteredList || allMedia;
    archiveGrid.innerHTML = "";

    list.forEach((item) => {
      const card = document.createElement("div");
      card.className = "archive-card";

      const thumb = document.createElement("div");
      thumb.className = "archive-card-thumb";

      if (item.type === "video") {
        const badge = document.createElement("span");
        badge.className = "video-badge";
        badge.textContent = "▶ Video";
        thumb.appendChild(badge);

        const videoPlaceholder = document.createElement("div");
        videoPlaceholder.style.color = "#8e9bb0";
        videoPlaceholder.textContent = "🎬 Video Clip";
        thumb.appendChild(videoPlaceholder);
      } else {
        const img = document.createElement("img");
        img.src = item.src;
        img.loading = "lazy";
        img.onerror = () => { img.style.opacity = "0.3"; };
        thumb.appendChild(img);
      }

      const info = document.createElement("div");
      info.className = "archive-card-info";
      const cap = document.createElement("p");
      cap.textContent = item.caption || item.src.split("/").pop();
      info.appendChild(cap);

      card.appendChild(thumb);
      card.appendChild(info);

      card.addEventListener("click", () => {
        activePlaylist = [item];
        currentIndex = 0;
        if (presentationView) presentationView.classList.remove("hidden");
        if (archiveView) archiveView.classList.add("hidden");
        renderSlide(0);
      });

      archiveGrid.appendChild(card);
    });
  }

  // Event Listeners
  function bindEvents() {
    if (prevBtn) prevBtn.addEventListener("click", prevSlide);
    if (nextBtn) nextBtn.addEventListener("click", nextSlide);
    if (playPauseBtn) playPauseBtn.addEventListener("click", togglePlayPause);

    if (speedSelect) {
      speedSelect.addEventListener("change", (e) => {
        currentDuration = parseInt(e.target.value, 10);
        if (isPlaying) startTimer();
      });
    }

    if (progressTrack) {
      progressTrack.addEventListener("click", (e) => {
        const rect = progressTrack.getBoundingClientRect();
        const clickPos = (e.clientX - rect.left) / rect.width;
        const targetIndex = Math.floor(clickPos * activePlaylist.length);
        renderSlide(targetIndex);
        startTimer();
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener("click", toggleFullscreen);
    }

    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      }
      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    });

    if (modePreludeBtn) modePreludeBtn.addEventListener("click", () => requestModeChange("prelude"));
    if (modeServiceBtn) modeServiceBtn.addEventListener("click", () => requestModeChange("service"));
    if (modePostludeBtn) modePostludeBtn.addEventListener("click", () => requestModeChange("postlude"));
    if (modeArchiveBtn) modeArchiveBtn.addEventListener("click", () => requestModeChange("archive"));

    if (chooseCountryBtn) {
      chooseCountryBtn.addEventListener("click", () => {
        setMusicSource("country");
        if (musicPromptModal) musicPromptModal.classList.add("hidden");
        applyModeChange(pendingMode);
        playMusic();
      });
    }

    if (chooseSpotifyBtn) {
      chooseSpotifyBtn.addEventListener("click", () => {
        setMusicSource("spotify");
        if (musicPromptModal) musicPromptModal.classList.add("hidden");
        applyModeChange(pendingMode);
        playMusic();
      });
    }

    if (chooseNoneBtn) {
      chooseNoneBtn.addEventListener("click", () => {
        if (musicPromptModal) musicPromptModal.classList.add("hidden");
        pauseMusic();
        applyModeChange(pendingMode);
      });
    }

    if (quickMusicBtn) quickMusicBtn.addEventListener("click", toggleMusic);
    if (drawerToggleAudioBtn) drawerToggleAudioBtn.addEventListener("click", toggleMusic);
    if (musicDrawerToggle && musicDrawer) {
      musicDrawerToggle.addEventListener("click", () => musicDrawer.classList.toggle("hidden"));
    }
    if (closeDrawerBtn && musicDrawer) {
      closeDrawerBtn.addEventListener("click", () => musicDrawer.classList.add("hidden"));
    }

    if (tabCountryBtn) tabCountryBtn.addEventListener("click", () => setMusicSource("country"));
    if (tabSpotifyBtn) tabSpotifyBtn.addEventListener("click", () => setMusicSource("spotify"));

    if (archiveSearch) {
      archiveSearch.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) {
          buildArchiveGrid(allMedia);
        } else {
          const filtered = allMedia.filter(m => (m.caption || m.src).toLowerCase().includes(q));
          buildArchiveGrid(filtered);
        }
      });
    }

    if (billismBtn && billismModal && billismText) {
      billismBtn.addEventListener("click", () => {
        const randomQuip = BILLISMS[Math.floor(Math.random() * BILLISMS.length)];
        billismText.textContent = randomQuip;
        billismModal.classList.remove("hidden");
      });
    }
    if (billismCloseBtn && billismModal) {
      billismCloseBtn.addEventListener("click", () => billismModal.classList.add("hidden"));
    }
    if (billismModal) {
      billismModal.addEventListener("click", (e) => {
        if (e.target === billismModal) billismModal.classList.add("hidden");
      });
    }
  }

  window.addEventListener("DOMContentLoaded", init);
})();