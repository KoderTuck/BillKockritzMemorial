(function() {
  const form = document.getElementById("music-option-form");
  const optionsList = document.getElementById("music-option-admin-list");
  const status = document.getElementById("music-option-admin-status");
  const nameInput = document.getElementById("music-option-name");
  const typeInput = document.getElementById("music-option-type");
  const urlInput = document.getElementById("music-option-url");
  const urlLabel = document.getElementById("music-option-url-label");
  const siteFilesInput = document.getElementById("music-option-site-files");
  const musicTab = document.getElementById("tab-music-options-btn");
  const playlistTabs = [
    document.getElementById("tab-service-btn"),
    document.getElementById("tab-long-btn")
  ];
  const libraryPanel = document.getElementById("media-library-panel");
  const musicPanel = document.getElementById("music-options-panel");

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.style.color = isError ? "#ff8585" : "var(--text-gold)";
  }

  function validateOption(option) {
    if (!option.name.trim()) return "Enter a name for this music option.";

    if (option.type === "local") {
      if (!Array.isArray(option.tracks) || option.tracks.length < 1 || option.tracks.length > 5 ||
          option.tracks.some(path => !MusicOptions.isValidSiteFilePath(path))) {
        return "Enter 1 to 5 supported file paths inside music/, in playback order.";
      }
      return "";
    }

    let url;
    try {
      url = new URL(option.url);
    } catch {
      return "Enter a valid link.";
    }

    if (option.type === "youtube" && !["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(url.hostname)) {
      return "Enter a YouTube video link.";
    }
    if (option.type === "spotify" && url.hostname !== "open.spotify.com") {
      return "Enter a Spotify link from open.spotify.com.";
    }
    return "";
  }

  function createSiteFileInputs(container, tracks = []) {
    container.replaceChildren();
    for (let index = 0; index < 5; index++) {
      const label = document.createElement("label");
      label.textContent = `Track ${index + 1}${index === 0 ? " (required)" : ""}`;
      const input = document.createElement("input");
      input.type = "text";
      input.value = tracks[index] ?? "";
      input.placeholder = "music/song.m4a";
      input.setAttribute("list", "site-music-file-suggestions");
      input.autocomplete = "off";
      input.required = index === 0 && container === siteFilesInput;
      label.appendChild(input);
      container.appendChild(label);
    }
  }

  const fileSuggestions = document.createElement("datalist");
  fileSuggestions.id = "site-music-file-suggestions";
  [
    "music/01 When You Got To Heaven.m4a",
    "music/07 One More Day.m4a"
  ].forEach(path => {
    const option = document.createElement("option");
    option.value = path;
    fileSuggestions.appendChild(option);
  });
  document.body.appendChild(fileSuggestions);

  function getSiteFilePaths(container) {
    return [...container.querySelectorAll("input")]
      .map(input => input.value.trim())
      .filter(Boolean);
  }

  function updateSourceFields(type, urlField, siteFilesField, tracks = []) {
    const isSiteFiles = type === "local";
    urlField.hidden = isSiteFiles;
    urlField.querySelector("input").required = !isSiteFiles;
    siteFilesField.classList.toggle("hidden", !isSiteFiles);
    if (isSiteFiles) createSiteFileInputs(siteFilesField, tracks);
  }

  function createId() {
    return window.crypto?.randomUUID?.() ?? `music-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function makeInput(value, label) {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const input = document.createElement("input");
    input.value = value;
    input.required = true;
    wrapper.appendChild(input);
    return { wrapper, input };
  }

  function renderOptions() {
    optionsList.replaceChildren();
    const options = MusicOptions.getOptions();
    const serviceOptionId = MusicOptions.getServiceOptionId();

    options.forEach((option, index) => {
      const row = document.createElement("div");
      row.className = "music-option-admin-row";

      const serviceLabel = document.createElement("label");
      serviceLabel.className = "music-service-choice";
      serviceLabel.title = "Use this option when the 7-Min Service starts.";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "service-music-option";
      radio.checked = option.id === serviceOptionId;
      radio.setAttribute("aria-label", `Use ${option.name} for the 7-Min Service`);
      radio.addEventListener("change", () => {
        try {
          MusicOptions.setServiceOptionId(option.id);
          renderOptions();
          showStatus(`${option.name} will be used for the 7-Min Service.`);
        } catch (error) {
          showStatus(error.message, true);
        }
      });
      serviceLabel.appendChild(radio);

      const name = makeInput(option.name, "Name");
      const typeLabel = document.createElement("label");
      typeLabel.textContent = "Type";
      const type = document.createElement("select");
      [
        ["youtube", "YouTube"],
        ["spotify", "Spotify"],
        ["local", "Site files"]
      ].forEach(([value, text]) => {
        const choice = document.createElement("option");
        choice.value = value;
        choice.textContent = text;
        type.appendChild(choice);
      });
      type.value = option.type;
      typeLabel.appendChild(type);

      const url = makeInput(option.url ?? "", "Link");
      const siteFiles = document.createElement("div");
      siteFiles.className = "music-site-files";
      createSiteFileInputs(siteFiles, option.tracks ?? []);
      updateSourceFields(option.type, url.wrapper, siteFiles, option.tracks ?? []);
      type.addEventListener("change", () => {
        updateSourceFields(type.value, url.wrapper, siteFiles, option.tracks ?? []);
        row.classList.toggle("has-site-files", type.value === "local");
      });
      const save = document.createElement("button");
      save.type = "button";
      save.className = "btn btn-outline";
      save.textContent = "Save";
      save.addEventListener("click", () => {
        const updated = {
          ...option,
          name: name.input.value.trim(),
          type: type.value,
          url: type.value === "local" ? undefined : url.input.value.trim(),
          tracks: type.value === "local" ? getSiteFilePaths(siteFiles) : undefined
        };
        if (updated.url === undefined) delete updated.url;
        if (updated.tracks === undefined) delete updated.tracks;
        const validationError = validateOption(updated);
        if (validationError) {
          showStatus(validationError, true);
          return;
        }
        const updatedOptions = MusicOptions.getOptions();
        updatedOptions[index] = updated;
        try {
          MusicOptions.saveOptions(updatedOptions);
          renderOptions();
          showStatus("Music option saved.");
        } catch (error) {
          showStatus(error.message, true);
        }
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn-danger";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        const updatedOptions = MusicOptions.getOptions().filter(item => item.id !== option.id);
        try {
          MusicOptions.saveOptions(updatedOptions);
          renderOptions();
          showStatus("Music option removed.");
        } catch (error) {
          showStatus(error.message, true);
        }
      });

      row.classList.toggle("has-site-files", option.type === "local");
      row.append(serviceLabel, name.wrapper, typeLabel, url.wrapper, siteFiles, save, remove);
      optionsList.appendChild(row);
    });

    if (options.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.textContent = "No music options yet. Add one above.";
      optionsList.appendChild(emptyState);
    }
  }

  function showMusicAdmin(show) {
    libraryPanel.classList.toggle("hidden", show);
    musicPanel.classList.toggle("hidden", !show);
    musicTab.classList.toggle("active", show);
    if (show) playlistTabs.forEach(tab => tab.classList.remove("active"));
  }

  typeInput.addEventListener("change", () => {
    const local = typeInput.value === "local";
    urlLabel.textContent = local ? "Path in music/" : "Link";
    urlInput.placeholder = local ? "music/song.m4a" : typeInput.value === "spotify"
      ? "https://open.spotify.com/playlist/..."
      : "https://www.youtube.com/watch?v=...";
    urlInput.required = !local;
    urlInput.closest("label").hidden = local;
    siteFilesInput.classList.toggle("hidden", !local);
    if (local) createSiteFileInputs(siteFilesInput);
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const option = {
      id: createId(),
      name: nameInput.value.trim(),
      type: typeInput.value,
      url: urlInput.value.trim(),
      tracks: typeInput.value === "local" ? getSiteFilePaths(siteFilesInput) : undefined
    };
    if (option.type === "local") delete option.url;
    else delete option.tracks;
    const validationError = validateOption(option);
    if (validationError) {
      showStatus(validationError, true);
      return;
    }

    try {
      MusicOptions.saveOptions([...MusicOptions.getOptions(), option]);
      form.reset();
      typeInput.dispatchEvent(new Event("change"));
      renderOptions();
      showStatus(`${option.name} added.`);
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  musicTab.addEventListener("click", () => showMusicAdmin(true));
  playlistTabs.forEach(tab => tab.addEventListener("click", () => showMusicAdmin(false)));

  renderOptions();
  typeInput.dispatchEvent(new Event("change"));
})();
