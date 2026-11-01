// Bill Kockritz Memorial music selection and playback controls

(function() {
  let isPlaying = false;
  let isDucked = false;
  let selectedOptionId = "";
  let selectedOption = null;
  let localAudio = null;
  let siteTracks = [];
  let siteTrackIndex = 0;
  let spotifyController = null;
  let spotifyReady;

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

    quickBtn?.classList.toggle("music-active", isPlaying);
    if (quickIcon) quickIcon.textContent = isPlaying ? "🔊" : "🔇";
    if (drawerToggleBtn) {
      drawerToggleBtn.textContent = isPlaying ? "Turn Music Off" : "Turn Music On";
      drawerToggleBtn.classList.toggle("btn-primary", isPlaying);
      drawerToggleBtn.classList.toggle("btn-outline", !isPlaying);
    }
    if (playBtn) playBtn.textContent = isPlaying ? "❚❚ Pause Selected Music" : "▶ Play Selected Music";
    statusDot?.classList.toggle("playing", isPlaying);
    if (statusText) statusText.textContent = isPlaying ? "Music is playing" : "Music is paused";
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
          if (isPlaying && !isDucked) controller.play();
          setStatus("Spotify player ready. Use the embedded controls or Play Selected Music.");
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
      setStatus("Use the Spotify player controls to start or pause playback.");
    }
  }

  function renderPlayer(option) {
    const container = document.getElementById("music-player-container");
    if (!container) return;
    spotifyController?.destroy();
    spotifyController = null;
    localAudio = null;
    siteTracks = [];
    siteTrackIndex = 0;
    container.replaceChildren();
    selectedOption = option ?? null;

    if (!option) {
      setStatus("Add music options in Curator Admin to play background music.");
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
      container.appendChild(iframe);
      setStatus("Use the player controls or Play Selected Music.");
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
      audio.controls = true;
      audio.preload = "none";
      audio.src = siteTracks[0];
      audio.addEventListener("play", () => {
        isPlaying = true;
        setStatus(`Playing Site file ${siteTrackIndex + 1} of ${siteTracks.length}: ${siteTracks[siteTrackIndex].split("/").pop()}`);
        updateUI();
      });
      audio.addEventListener("pause", () => {
        if (isDucked || audio.ended) return;
        isPlaying = false;
        updateUI();
      });
      audio.addEventListener("ended", () => {
        if (siteTrackIndex + 1 < siteTracks.length) {
          siteTrackIndex++;
          audio.src = siteTracks[siteTrackIndex];
          audio.load();
          audio.play().catch(error => {
            isPlaying = false;
            setStatus(`Could not play Site file ${siteTracks[siteTrackIndex]}: ${error.message}`);
            updateUI();
          });
        } else {
          isPlaying = false;
          setStatus("Finished all Site files.");
          updateUI();
        }
      });
      audio.addEventListener("error", () => {
        isPlaying = false;
        setStatus(`Could not load ${siteTracks[siteTrackIndex]}. Confirm the file exists in music/ and is published with the site.`);
        updateUI();
      });
      localAudio = audio;
      container.appendChild(audio);
      setStatus(`${siteTracks.length} Site file${siteTracks.length === 1 ? "" : "s"} ready in playback order.`);
    }
    updateUI();
  }

  function selectOption(id) {
    if (isPlaying) pause();
    selectedOptionId = id;
    renderOptionList();
    renderPlayer(getOption(id));
  }

  function postToYoutube(command) {
    const iframe = document.querySelector("#music-player-container iframe");
    if (!iframe?.contentWindow || selectedOption?.type !== "youtube") return;
    iframe.contentWindow.postMessage(JSON.stringify({
      event: "command",
      func: command,
      args: []
    }), "*");
  }

  function play() {
    if (!selectedOption) {
      setStatus("Choose a music option first.");
      return;
    }
    isPlaying = true;
    isDucked = false;

    if (selectedOption.type === "youtube") postToYoutube("playVideo");
    else if (selectedOption.type === "spotify") {
      if (!spotifyController) {
        isPlaying = false;
        setStatus("Use the Spotify player controls to start playback.");
        updateUI();
        return;
      }
      spotifyController.play();
    }
    else if (selectedOption.type === "local" && localAudio) {
      localAudio.play().catch(error => {
        isPlaying = false;
        setStatus(`Could not play Site file ${siteTracks[siteTrackIndex]}: ${error.message}`);
        updateUI();
      });
    }
    updateUI();
  }

  function pause() {
    isPlaying = false;
    isDucked = false;
    if (selectedOption?.type === "youtube") postToYoutube("pauseVideo");
    else if (selectedOption?.type === "spotify") spotifyController?.pause();
    else localAudio?.pause();
    updateUI();
  }

  const AudioManager = {
    play,
    pause,
    toggle: function() {
      if (isPlaying) pause();
      else play();
    },
    playServiceMusic: function() {
      const id = window.MusicOptions?.getServiceOptionId();
      if (id && id !== selectedOptionId) selectOption(id);
      play();
    },
    duck: function() {
      if (!isPlaying || isDucked) return;
      isDucked = true;
      if (selectedOption?.type === "youtube") postToYoutube("pauseVideo");
      else if (selectedOption?.type === "spotify") spotifyController?.pause();
      else localAudio?.pause();
      updateUI();
    },
    unduck: function() {
      if (!isDucked) return;
      isDucked = false;
      if (isPlaying) {
        if (selectedOption?.type === "youtube") postToYoutube("playVideo");
        else if (selectedOption?.type === "spotify") spotifyController?.play();
        else localAudio?.play().catch(error => {
          console.warn("Could not resume local music after a video clip.", error);
        });
      }
      updateUI();
    },
    isPlaying: function() {
      return isPlaying;
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

      document.getElementById("quick-music-btn")?.addEventListener("click", () => AudioManager.toggle());
      document.getElementById("drawer-toggle-audio-btn")?.addEventListener("click", () => AudioManager.toggle());
      document.getElementById("music-player-toggle")?.addEventListener("click", () => AudioManager.toggle());

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
            if (isPlaying) pause();
            renderPlayer(nextOption);
          }
        }
      });
    }
  };

  window.AudioManager = AudioManager;
})();
