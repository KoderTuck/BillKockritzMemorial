// Bill Kockritz Memorial Configuration & Utilities
// Loaded by index.html and admin.html

const CONFIG = {
  defaultPhotoPacingMs: 5500,
  videoTargetVolume: 0.55,
  storageKeyService: "BILL_SERVICE_PLAYLIST",
  storageKeyLong: "BILL_LONG_PLAYLIST",
  storageKeyPacing: "BILL_SERVICE_PHOTO_DURATION",

  // Sacred and goofy quotes celebrating Bill
  billisms: [
    "“My life’s goal is to get to the end and hear Jesus say, well done, good and faithful servant!”",
    "“Why catch a small fish when there’s a trophy waiting out in the deep water?”",
    "“You’re never too old to take the 4-wheeler through the biggest mud puddle on the trail.”",
    "“There is no problem that campfire coffee and a good dog can’t improve.”",
    "“Life is always better when you’re wearing the big sombrero.”",
    "“Family first, faithful always, and never turn down second helpings.”",
    "“Go Seahawks!”"
  ]
};

const UTILS = {
  shuffle: function(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  getSavedPlaylist: function(key, fallbackGenerator) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not parse saved playlist for key: " + key, e);
    }
    return fallbackGenerator ? fallbackGenerator() : [];
  },

  getSavedPacingMs: function() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKeyPacing);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val > 1000) return val;
      }
    } catch (e) {
      console.warn("Could not read saved pacing", e);
    }
    return CONFIG.defaultPhotoPacingMs;
  },

  formatTime: function(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }
};
