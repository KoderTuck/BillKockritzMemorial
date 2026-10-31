// Bill Kockritz Memorial Application Engine
// Direct background audio playback (YouTube 6YdIHC4np98 & Spotify), zero popup interruptions

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

  // Audio elements & Drawer controls
  const quickMusicBtn = document.getElementById("quick-music-btn");
  const quickMusicIcon = document.getElementById("quick-music-icon");
  const musicDrawerToggle = document.getElementById("music-drawer-toggle");
  const musicDrawer = document.getElementById("music-drawer");
  const closeDrawerBtn = document.getElementById("close-drawer-btn");
  const tabCountryBtn = document.getElementById("tab-country-btn");
  const tabSpotifyBtn = document.getElementById("tab-spotify-btn");
  const countrySection = document.getElementById("country-player-section");
  const spotifySection = document.getElementById("spotify-player-section");
  const playCountryBtn = document.getElementById("play-country-btn");
  const pauseCountryBtn = document.getElementById("pause-country-btn");
  const drawerToggleAudioBtn = document.getElementById("drawer-toggle-audio-btn");
  const guitarStatusDot = document.getElementById("guitar-status-dot");
  const guitarStatusText = document.getElementById("guitar-status-text");
  const countryIframe = document.getElementById("country-music-iframe");

  // Billism Modal
  const billismBtn = document.getElementById("billism-btn");
  const billismModal = document.getElementById("billism-modal");
  const billismText = document.getElementById("billism-text");
  const billismCloseBtn = document.getElementById("billism-close-btn");

  // Quotes celebrating Bill
  const BILLISMS = [
    "“My life’s goal is to get to the end and hear Jesus say, well done, good and faithful servant!”",
    "“Why catch a small fish when there’s a trophy waiting out in the deep water?”",
    "“You’re never too old to take the 4-wheeler through the biggest mud puddle on the trail.”",
    "“There is no problem that campfire coffee and a good dog can’t improve.”",
    "“Life is better when you’re wearing the big sombrero.”",
    "“Family first, faithful always, and never turn down second helpings.”",
    "“Go Seahawks!”"
  ];

  // State Management
  const allMedia = window.BILL_MEDIA || [];
  let currentPlaylist = [];
  let currentMode = "service"; // 'service' | 'prelude' | 'postlude' | 'archive'
  let currentIndex = 0;
  let isPlaying = true;
  let slideTimer = null;
  let currentDuration = parseInt(speedSelect ? speedSelect.value : 5500, 10);

  // Audio State
  let musicEnabled = false;
  let activeMusicSource = "country"; // 'country' | 'spotify'

  // Initialize
  function init() {
    if (archiveCount) archiveCount.textContent = allMedia.length;
    buildPlaylistForMode("service");
    renderSlide(0);
    startTimer();
    buildArchiveGrid();
    bindEvents();
    updateAudioUI();
  }

  // YouTube IFrame postMessage Controller
  function sendYouTubeCommand(func, args = []) {
    try {
      if (countryIframe && countryIframe.contentWindow) {
        countryIframe.contentWindow.postMessage(JSON.stringify({
          event: "command",
          func: func,
          args: args
        }), "*");
      }
    } catch (err) {
      console.warn("YouTube postMessage error:", err);
    }
  }

  // Audio Control Methods
  function setMusicSource(source) {
    activeMusicSource = source;
    if (source === "country") {
      tabCountryBtn?.classList.add("active");
      tabSpotifyBtn?.classList.remove("active");
      countrySection?.classList.remove("hidden");
      spotifySection?.classList.add("hidden");
      if (musicEnabled) {
        sendYouTubeCommand("playVideo");
      }
    } else if (source === "spotify") {
      tabSpotifyBtn?.classList.add("active");
      tabCountryBtn?.classList.remove("active");
      spotifySection?.classList.remove("hidden");
      countrySection?.classList.add("hidden");
      // Pause YouTube guitar track so they don't play simultaneously
      sendYouTubeCommand("pauseVideo");
    }
  }

  function playMusic() {
    musicEnabled = true;
    updateAudioUI();
    if (activeMusicSource === "country") {
      sendYouTubeCommand("playVideo");
    } else if (activeMusicSource === "spotify") {
      musicDrawer?.classList.remove("hidden");
    }
  }

  function pauseMusic() {
    musicEnabled = false;
    updateAudioUI();
    sendYouTubeCommand("pauseVideo");
  }

  function toggleMusic() {
    if (musicEnabled) {
      pauseMusic();
    } else {
      playMusic();
    }
  }

  function updateAudioUI() {
    if (quickMusicIcon) quickMusicIcon.textContent = musicEnabled ? "🔊" : "🔇";
    if (quickMusicBtn) {
      quickMusicBtn.classList.toggle("music-active", musicEnabled);
      quickMusicBtn.title = musicEnabled ? "Mute Background Music" : "Play Background Music";
    }
    if (drawerToggleAudioBtn) {
      drawerToggleAudioBtn.textContent = musicEnabled ? "Turn Music Off" : "Turn Music On";
      drawerToggleAudioBtn.className = musicEnabled ? "btn btn-sm btn-danger" : "btn btn-sm btn-outline";
    }
    if (guitarStatusDot) {
      guitarStatusDot.classList.toggle("active", musicEnabled && activeMusicSource === "country");
    }
    if (guitarStatusText) {
      guitarStatusText.textContent = (musicEnabled && activeMusicSource === "country")
        ? "Playing Guitar Instrumental"
        : "Guitar stream paused";
    }
  }

  // Mode & Playlist Builders
  function buildPlaylistForMode(mode) {
    currentMode = mode;
    const finale = allMedia.find(m => m.isFinale);
    const regular = allMedia.filter(m => !m.isFinale);

    if (mode === "service") {
      // Check for saved order from Admin, otherwise build curated presentation
      try {
        const savedOrder = JSON.parse(localStorage.getItem("bill_curated_service_order") || "null");
        if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
          currentPlaylist = savedOrder;
          return;
        }
      } catch (e) {
        console.warn("Could not read local storage order", e);
      }

      // Default curated service: ~65 evenly distributed moments + finale
      if (regular.length <= 65) {
        currentPlaylist = [...regular];
      } else {
        const step = regular.length / 64;
        currentPlaylist = [];
        for (let i = 0; i < 64; i++) {
          currentPlaylist.push(regular[Math.floor(i * step)]);
        }
      }
      if (finale) currentPlaylist.push(finale);

    } else if (mode === "prelude") {
      // Walk-In: Random pool of ~50 photos
      const shuffled = [...regular].sort(() => 0.5 - Math.random());
      currentPlaylist = shuffled.slice(0, Math.min(50, shuffled.length));

    } else if (mode === "postlude") {
      // Walk-Out: Fresh random pool of ~50 photos
      const shuffled = [...regular].sort(() => 0.5 - Math.random());
      currentPlaylist = shuffled.slice(0, Math.min(50, shuffled.length));
    }
  }

  // Slide Presentation Renderer
  function renderSlide(index) {
    if (!currentPlaylist || currentPlaylist.length === 0) return;
    if (index < 0) index = 0;
    if (index >= currentPlaylist.length) index = 0;
    currentIndex = index;

    const item = currentPlaylist[currentIndex];
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
      // Auto-ducking: Pause background guitar track during video playback
      if (musicEnabled && activeMusicSource === "country") {
        sendYouTubeCommand("pauseVideo");
      }

      const video = document.createElement("video");
      video.src = item.src;
      video.autoplay = true;
      video.controls = true;
      video.playsInline = true;
      video.volume = (item.volume !== undefined) ? item.volume : 0.6;

      video.onended = () => {
        // Resume background guitar track once video finishes
        if (musicEnabled && activeMusicSource === "country") {
          sendYouTubeCommand("playVideo");
        }
        nextSlide();
      };

      mediaSlot.appendChild(video);
      if (captionText) captionText.textContent = item.caption || "";

    } else {
      // Image slide: ensure guitar audio is playing if music is enabled
      if (musicEnabled && activeMusicSource === "country") {
        sendYouTubeCommand("playVideo");
      }

      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.caption || "Bill Kockritz Memory";
      mediaSlot.appendChild(img);
      if (captionText) captionText.textContent = item.caption || "";
    }

    // Update Counter & Progress Bar
    if (counter) counter.textContent = `${currentIndex + 1} / ${currentPlaylist.length}`;
    if (progressBar) {
      const pct = ((currentIndex + 1) / currentPlaylist.length) * 100;
      progressBar.style.width = `${pct}%`;
    }
  }

  // Timer & Navigation
  function startTimer() {
    clearTimeout(slideTimer);
    if (!isPlaying) return;

    const currentItem = currentPlaylist[currentIndex];
    if (currentItem && currentItem.type === "video") {
      // Video onended event handles advancement
      return;
    }

    slideTimer = setTimeout(() => {
      nextSlide();
    }, currentDuration);
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

  // Mode Switching (Direct, immediate change without any popup dialogs)
  function switchMode(mode) {
    if (mode === "archive") {
      presentationView?.classList.add("hidden");
      archiveView?.classList.remove("hidden");
      modePreludeBtn?.classList.remove("active");
      modeServiceBtn?.classList.remove("active");
      modePostludeBtn?.classList.remove("active");
      modeArchiveBtn?.classList.add("active");
      clearTimeout(slideTimer);
      isPlaying = false;
      if (playPauseBtn) playPauseBtn.textContent = "▶";
    } else {
      presentationView?.classList.remove("hidden");
      archiveView?.classList.add("hidden");

      modePreludeBtn?.classList.toggle("active", mode === "prelude");
      modeServiceBtn?.classList.toggle("active", mode === "service");
      modePostludeBtn?.classList.toggle("active", mode === "postlude");
      modeArchiveBtn?.classList.remove("active");

      buildPlaylistForMode(mode);
      isPlaying = true;
      if (playPauseBtn) playPauseBtn.textContent = "❚❚";
      renderSlide(0);
      startTimer();
    }
  }

  // Archive Grid Builder
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
        thumb.innerHTML = `<span class="video-badge">▶ Video</span><div style="color:#8e9bb0; font-size: 0.85rem;">🎬 Video Clip</div>`;
      } else {
        const img = document.createElement("img");
        img.src = item.src;
        img.loading = "lazy";
        thumb.appendChild(img);
      }

      const info = document.createElement("div");
      info.className = "archive-card-info";
      info.innerHTML = `<p>${item.caption || item.src.split("/").pop()}</p>`;

      card.appendChild(thumb);
      card.appendChild(info);

      card.addEventListener("click", () => {
        currentPlaylist = [item];
        currentIndex = 0;
        switchMode("service");
      });

      archiveGrid.appendChild(card);
    });
  }

  // Event Listeners
  function bindEvents() {
    prevBtn?.addEventListener("click", prevSlide);
    nextBtn?.addEventListener("click", nextSlide);
    playPauseBtn?.addEventListener("click", togglePlayPause);

    speedSelect?.addEventListener("change", (e) => {
      currentDuration = parseInt(e.target.value, 10);
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
        stage?.requestFullscreen().catch(err => alert(err.message));
      } else {
        document.exitFullscreen();
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

    // Mode Buttons
    modePreludeBtn?.addEventListener("click", () => switchMode("prelude"));
    modeServiceBtn?.addEventListener("click", () => switchMode("service"));
    modePostludeBtn?.addEventListener("click", () => switchMode("postlude"));
    modeArchiveBtn?.addEventListener("click", () => switchMode("archive"));

    // Archive Search
    archiveSearch?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        buildArchiveGrid(allMedia);
      } else {
        const filtered = allMedia.filter(m => (m.caption || "").toLowerCase().includes(q));
        buildArchiveGrid(filtered);
      }
    });

    // Audio & Drawer Controls
    quickMusicBtn?.addEventListener("click", toggleMusic);
    drawerToggleAudioBtn?.addEventListener("click", toggleMusic);

    musicDrawerToggle?.addEventListener("click", () => {
      musicDrawer?.classList.toggle("hidden");
    });
    closeDrawerBtn?.addEventListener("click", () => {
      musicDrawer?.classList.add("hidden");
    });

    tabCountryBtn?.addEventListener("click", () => setMusicSource("country"));
    tabSpotifyBtn?.addEventListener("click", () => setMusicSource("spotify"));

    playCountryBtn?.addEventListener("click", () => {
      setMusicSource("country");
      playMusic();
    });
    pauseCountryBtn?.addEventListener("click", pauseMusic);

    // Billism Modal
    billismBtn?.addEventListener("click", () => {
      const randomQuip = BILLISMS[Math.floor(Math.random() * BILLISMS.length)];
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
