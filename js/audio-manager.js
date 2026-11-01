// Bill Kockritz Memorial music selection and playback controls

(function() {
  let isPresentationPlaying = false;
  let isMuted = false;
  let isDucked = false;
  let selectedOptionId = "";
  let selectedOption = null;
  let localAudio = null;
  let siteTracks = [];
  let siteTrackIndex = 0;
  let localBaseVolume = 1;
  let spotifyController = null;
  let spotifyReady;
  let fadeTimer = null;
  let fadeLevel = 1;

  function getOptions() {
    return window.MusicOptions?.getOptions() ?? [];
  }

  function getOption(id) {
    return getOptions().find(option => option.id === id);
  }

  function getYoutubeId(value) {
    if (/^[\w-]{11}$/.test(value)) return value;
    try {
      const url = new URL(value);
      if (url.hostname === "youtu.be") return url.pathname.slice(1);
      if (url.hostname.endsWith("youtube.com")) {
        if (url.pathname === "/watch") return url.searchParams.get("v");
        const match = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/);
        return match?.[1] ?? null;
      }
    } catch (error) {
      console.warn("Could not parse YouTube music link.", error);
    }
    return null;
  }

  function getSpotifyUri(value) {
    try {
      const url = new URL(value);
      if (url.hostname !== "open.spotify.com") return null;
      const [, type, id] = url.pathname.match(/^\/(?:embed\/)?(playlist|album|track|episode|show)\/([^/]+)/) ?? [];
      return type && id ? `spotify:${type}:${id}` : null;
    } catch (error) {
      console.warn("Could not parse Spotify music link.", error);
      return null;
    }
  }

  function setStatus(message) {
    const status = document.getElementById("music-player-status");
    if (status) status.textContent = message;
  }

  function updateUI() {
    const quickBtn = document.getElementById("quick-music-btn");
    const quickIcon = document.getElementById("quick-music-icon");
    const drawerToggleBtn = document.getElementById("drawer-toggle-audio-btn");
    const playBtn = document.getElementById("music-player-toggle");
    const statusDot = document.getElementById("guitar-status-dot");
    const statusText = document.getElementById("guitar-status-text");

    quickBtn?.classList.toggle("music-active", !isMuted);
    if (quickIcon) quickIcon.textContent = isMuted ? "🔇" : "🔊";
    quickBtn?.setAttribute("aria-label", isMuted ? "Unmute music" : "Mute music");
    quickBtn?.setAttribute("title", isMuted ? "Unmute Background Music" : "Mute Background Music");
    quickBtn?.setAttribute("aria-pressed", String(isMuted));
    if (drawerToggleBtn) {
      drawerToggleBtn.textContent = isMuted ? "Unmute Music" : "Mute Music";
      drawerToggleBtn.classList.toggle("btn-primary", !isMuted);
      drawerToggleBtn.classList.toggle("btn-outline", isMuted);
      drawerToggleBtn.setAttribute("aria-pressed", String(isMuted));
    }
    if (playBtn) {
      playBtn.textContent = isMuted ? "🔊 Unmute Music" : "🔇 Mute Music";
      playBtn.setAttribute("aria-pressed", String(isMuted));
    }
    statusDot?.classList.toggle("playing", isPresentationPlaying && !isMuted && !isDucked && Boolean(selectedOption));
    if (statusText) {
      statusText.textContent = isMuted ? "Music is muted" :
        isDucked ? "Music is paused for video" :
          fadeTimer !== null ? "Music fading out" :
          isPresentationPlaying ? "Music follows presentation playback" : "Music is paused with the presentation";
    }
  }

  function syncPlayback() {
    const shouldPlay = isPresentationPlaying && !isDucked;
    const volume = isMuted ? 0 : fadeLevel;
    if (selectedOption?.type === "youtube") {
      postToYoutube("setVolume", [Math.round(volume * 100)]);
      postToYoutube(isMuted ? "mute" : "unMute");
      postToYoutube(shouldPlay ? "playVideo" : "pauseVideo");
    } else if (selectedOption?.type === "spotify") {
      if (typeof spotifyController?.setVolume === "function") {
        spotifyController.setVolume(volume);
      }
      if (shouldPlay) spotifyController?.play();
      else spotifyController?.pause();
    } else if (selectedOption?.type === "local" && localAudio) {
      localAudio.muted = isMuted;
      localAudio.volume = localBaseVolume * volume;
      if (shouldPlay && localAudio.paused) {
        localAudio.play().catch(error => {
          if (isPresentationPlaying && !isDucked) {
            setStatus(`Could not play Site file ${siteTracks[siteTrackIndex]}: ${error.message}`);
          }
        });
      } else if (!shouldPlay && !localAudio.paused) {
        localAudio.pause();
      }
    }
    updateUI();
  }

  function renderOptionList() {
    const list = document.getElementById("music-option-list");
    if (!list) return;

    list.replaceChildren();
    const options = getOptions();
    const serviceOptionId = window.MusicOptions?.getServiceOptionId();

    options.forEach(option => {
      const label = document.createElement("label");
      label.className = "music-option";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "music-option";
      radio.value = option.id;
      radio.checked = option.id === selectedOptionId;
      radio.addEventListener("change", () => selectOption(option.id));

      const details = document.createElement("span");
      const sourceName = option.type === "local" ? "Site files" : option.type === "youtube" ? "YouTube" : "Spotify";
      const trackCount = option.type === "local" ? `, ${option.tracks?.length ?? 1} tracks` : "";
      details.textContent = `${option.name} (${sourceName}${trackCount})`;
      label.append(radio, details);

      if (option.id === serviceOptionId) {
        const badge = document.createElement("span");
        badge.className = "music-service-badge";
        badge.textContent = "7-Min Service";
        label.appendChild(badge);
      }
      list.appendChild(label);
    });
  }

  function loadSpotifyApi() {
    if (spotifyReady) return spotifyReady;

    spotifyReady = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-spotify-iframe-api]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.SpotifyIframeApi), { once: true });
        existing.addEventListener("error", () => reject(new Error("Spotify player API failed to load.")), { once: true });
        return;
      }

      let apiReady = false;
      const timeout = window.setTimeout(() => {
        if (!apiReady) reject(new Error("Spotify player API did not initialize."));
      }, 5000);
      const priorCallback = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = api => {
        apiReady = true;
        window.clearTimeout(timeout);
        priorCallback?.(api);
        resolve(api);
      };

      const script = document.createElement("script");
      script.dataset.spotifyIframeApi = "true";
      script.src = "https://open.spotify.com/embed/iframe-api/v1";
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Spotify player API failed to load."));
      };
      document.head.appendChild(script);
    });
    return spotifyReady;
  }

  async function createSpotifyPlayer(option) {
    const container = document.getElementById("music-player-container");
    const uri = getSpotifyUri(option.url);
    if (!uri) throw new Error("Enter a Spotify playlist, album, track, episode, or show link.");

    const embed = document.createElement("div");
    embed.id = "spotify-player";
    container.replaceChildren(embed);
    try {
      const api = await loadSpotifyApi();
      if (!api?.createController) throw new Error("Spotify's embedded player API is unavailable.");

      await new Promise((resolve, reject) => {
        let initialized = false;
        const timeout = window.setTimeout(() => {
          if (!initialized) reject(new Error("Spotify player did not initialize."));
        }, 10000);
        api.createController(embed, { uri, width: "100%", height: 152 }, controller => {
          initialized = true;
          window.clearTimeout(timeout);
          spotifyController = controller;
          syncPlayback();
          setStatus("Spotify player ready. Playback follows the presentation.");
          resolve();
        });
      });
    } catch (error) {
      console.warn("Spotify controls could not connect; using the embedded player controls.", error);
      spotifyController = null;
      const [type, id] = uri.split(":").slice(1);
      const iframe = document.createElement("iframe");
      iframe.title = option.name;
      iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.loading = "lazy";
      iframe.src = `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}?utm_source=generator`;
      container.replaceChildren(iframe);
      setStatus("Spotify controls could not connect. Use the embedded controls; playback cannot follow presentation play/pause in this fallback.");
    }
  }

  function renderPlayer(option) {
    const container = document.getElementById("music-player-container");
    if (!container) return;
    cancelFade();
    spotifyController?.destroy();
    spotifyController = null;
    localAudio = null;
    siteTracks = [];
    siteTrackIndex = 0;
    localBaseVolume = 1;
    container.replaceChildren();
    selectedOption = option ?? null;

    if (!option) {
      setStatus("Add music options in Curator Admin to play background music.");
      syncPlayback();
      return;
    }

    const status = document.getElementById("music-player-status");
    if (option.type === "youtube") {
      const videoId = getYoutubeId(option.url);
      if (!videoId) {
        setStatus("This is not a valid YouTube video link.");
        return;
      }
      const iframe = document.createElement("iframe");
      iframe.title = option.name;
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1&playsinline=1`;
      iframe.addEventListener("load", syncPlayback, { once: true });
      container.appendChild(iframe);
      setStatus("Music follows presentation playback.");
    } else if (option.type === "spotify") {
      createSpotifyPlayer(option).catch(error => {
        console.error("Could not initialize Spotify player.", error);
        setStatus("Could not load the Spotify player. Check the link and internet connection.");
      });
      setStatus("Loading Spotify player…");
    } else if (option.type === "local") {
      siteTracks = option.tracks ?? (option.url ? [option.url] : []);
      if (siteTracks.length < 1 || siteTracks.length > 5 ||
          siteTracks.some(path => !window.MusicOptions?.isValidSiteFilePath(path))) {
        setStatus("Site files must be valid media paths inside the music/ folder.");
        return;
      }
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.src = siteTracks[0];
      audio.muted = isMuted;
      const controls = document.createElement("div");
      controls.className = "site-audio-controls";
      const seek = document.createElement("input");
      seek.type = "range";
      seek.min = "0";
      seek.max = "0";
      seek.step = "0.1";
      seek.value = "0";
      seek.disabled = true;
      seek.setAttribute("aria-label", "Seek within current music track");
      const time = document.createElement("span");
      time.textContent = "0:00 / 0:00";
      const volumeLabel = document.createElement("label");
      volumeLabel.textContent = "Volume";
      const volume = document.createElement("input");
      volume.type = "range";
      volume.min = "0";
      volume.max = "1";
      volume.step = "0.05";
      volume.value = String(audio.volume);
      volume.setAttribute("aria-label", "Music volume");
      volumeLabel.appendChild(volume);
      controls.append(seek, time, volumeLabel);
      const formatTime = seconds => {
        if (!Number.isFinite(seconds)) return "0:00";
        const wholeSeconds = Math.floor(seconds);
        return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
      };
      const updateTime = () => {
        seek.value = String(audio.currentTime);
        time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
      };
      audio.addEventListener("loadedmetadata", () => {
        seek.max = String(audio.duration);
        seek.disabled = !Number.isFinite(audio.duration);
        updateTime();
      });
      audio.addEventListener("timeupdate", updateTime);
      seek.addEventListener("input", () => {
        audio.currentTime = Number(seek.value);
      });
      volume.addEventListener("input", () => {
        localBaseVolume = Number(volume.value);
        audio.volume = localBaseVolume * (isMuted ? 0 : fadeLevel);
      });
      audio.addEventListener("play", () => {
        setStatus(`Playing Site file ${siteTrackIndex + 1} of ${siteTracks.length}: ${siteTracks[siteTrackIndex].split("/").pop()}`);
        updateUI();
      });
      audio.addEventListener("ended", () => {
        if (siteTrackIndex + 1 < siteTracks.length) {
          siteTrackIndex++;
          audio.src = siteTracks[siteTrackIndex];
          audio.load();
          seek.value = "0";
          seek.max = "0";
          seek.disabled = true;
          updateTime();
          syncPlayback();
        } else {
          setStatus("Finished all Site files.");
        }
      });
      audio.addEventListener("error", () => {
        setStatus(`Could not load ${siteTracks[siteTrackIndex]}. Confirm the file exists in music/ and is published with the site.`);
      });
      localAudio = audio;
      container.append(audio, controls);
      setStatus(`${siteTracks.length} Site file${siteTracks.length === 1 ? "" : "s"} ready. Playback follows the presentation.`);
    }
    syncPlayback();
  }

  function selectOption(id) {
    selectedOptionId = id;
    renderOptionList();
    renderPlayer(getOption(id));
  }

  function postToYoutube(command, args = []) {
    const iframe = document.querySelector("#music-player-container iframe");
    if (!iframe?.contentWindow || selectedOption?.type !== "youtube") return;
    iframe.contentWindow.postMessage(JSON.stringify({
      event: "command",
      func: command,
      args
    }), "*");
  }

  function cancelFade() {
    if (fadeTimer !== null) {
      window.clearInterval(fadeTimer);
      fadeTimer = null;
    }
    fadeLevel = 1;
    if (localAudio) localAudio.volume = localBaseVolume;
  }

  function setPresentationPlaying(playing) {
    if (playing) cancelFade();
    else if (fadeTimer !== null) cancelFade();
    isPresentationPlaying = Boolean(playing);
    syncPlayback();
  }

  function fadeOut(duration = 3000) {
    if (!isPresentationPlaying || isMuted || isDucked || !selectedOption) {
      setPresentationPlaying(false);
      return;
    }

    cancelFade();
    if (selectedOption.type === "spotify" && !spotifyController) {
      setPresentationPlaying(false);
      setStatus("Spotify's standalone embed cannot be faded or paused by the presentation. Use its controls to stop playback.");
      return;
    }

    const fadeDuration = Math.max(0, duration);
    if (fadeDuration === 0) {
      setPresentationPlaying(false);
      return;
    }

    const startedAt = performance.now();
    fadeTimer = window.setInterval(() => {
      const progress = Math.min((performance.now() - startedAt) / fadeDuration, 1);
      fadeLevel = 1 - progress;
      syncPlayback();
      if (progress === 1) {
        cancelFade();
        isPresentationPlaying = false;
        if (selectedOption?.type === "local" && localAudio) localAudio.volume = localBaseVolume;
        syncPlayback();
      }
    }, 50);
    syncPlayback();
  }

  function toggleMute() {
    isMuted = !isMuted;
    syncPlayback();
  }

  function selectServiceMusic() {
    const id = window.MusicOptions?.getServiceOptionId();
    if (id && id !== selectedOptionId) selectOption(id);
  }

  const AudioManager = {
    play: function() {
      setPresentationPlaying(true);
    },
    pause: function() {
      setPresentationPlaying(false);
    },
    toggle: function() {
      setPresentationPlaying(!isPresentationPlaying);
    },
    setPresentationPlaying,
    fadeOut,
    toggleMute,
    selectServiceMusic,
    duck: function() {
      if (isDucked) return;
      isDucked = true;
      syncPlayback();
    },
    unduck: function() {
      if (!isDucked) return;
      isDucked = false;
      syncPlayback();
    },
    isPlaying: function() {
      return isPresentationPlaying && !isMuted && !isDucked && Boolean(selectedOption);
    },
    isMuted: function() {
      return isMuted;
    },
    prepareVideo: function(video, volume) {
      video.volume = Number.isFinite(volume) ? Math.max(0, Math.min(volume, 1)) : 0.55;
    },
    init: function() {
      const drawerToggle = document.getElementById("music-drawer-toggle");
      const drawer = document.getElementById("music-drawer");
      const closeDrawer = document.getElementById("close-drawer-btn");
      drawerToggle?.addEventListener("click", () => drawer?.classList.toggle("hidden"));
      closeDrawer?.addEventListener("click", () => drawer?.classList.add("hidden"));

      document.getElementById("quick-music-btn")?.addEventListener("click", AudioManager.toggleMute);
      document.getElementById("drawer-toggle-audio-btn")?.addEventListener("click", AudioManager.toggleMute);
      document.getElementById("music-player-toggle")?.addEventListener("click", AudioManager.toggleMute);

      selectedOptionId = window.MusicOptions?.getServiceOptionId() ?? "";
      renderOptionList();
      renderPlayer(getOption(selectedOptionId));
      updateUI();

      window.addEventListener("storage", event => {
        if (!["BILL_MUSIC_OPTIONS", "BILL_SERVICE_MUSIC_OPTION"].includes(event.key)) return;
        const options = getOptions();
        const serviceOptionId = window.MusicOptions?.getServiceOptionId() ?? "";
        const nextId = options.some(option => option.id === selectedOptionId)
          ? selectedOptionId
          : serviceOptionId;
        if (nextId !== selectedOptionId) selectOption(nextId);
        else {
          renderOptionList();
          const nextOption = options.find(option => option.id === nextId) ?? null;
          if (event.key === "BILL_MUSIC_OPTIONS" &&
              JSON.stringify(nextOption) !== JSON.stringify(selectedOption)) {
            renderPlayer(nextOption);
          }
        }
      });
    }
  };

  window.AudioManager = AudioManager;
})();
