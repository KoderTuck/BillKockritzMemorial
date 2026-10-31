const CONFIG = {
  defaultPhotoPacingMs: 5500,
  videoTargetVolume: 0.55,
  
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
  
  getActiveMediaList: function(masterList) {
    const saved = localStorage.getItem("BILL_SERVICE_CUSTOM_MEDIA");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn("Could not parse saved media", e);
      }
    }
    return [...masterList];
  },

  getSavedPacingMs: function() {
    const saved = localStorage.getItem("BILL_SERVICE_PHOTO_DURATION");
    return saved ? Math.round(parseFloat(saved) * 1000) : CONFIG.defaultPhotoPacingMs;
  }
};
