(function() {
  const OPTIONS_KEY = "BILL_MUSIC_OPTIONS";
  const SERVICE_OPTION_KEY = "BILL_SERVICE_MUSIC_OPTION";

  function getBundledOptions() {
    return (Array.isArray(window.BILL_MUSIC_OPTIONS) ? window.BILL_MUSIC_OPTIONS : [])
      .map(option => ({
      ...option,
      ...(Array.isArray(option.tracks) ? { tracks: [...option.tracks] } : {})
      }));
  }

  function isValidSiteFilePath(path) {
    return typeof path === "string" &&
      /^music\/(?!.*(?:^|\/)\.\.(?:\/|$))[^\\?#]+\.(?:mp3|m4a|aac|wav|ogg|opus|flac|mp4)$/i.test(path);
  }

  function getOptions() {
    const saved = localStorage.getItem(OPTIONS_KEY);
    if (!saved) return getBundledOptions();

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
      console.warn("Saved music options were not a list; using media-data.js options.");
    } catch (error) {
      console.warn("Could not parse saved music options; using media-data.js options.", error);
    }
    return getBundledOptions();
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
    if (options.some(option => option.id === selected)) return selected;
    const bundled = window.BILL_SERVICE_MUSIC_OPTION;
    return options.some(option => option.id === bundled) ? bundled : options[0]?.id ?? "";
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
