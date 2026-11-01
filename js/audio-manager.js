// Bill Kockritz Memorial Audio Manager
// Handles background guitar audio, Spotify drawer, button states, and video auto-ducking

(function() {
  let isPlaying = false;
  let isDucked = false;
  let activeTab = 'country';
  let videoAudioContext = null;

  function resumeVideoAudioContext() {
    if (videoAudioContext?.state === 'suspended') {
      videoAudioContext.resume().catch(err => {
        console.warn('Could not resume amplified video audio.', err);
      });
    }
  }

  function getIframe() {
    return document.getElementById('country-music-iframe');
  }

  function postToYoutube(command, args = '') {
    const iframe = getIframe();
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: command, args: args }),
          '*'
        );
      } catch (err) {
        console.warn('YouTube postMessage error:', err);
      }
    }
  }

  function updateUI() {
    const quickBtn = document.getElementById('quick-music-btn');
    const quickIcon = document.getElementById('quick-music-icon');
    const drawerToggleBtn = document.getElementById('drawer-toggle-audio-btn');
    const statusDot = document.getElementById('guitar-status-dot');
    const statusText = document.getElementById('guitar-status-text');

    if (quickBtn && quickIcon) {
      if (isPlaying) {
        quickBtn.classList.add('music-active');
        quickIcon.textContent = '🔊';
      } else {
        quickBtn.classList.remove('music-active');
        quickIcon.textContent = '🔇';
      }
    }

    if (drawerToggleBtn) {
      drawerToggleBtn.textContent = isPlaying ? 'Turn Music Off' : 'Turn Music On';
      if (isPlaying) {
        drawerToggleBtn.classList.add('btn-primary');
        drawerToggleBtn.classList.remove('btn-outline');
      } else {
        drawerToggleBtn.classList.remove('btn-primary');
        drawerToggleBtn.classList.add('btn-outline');
      }
    }

    if (statusDot && statusText) {
      if (isPlaying) {
        statusDot.classList.add('playing');
        statusText.textContent = isDucked ? 'Paused for video clip...' : 'Streaming guitar instrumental...';
      } else {
        statusDot.classList.remove('playing');
        statusText.textContent = 'Music is paused';
      }
    }
  }

  const AudioManager = {
    play: function() {
      isPlaying = true;
      isDucked = false;
      postToYoutube('playVideo');
      updateUI();
    },

    pause: function() {
      isPlaying = false;
      isDucked = false;
      postToYoutube('pauseVideo');
      updateUI();
    },

    toggle: function() {
      if (isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    },

    duck: function() {
      if (isPlaying && !isDucked) {
        isDucked = true;
        postToYoutube('pauseVideo');
        updateUI();
      }
    },

    unduck: function() {
      if (isDucked) {
        isDucked = false;
        if (isPlaying) {
          postToYoutube('playVideo');
        }
        updateUI();
      }
    },

    isPlaying: function() {
      return isPlaying;
    },

    prepareVideo: function(video, volume) {
      const targetVolume = Number.isFinite(volume) ? Math.max(0, Math.min(volume, 3)) : 0.55;
      if (targetVolume <= 1) {
        video.volume = targetVolume;
        return;
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn('This browser does not support video audio amplification; playing at 100% volume.');
        video.volume = 1;
        return;
      }

      try {
        videoAudioContext ??= new AudioContext();
        const source = videoAudioContext.createMediaElementSource(video);
        const gain = videoAudioContext.createGain();
        const limiter = videoAudioContext.createDynamicsCompressor();
        gain.gain.value = targetVolume;
        limiter.threshold.value = -1;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.25;
        source.connect(gain);
        gain.connect(limiter);
        limiter.connect(videoAudioContext.destination);
        video.volume = 1;
        resumeVideoAudioContext();
      } catch (err) {
        console.warn('Could not amplify video audio; playing at 100% volume.', err);
        video.volume = 1;
      }
    },

    init: function() {
      document.addEventListener('pointerdown', resumeVideoAudioContext);
      document.addEventListener('keydown', resumeVideoAudioContext);

      const quickBtn = document.getElementById('quick-music-btn');
      if (quickBtn) {
        quickBtn.addEventListener('click', () => AudioManager.toggle());
      }

      const drawerToggle = document.getElementById('music-drawer-toggle');
      const drawer = document.getElementById('music-drawer');
      const closeDrawerBtn = document.getElementById('close-drawer-btn');

      if (drawerToggle && drawer) {
        drawerToggle.addEventListener('click', () => {
          drawer.classList.toggle('hidden');
        });
      }

      if (closeDrawerBtn && drawer) {
        closeDrawerBtn.addEventListener('click', () => {
          drawer.classList.add('hidden');
        });
      }

      const playCountryBtn = document.getElementById('play-country-btn');
      if (playCountryBtn) {
        playCountryBtn.addEventListener('click', () => AudioManager.play());
      }

      const pauseCountryBtn = document.getElementById('pause-country-btn');
      if (pauseCountryBtn) {
        pauseCountryBtn.addEventListener('click', () => AudioManager.pause());
      }

      const drawerToggleAudioBtn = document.getElementById('drawer-toggle-audio-btn');
      if (drawerToggleAudioBtn) {
        drawerToggleAudioBtn.addEventListener('click', () => AudioManager.toggle());
      }

      const tabCountryBtn = document.getElementById('tab-country-btn');
      const tabSpotifyBtn = document.getElementById('tab-spotify-btn');
      const countrySection = document.getElementById('country-player-section');
      const spotifySection = document.getElementById('spotify-player-section');

      if (tabCountryBtn && tabSpotifyBtn && countrySection && spotifySection) {
        tabCountryBtn.addEventListener('click', () => {
          tabCountryBtn.classList.add('active');
          tabSpotifyBtn.classList.remove('active');
          countrySection.classList.remove('hidden');
          spotifySection.classList.add('hidden');
          activeTab = 'country';
        });

        tabSpotifyBtn.addEventListener('click', () => {
          tabSpotifyBtn.classList.add('active');
          tabCountryBtn.classList.remove('active');
          spotifySection.classList.remove('hidden');
          countrySection.classList.add('hidden');
          activeTab = 'spotify';
        });
      }

      updateUI();
    }
  };

  window.AudioManager = AudioManager;
})();
