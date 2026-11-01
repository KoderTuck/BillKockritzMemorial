(function() {
  const OPTIONS_KEY = "BILL_MUSIC_OPTIONS";
  const SERVICE_OPTION_KEY = "BILL_SERVICE_MUSIC_OPTION";
  const defaults = [
    {
      id: "youtube-guitar",
      name: "Guitar Instrumental",
      type: "youtube",
      url: "https://www.youtube.com/watch?v=6YdIHC4np98"
    },
    {
      id: "spotify-memorial",
      name: "Bill's Memorial Playlist",
      type: "spotify",
      url: "https://open.spotify.com/playlist/6pgIsgsNQUYw19EpT98bEv"
    }
  ];

  function isValidSiteFilePath(path) {
    return typeof path === "string" &&
      /^music\/(?!.*(?:^|\/)\.\.(?:\/|$))[^\\?#]+\.(?:mp3|m4a|aac|wav|ogg|opus|flac|mp4)$/i.test(path);
  }

  function getOptions() {
    const saved = localStorage.getItem(OPTIONS_KEY);
    if (!saved) return defaults.map(option => ({ ...option }));

    try {
      const options = JSON.parse(saved);
      if (Array.isArray(options)) {
        return options.map(option => {
          if (option.type !== "local" || Array.isArray(option.tracks)) return option;
          const migrated = { ...option, tracks: option.url ? [option.url] : [] };
          delete migrated.url;
          return migrated;
        });
      }
      console.warn("Saved music options were not a list; using defaults.");
    } catch (error) {
      console.warn("Could not parse saved music options; using defaults.", error);
    }
    return defaults.map(option => ({ ...option }));
  }

  function saveOptions(options) {
    if (!Array.isArray(options) || options.some(option => {
      if (!option.id || !option.name?.trim()) return true;
      if (option.type === "local") {
        return !Array.isArray(option.tracks) || option.tracks.length < 1 ||
          option.tracks.length > 5 || option.tracks.some(path => !isValidSiteFilePath(path));
      }
      return !["youtube", "spotify"].includes(option.type) || !option.url?.trim();
    })) {
      throw new Error("Each music option needs a name and a valid link or 1 to 5 Site files.");
    }

    localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
    if (options.length === 0) {
      localStorage.removeItem(SERVICE_OPTION_KEY);
    } else if (!options.some(option => option.id === localStorage.getItem(SERVICE_OPTION_KEY))) {
      localStorage.setItem(SERVICE_OPTION_KEY, options[0].id);
    }
  }

  function getServiceOptionId() {
    const selected = localStorage.getItem(SERVICE_OPTION_KEY);
    const options = getOptions();
    return options.some(option => option.id === selected) ? selected : options[0]?.id ?? "";
  }

  function setServiceOptionId(id) {
    if (!getOptions().some(option => option.id === id)) {
      throw new Error("The selected 7-Min Service music option does not exist.");
    }
    localStorage.setItem(SERVICE_OPTION_KEY, id);
  }

  window.MusicOptions = {
    getOptions,
    saveOptions,
    isValidSiteFilePath,
    getServiceOptionId,
    setServiceOptionId
  };
})();
