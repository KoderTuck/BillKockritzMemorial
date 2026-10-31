const ArchiveManager = {
  buildGrid: function(containerId, list, onCardClickCallback) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    
    grid.innerHTML = "";
    list.forEach(item => {
      const card = document.createElement("div");
      card.className = "archive-card";

      const thumb = document.createElement("div");
      thumb.className = "archive-card-thumb";

      if (item.type === "video") {
        thumb.innerHTML = `<span class="video-badge">▶ Video</span><div style="color:#8e9bb0">🎬 Video Clip</div>`;
      } else {
        const img = document.createElement("img");
        img.src = item.src;
        img.loading = "lazy";
        img.onerror = () => { img.style.opacity = "0.3"; };
        thumb.appendChild(img);
      }

      const info = document.createElement("div");
      info.className = "archive-card-info";
      info.innerHTML = `<p>${item.caption || item.src.split("/").pop()}</p>`;

      card.appendChild(thumb);
      card.appendChild(info);

      card.addEventListener("click", () => onCardClickCallback(item));
      grid.appendChild(card);
    });
  }
};
