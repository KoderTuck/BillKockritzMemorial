// Bill Kockritz Memorial Application Engine

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
  const modePresentationBtn = document.getElementById("mode-presentation-btn");
  const modeArchiveBtn = document.getElementById("mode-archive-btn");
  const archiveCount = document.getElementById("archive-count");
  const archiveGrid = document.getElementById("archive-grid");
  const archiveSearch = document.getElementById("archive-search");

  const musicDrawerToggle = document.getElementById("music-drawer-toggle");
  const musicDrawer = document.getElementById("music-drawer");
  const closeDrawerBtn = document.getElementById("close-drawer-btn");

  const billismBtn = document.getElementById("billism-btn");
  const billismModal = document.getElementById("billism-modal");
  const billismText = document.getElementById("billism-text");
  const billismCloseBtn = document.getElementById("billism-close-btn");

  // Humorous and heartfelt quips celebrating Bill
  const BILLISMS = [
    "“My life’s goal is to get to the end and hear Jesus say, well done, good and faithful servant!”",
    "“Why catch a small fish when there’s a trophy waiting out in the deep water?”",
    "“You’re never too old to take the 4-wheeler through the biggest mud puddle on the trail.”",
    "“There is no problem that campfire coffee and a good dog can’t improve.”",
    "“Life is better when you’re wearing the big sombrero.”",
    "“Family first, faithful always, and never turn down second helpings.”",
    "“Go Seahawks!”"
  ];

  // State
  const allMedia = window.BILL_MEDIA || [];
  let servicePlaylist = [];
  let currentIndex = 0;
  let isPlaying = true;
  let slideTimer = null;
  let currentDuration = parseInt(speedSelect.value, 10);

  // Initialize
  function init() {
    archiveCount.textContent = allMedia.length;
    buildServicePlaylist();
    renderSlide(0);
    startTimer();
    buildArchiveGrid();
    bindEvents();
  }

  // Create curated ~160 slide service list (includes videos and locked finale)
  function buildServicePlaylist() {
    const finale = allMedia.find(m => m.isFinale);
    const regularItems = allMedia.filter(m => !m.isFinale);

    // Target ~155 regular photos/videos + finale
    if (regularItems.length <= 160) {
      servicePlaylist = [...regularItems];
    } else {
      const step = regularItems.length / 155;
      servicePlaylist = [];
      for (let i = 0; i < 155; i++) {
        servicePlaylist.push(regularItems[Math.floor(i * step)]);
      }
    }

    if (finale) {
      servicePlaylist.push(finale);
    }
  }

  // Render Slide
  function renderSlide(index) {
    if (index < 0) index = 0;
    if (index >= servicePlaylist.length) index = 0;
    currentIndex = index;

    const item = servicePlaylist[currentIndex];
    mediaSlot.innerHTML = "";

    if (item.isFinale) {
      // Special Finale Presentation with Glow & Verse
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
      // HTML5 Video Slide
      const video = document.createElement("video");
      video.src = item.src;
      video.autoplay = true;
      video.controls = true;
      video.playsInline = true;

      // Smart Ducking: Resume timer and next slide when video ends
      video.onended = () => {
        nextSlide();
      };

      mediaSlot.appendChild(video);
      captionText.textContent = item.caption || "";
    } else {
      // Standard Photo Slide
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.caption || "Memorial Photo";
      mediaSlot.appendChild(img);
      captionText.textContent = item.caption || "";
    }

    // Update Counter & Progress Bar
    counter.textContent = `${currentIndex + 1} / ${servicePlaylist.length}`;
    const pct = ((currentIndex + 1) / servicePlaylist.length) * 100;
    progressBar.style.width = `${pct}%`;
  }

  // Timer & Navigation
  function startTimer() {
    clearTimeout(slideTimer);
    if (!isPlaying) return;

    const currentItem = servicePlaylist[currentIndex];
    if (currentItem && currentItem.type === "video") {
      // Let the video end handler advance the slide
      return;
    }

    slideTimer = setTimeout(() => {
      nextSlide();
    }, currentDuration);
  }

  function nextSlide() {
    let nextIdx = currentIndex + 1;
    if (nextIdx >= servicePlaylist.length) {
      nextIdx = 0; // Loop or hold at finale
    }
    renderSlide(nextIdx);
    startTimer();
  }

  function prevSlide() {
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = servicePlaylist.length - 1;
    renderSlide(prevIdx);
    startTimer();
  }

  function togglePlayPause() {
    isPlaying = !isPlaying;
    playPauseBtn.textContent = isPlaying ? "❚❚" : "▶";
    if (isPlaying) {
      startTimer();
    } else {
      clearTimeout(slideTimer);
    }
  }

  // Archive Thumbnail Grid
  function buildArchiveGrid(filteredList = null) {
    const list = filteredList || allMedia;
    archiveGrid.innerHTML = "";

    list.forEach((item, originalIndex) => {
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
        videoPlaceholder.style.color = "#777";
        videoPlaceholder.textContent = "🎬 Clip";
        thumb.appendChild(videoPlaceholder);
      } else {
        const img = document.createElement("img");
        img.src = item.src;
        img.loading = "lazy";
        thumb.appendChild(img);
      }

      const info = document.createElement("div");
      info.className = "archive-card-info";
      const cap = document.createElement("p");
      cap.textContent = item.caption || "Memorial Moment";
      info.appendChild(cap);

      card.appendChild(thumb);
      card.appendChild(info);

      // Clicking any card loads it directly into the theater stage
      card.addEventListener("click", () => {
        servicePlaylist = [item];
        currentIndex = 0;
        switchMode("presentation");
        renderSlide(0);
      });

      archiveGrid.appendChild(card);
    });
  }

  // Switch Between 20-Min Service Mode and Archive Mode
  function switchMode(mode) {
    if (mode === "presentation") {
      presentationView.classList.remove("hidden");
      archiveView.classList.add("hidden");
      modePresentationBtn.classList.add("active");
      modeArchiveBtn.classList.remove("active");
      if (servicePlaylist.length <= 1) buildServicePlaylist();
      renderSlide(currentIndex);
      startTimer();
    } else {
      presentationView.classList.add("hidden");
      archiveView.classList.remove("hidden");
      modePresentationBtn.classList.remove("active");
      modeArchiveBtn.classList.add("active");
      clearTimeout(slideTimer);
      isPlaying = false;
      playPauseBtn.textContent = "▶";
    }
  }

  // Event Handlers
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
      const targetIndex = Math.floor(clickPos * servicePlaylist.length);
      renderSlide(targetIndex);
      startTimer();
    });

    fullscreenBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        stage.requestFullscreen().catch(err => alert(err.message));
      } else {
        document.exitFullscreen();
      }
    });

    // Keyboard Shortcuts (Arrow Keys & Space)
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
      }
    });

    // Mode Buttons
    modePresentationBtn.addEventListener("click", () => switchMode("presentation"));
    modeArchiveBtn.addEventListener("click", () => switchMode("archive"));

    // Archive Search
    archiveSearch.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        buildArchiveGrid(allMedia);
      } else {
        const filtered = allMedia.filter(m => (m.caption || "").toLowerCase().includes(q));
        buildArchiveGrid(filtered);
      }
    });

    // Music Drawer Toggle
    musicDrawerToggle.addEventListener("click", () => {
      musicDrawer.classList.toggle("hidden");
    });
    closeDrawerBtn.addEventListener("click", () => {
      musicDrawer.classList.add("hidden");
    });

    // Billism Modal
    billismBtn.addEventListener("click", () => {
      const randomQuip = BILLISMS[Math.floor(Math.random() * BILLISMS.length)];
      billismText.textContent = randomQuip;
      billismModal.classList.remove("hidden");
    });
    billismCloseBtn.addEventListener("click", () => {
      billismModal.classList.add("hidden");
    });
    billismModal.addEventListener("click", (e) => {
      if (e.target === billismModal) billismModal.classList.add("hidden");
    });
  }

  // Run on page load
  window.addEventListener("DOMContentLoaded", init);
})();