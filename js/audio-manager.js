const AudioManager = {
  enabled: false,
  activeSource: "country",

  init: function() {
    this.quickBtn = document.getElementById("quick-music-btn");
    this.quickIcon = document.getElementById("quick-music-icon");
    this.drawerBtn = document.getElementById("drawer-toggle-audio-btn");
    this.countryFrame = document.getElementById("country-music-iframe");
    this.spotifyDrawer = document.getElementById("music-drawer");
    
    this.bindEvents();
  },

  setSource: function(source) {
    this.activeSource = source;
    document.getElementById("tab-country-btn")?.classList.toggle("active", source === "country");
    document.getElementById("tab-spotify-btn")?.classList.toggle("active", source === "spotify");
    document.getElementById("country-player-section")?.classList.toggle("hidden", source !== "country");
    document.getElementById("spotify-player-section")?.classList.toggle("hidden", source !== "spotify");
  },

  play: function() {
    this.enabled = true;
    this.updateUI();

    if (this.activeSource === "country") {
      this.setSource("country");
      if (this.countryFrame && !this.countryFrame.src.includes("autoplay=1")) {
        const sep = this.countryFrame.src.includes("?") ? "&" : "?";
        this.countryFrame.src += sep + "autoplay=1";
      } else if (this.countryFrame) {
        this.sendCommand("playVideo");
      }
    } else if (this.activeSource === "spotify") {
      this.setSource("spotify");
      this.spotifyDrawer?.classList.remove("hidden");
    }
  },

  pause: function() {
    this.enabled = false;
    this.updateUI();
    this.sendCommand("pauseVideo");
  },

  toggle: function() {
    this.enabled ? this.pause() : this.play();
  },

  duckForVideo: function() {
    if (this.enabled) this.sendCommand("pauseVideo");
  },

  resumeAfterVideo: function() {
    if (this.enabled && this.activeSource === "country") {
      this.sendCommand("playVideo");
    }
  },

  sendCommand: function(func) {
    try {
      if (this.countryFrame?.contentWindow) {
        this.countryFrame.contentWindow.postMessage(JSON.stringify({ event: "command", func: func, args: [] }), "*");
      }
    } catch (e) {}
  },

  updateUI: function() {
    if (this.quickIcon && this.quickBtn) {
      this.quickIcon.textContent = this.enabled ? "🔊" : "🔇";
      this.quickBtn.classList.toggle("music-active", this.enabled);
    }
    if (this.drawerBtn) {
      this.drawerBtn.textContent = this.enabled ? "Turn Music Off" : "Turn Music On";
      this.drawerBtn.className = this.enabled ? "btn btn-sm btn-danger" : "btn btn-sm btn-outline";
    }
  },

  bindEvents: function() {
    this.quickBtn?.addEventListener("click", () => this.toggle());
    this.drawerBtn?.addEventListener("click", () => this.toggle());
    document.getElementById("tab-country-btn")?.addEventListener("click", () => this.setSource("country"));
    document.getElementById("tab-spotify-btn")?.addEventListener("click", () => this.setSource("spotify"));
  }
};
