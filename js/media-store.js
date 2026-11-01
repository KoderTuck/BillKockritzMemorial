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

  getMasterMedia: function() {
    return window.BILL_MASTER_MEDIA || [];
  },

  getServicePlaylist: function() {
    const saved = localStorage.getItem(this.KEYS.SERVICE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { console.warn("Could not parse saved service playlist", e); }
    }
    return window.BILL_SERVICE_PLAYLIST ? [...window.BILL_SERVICE_PLAYLIST] : [];
  },

  getLongShowPlaylist: function() {
    const saved = localStorage.getItem(this.KEYS.LONG);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { console.warn("Could not parse saved long show playlist", e); }
    }
    // Default Long Show is everything in the master pool (excluding finale which is appended later)
    return [...this.getMasterMedia()];
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
