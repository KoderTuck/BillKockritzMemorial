// Bill Kockritz Memorial Application Engine (Smart Shuffler, Dual Music & Non-Repeating Pools)

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

  // Billism
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
  let currentDuration = parseInt(speedSelect.value, 10);
  let currentMode = "service";

  // Audio State
  let musicEnabled = false;
  let activeMusicSource = "country"; // 'country' | 'spotify' | 'none'
  let pendingMode = null;
  const shownInPrelude = new Set();

  function init() {
    if (archiveCount) archiveCount.textContent = allMedia.length;

    if (window.location.hash === "#admin") {
      window.location.href = "admin.html";
      return;
    }

    // Default load to 7-min service presentation
    applyModeChange("service");
    buildArchiveGrid();
    bindEvents();
    updateAudioUI();
  }

  // Shuffle Engine
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

  // 2. Build Walk-In (Prelude): Non-service photos, randomized
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

  // Audio Management
  function setMusicSource(source) {
    activeMusicSource = source;
    if (source === "country") {
      tabCountryBtn.classList.add("active");
      tabSpotifyBtn.classList.remove("active");
      countrySection.classList.remove("hidden");
      spotifySection.classList.add("hidden");
    } else if (source === "spotify") {
      tabSpotifyBtn.classList.add("active");
      tabCountryBtn.classList.remove("active");
      spotifySection.classList.remove("hidden");
      countrySection.classList.add("hidden");
    }
  }

  function playMusic() {
    musicEnabled = true;
    updateAudioUI();

    if (activeMusicSource === "country") {
      setMusicSource("country");
      // Append autoplay if needed
      if (!countryIframe.src.includes("autoplay=1")) {
        const separator = countryIframe.src.includes("?") ? "&" : "?";
        countryIframe.src = countryIframe.src + separator + "autoplay=1";
      }
    } else if (activeMusicSource === "spotify") {
      setMusicSource("spotify");
      // Open drawer so the user can hit Spotify's play button (browser iframe security)
      musicDrawer.classList.remove("hidden");
    }
  }

  function pauseMusic() {
    musicEnabled = false;
    updateAudioUI();

    // Mute/pause YouTube iframe by posting message
    try {
      countryIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
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

  // Render Slide & Audio Ducking for Videos
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
      captionText.textContent = "";
    } else if (item.type === "video") {
      // Auto-duck / pause background music during video
      if (musicEnabled) {
        try {
          countryIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        } catch (e) {}
      }

      const video = document.createElement("video");
      video.src = item.src;
      video.autoplay = true;
      video.controls = true;
      video.playsInline = true;

      // Resume presentation and restore music when video completes
      video.onended = () => {
        if (musicEnabled && activeMusicSource === "country") {
          try {
            countryIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          } catch (e) {}
        }
        nextSlide();
      };

      mediaSlot.appendChild(video);
      captionText.textContent = item.caption || "";
    } else {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.caption || "Memorial Moment";
      img.onerror = () => {
        if (img.src.endsWith(".JPG")) img.src = img.src.replace(".JPG", ".jpg");
      };
      mediaSlot.appendChild(img);
      captionText.textContent = item.caption || "";
    }

    counter.textContent = `${currentIndex + 1} / ${activePlaylist.length}`;
    const pct = ((currentIndex + 1) / activePlaylist.length) * 100;
    progressBar.style.width = `${pct}%`;
  }

  // Slideshow Timer
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
    playPauseBtn.textContent = isPlaying ? "❚❚" : "▶";
    if (isPlaying) startTimer();
    else clearTimeout(slideTimer);
  }

  // Request Mode Change with Prompt Modal
  function requestModeChange(mode) {
    if (mode === "archive") {
      applyModeChange("archive");
      return;
    }

    pendingMode = mode;
    let title = "7-Minute Service Presentation";
    if (mode === "prelude") title = "Walk-In (Prelude Slideshow)";
    if (mode === "postlude") title = "Walk-Out (Postlude Slideshow)";

    promptSlideshowTitle.textContent = title;
    musicPromptModal.classList.remove("hidden");
  }

  // Apply Mode
  function applyModeChange(mode) {
    clearTimeout(slideTimer);
    currentMode = mode;

    [modePreludeBtn, modeServiceBtn, modePostludeBtn, modeArchiveBtn].forEach(b => b && b.classList.remove("active"));

    if (mode === "service") {
      modeServiceBtn.classList.add("active");
      presentationView.classList.remove("hidden");
      archiveView.classList.add("hidden");
      build7MinServicePlaylist();
      speedSelect.value = "5500";
    } else if (mode === "prelude") {
      modePreludeBtn.classList.add("active");
      presentationView.classList.remove("hidden");
      archiveView.classList.add("hidden");
      buildPreludePlaylist();
      speedSelect.value = "6000";
    } else if (mode === "postlude") {
      modePostludeBtn.classList.add("active");
      presentationView.classList.remove("hidden");
      archiveView.classList.add("hidden");
      buildPostludePlaylist();
      speedSelect.value = "6000";
    } else if (mode === "archive") {
      modeArchiveBtn.classList.add("active");
      presentationView.classList.add("hidden");
      archiveView.classList.remove("hidden");
      isPlaying = false;
      playPauseBtn.textContent = "▶";
      return;
    }

    currentDuration = parseInt(speedSelect.value, 10);
    isPlaying = true;
    playPauseBtn.textContent = "❚❚";
    renderSlide(0);
    startTimer();
  }

  // Thumbnail Grid
  function buildArchiveGrid(filteredList = null) {
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
        presentationView.classList.remove("hidden");
        archiveView.classList.add("hidden");
        renderSlide(0);
      });

      archiveGrid.appendChild(card);
    });
  }

  // Events
  function bindEvents() {
    prevBtn.addEventListener("click", prevSlide);
    nextBtn.addEventListener("click", nextSlide);
    playPauseBtn.addEventListener("click", togglePlayPause);

    speedSelect.addEventListener("change", (e) => {
      currentDuration = parseInt(e.target.value, 10);
      if (isPlaying) startTimer();
    });

    progressTrack.addEventListener("click", (e) => {
      const rect = progressTrack.getBoundingClientRect();
      const clickPos = (e.clientX - rect.left) / rect.width;
      const targetIndex = Math.floor(clickPos * activePlaylist.length);
      renderSlide(targetIndex);
      startTimer();
    });

    fullscreenBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) stage.requestFullscreen().catch(() => {});
      else document.exitFullscreen();
    });

    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
      }
    });

    // Slideshow Mode Selectors with Music Prompt
    modePreludeBtn.addEventListener("click", () => requestModeChange("prelude"));
    modeServiceBtn.addEventListener("click", () => requestModeChange("service"));
    modePostludeBtn.addEventListener("click", () => requestModeChange("postlude"));
    modeArchiveBtn.addEventListener("click", () => requestModeChange("archive"));

    // Modal Music Choices
    chooseCountryBtn.addEventListener("click", () => {
      setMusicSource("country");
      musicPromptModal.classList.add("hidden");
      applyModeChange(pendingMode);
      playMusic();
    });

    chooseSpotifyBtn.addEventListener("click", () => {
      setMusicSource("spotify");
      musicPromptModal.classList.add("hidden");
      applyModeChange(pendingMode);
      playMusic();
    });

    chooseNoneBtn.addEventListener("click", () => {
      musicPromptModal.classList.add("hidden");
      pauseMusic();
      applyModeChange(pendingMode);
    });

    // Music Drawer & Controls
    quickMusicBtn.addEventListener("click", toggleMusic);
    drawerToggleAudioBtn.addEventListener("click", toggleMusic);
    musicDrawerToggle.addEventListener("click", () => musicDrawer.classList.toggle("hidden"));
    closeDrawerBtn.addEventListener("click", () => musicDrawer.classList.add("hidden"));

    tabCountryBtn.addEventListener("click", () => setMusicSource("country"));
    tabSpotifyBtn.addEventListener("click", () => setMusicSource("spotify"));

    // Archive Search
    archiveSearch.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        buildArchiveGrid(allMedia);
      } else {
        const filtered = allMedia.filter(m => (m.caption || m.src).toLowerCase().includes(q));
        buildArchiveGrid(filtered);
      }
    });

    // Billism
    billismBtn.addEventListener("click", () => {
      const randomQuip = BILLISMS[Math.floor(Math.random() * BILLISMS.length)];
      billismText.textContent = randomQuip;
      billismModal.classList.remove("hidden");
    });
    billismCloseBtn.addEventListener("click", () => billismModal.classList.add("hidden"));
    billismModal.addEventListener("click", (e) => {
      if (e.target === billismModal) billismModal.classList.add("hidden");
    });
  }

  window.addEventListener("DOMContentLoaded", init);
})();