/**
 * MediaStore: Unified Data Access Layer
 * Single Source of Truth for both playlists and master library.
 */
const MediaStore = {
  KEYS: {
    SERVICE: "BILL_SERVICE_PLAYLIST",
    LONG: "BILL_LONG_PLAYLIST",
    SERVICE_PACE: "BILL_SERVICE_PHOTO_DURATION",
    LONG_PACE: "BILL_LONG_PHOTO_DURATION"
  },

  init: function() {
    // Clear out deprecated legacy keys to prevent cache conflicts
    localStorage.removeItem("BILL_SERVICE_CUSTOM_MEDIA");
  },

  normalizePlaylist: function(playlist) {
    let changed = false;

    playlist.forEach(item => {
      if (!item || item.type !== "video") return;

      if (typeof item.volume === "number" && Number.isFinite(item.volume)) {
        const volume = Math.max(0, Math.min(item.volume, 1));
        if (volume !== item.volume) {
          item.volume = volume;
          changed = true;
        }
      }
    });

    return changed;
  },

  getSavedPlaylist: function(key) {
    const saved = localStorage.getItem(key);
    if (!saved) return null;

    let parsed;
    try {
      parsed = JSON.parse(saved);
    } catch (e) {
      console.warn("Could not parse saved playlist for key: " + key, e);
      return null;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (this.normalizePlaylist(parsed)) {
      localStorage.setItem(key, JSON.stringify(parsed));
    }
    return parsed;
  },

  getMasterMedia: function() {
    return window.BILL_MASTER_MEDIA || [];
  },

  getServicePlaylist: function() {
    const savedPlaylist = this.getSavedPlaylist(this.KEYS.SERVICE);
    if (savedPlaylist) return savedPlaylist;
    return window.BILL_SERVICE_PLAYLIST ? [...window.BILL_SERVICE_PLAYLIST] : [];
  },

  getLongShowPlaylist: function() {
    const savedPlaylist = this.getSavedPlaylist(this.KEYS.LONG);
    if (savedPlaylist) return savedPlaylist;
    return window.BILL_LONG_PLAYLIST
      ? [...window.BILL_LONG_PLAYLIST]
      : [...this.getMasterMedia()];
  },

  savePlaylists: function(serviceList, longList, servicePace, longPace) {
    if (serviceList) localStorage.setItem(this.KEYS.SERVICE, JSON.stringify(serviceList));
    if (longList) localStorage.setItem(this.KEYS.LONG, JSON.stringify(longList));
    if (servicePace) localStorage.setItem(this.KEYS.SERVICE_PACE, servicePace.toString());
    if (longPace) localStorage.setItem(this.KEYS.LONG_PACE, longPace.toString());
  },

  resetToMaster: function() {
    localStorage.removeItem(this.KEYS.SERVICE);
    localStorage.removeItem(this.KEYS.LONG);
    localStorage.removeItem(this.KEYS.SERVICE_PACE);
    localStorage.removeItem(this.KEYS.LONG_PACE);
  },

  getPacingMs: function(mode) {
    const key = mode === 'service' ? this.KEYS.SERVICE_PACE : this.KEYS.LONG_PACE;
    const defaultSec = mode === 'service' ? 5.5 : 6.0;
    const saved = localStorage.getItem(key);
    return saved ? Math.round(parseFloat(saved) * 1000) : defaultSec * 1000;
  }
};

MediaStore.init();
window.MediaStore = MediaStore;
