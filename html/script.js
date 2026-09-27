(function () {
  'use strict';

  var DEFAULT_CONFIG = {
    brand: { primaryText: 'X1S', secondaryText: 'Core', subtitle: 'Powered By X1Studios' },
    background: {
      useCustomImage: false,
      imagePath: 'img/background.png',
      images: [],
      intervalMs: 20000,
      transitionMs: 1500
    },
    intro: {
      primaryLogo: 'img/x1s_logo.png',
      secondaryLogo: 'img/x1s_horse.png',
      primaryHoldMs: 1300,
      secondaryHoldMs: 1500,
      transitionMs: 650,
      sound: '',
      soundVolume: 0.8
    },
    info: { title: 'INFORMATION', text: 'Loading server content…' },
    music: { enabled: false, tracks: [] },
    staff: { enabled: false, buttonLabel: 'STAFF &amp; TEAM', title: 'STAFF &amp; DEVELOPMENT TEAM', members: [] }
  };

  var state = {
    config: DEFAULT_CONFIG,
    progress: 0,
    introDone: false,
    resourcesDone: false,
    trackIndex: 0,
    isPlaying: false,
    staffModalOpen: false,
    bgTimer: null,
    bgTransitionMs: 1500
  };

  var el = {};

  function $(id) { return document.getElementById(id); }

  function isNui() {
    return typeof window.invokeNative === 'function' || location.protocol === 'https:';
  }

  function getParentResourceName() {
    if (location.hostname) return location.hostname;
    try {
      if (typeof GetParentResourceName === 'function') {
        var name = GetParentResourceName();
        if (name) return name;
      }
    } catch (e) {  }
    return 'x1s-loading';
  }

  function loadConfig() {
    return fetch('config.json')
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        state.config = Object.assign({}, DEFAULT_CONFIG, cfg);
        state.config.brand = Object.assign({}, DEFAULT_CONFIG.brand, cfg.brand || {});
        state.config.intro = Object.assign({}, DEFAULT_CONFIG.intro, cfg.intro || {});
        state.config.info = Object.assign({}, DEFAULT_CONFIG.info, cfg.info || {});
        state.config.music = Object.assign({}, DEFAULT_CONFIG.music, cfg.music || {});
        state.config.background = Object.assign({}, DEFAULT_CONFIG.background, cfg.background || {});
        state.config.staff = Object.assign({}, DEFAULT_CONFIG.staff, cfg.staff || {});
        return state.config;
      })
      .catch(function () { return state.config; });
  }

  function buildStars(count) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var s = document.createElement('div');
      s.className = 'star';
      s.style.left = (Math.random() * 100) + '%';
      s.style.top = (Math.random() * 100) + '%';
      var size = 1.5 + Math.random() * 2;
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.animationDelay = (Math.random() * 3.6) + 's';
      s.style.animationDuration = (2.6 + Math.random() * 2.4) + 's';
      frag.appendChild(s);
    }
    el.starsLayer.appendChild(frag);
  }

  function snapHidden(layer) {
    layer.style.transition = 'none';
    layer.classList.remove('is-visible');
    void layer.offsetWidth;
    layer.style.transition = '';
  }

  function crossfadeBackgroundTo(path) {
    if (!path) return;
    var base = el.bgPhotoBase;
    var overlay = el.bgPhotoOverlay;
    var target = 'url(' + path + ')';
    if (base.style.backgroundImage === target) return; // already showing it

    var transitionMs = state.bgTransitionMs || 1500;
    overlay.style.backgroundImage = target;
    void overlay.offsetWidth;
    overlay.classList.add('is-visible');

    setTimeout(function () {
      base.style.backgroundImage = target;
      base.style.opacity = '1';
      snapHidden(overlay);
    }, transitionMs + 60);
  }

  var MAX_BACKGROUND_IMAGES = 10;

  function setupBackgrounds() {
    var cfg = state.config.background;
    var transitionMs = Math.max(200, cfg.transitionMs || 1500);
    state.bgTransitionMs = transitionMs;
    document.documentElement.style.setProperty('--x1s-bg-transition', transitionMs + 'ms');

    if (!cfg.useCustomImage) return;

    var images = (Array.isArray(cfg.images) && cfg.images.length)
      ? cfg.images.filter(Boolean).slice(0, MAX_BACKGROUND_IMAGES)
      : (cfg.imagePath ? [cfg.imagePath] : []);
    if (!images.length) return;

    var idx = 0;
    el.bgPhotoBase.style.backgroundImage = 'url(' + images[idx] + ')';
    el.bgPhotoBase.style.opacity = '1';

    if (images.length < 2) return;

    var intervalMs = Math.max(4000, cfg.intervalMs || 20000);
    state.bgTimer = setInterval(function () {
      idx = (idx + 1) % images.length;
      crossfadeBackgroundTo(images[idx]);
    }, intervalMs);
  }

  function playIntro(onReveal) {
    var cfg = state.config.intro;
    el.logoPrimary.querySelector('img').src = cfg.primaryLogo;
    el.logoSecondary.querySelector('img').src = cfg.secondaryLogo;

    if (cfg.sound) {
      var introAudio = new Audio(cfg.sound);
      introAudio.volume = (typeof cfg.soundVolume === 'number') ? cfg.soundVolume : 0.8;
      introAudio.play().catch(function () {
      });
    }

    el.introFlare.classList.add('show');

    requestAnimationFrame(function () {
      el.logoPrimary.classList.add('enter');
    });

    setTimeout(function () {
      el.logoPrimary.classList.remove('enter');
      el.logoPrimary.classList.add('exit-left');
    }, cfg.primaryHoldMs);

    setTimeout(function () {
      el.logoSecondary.classList.add('enter-right');
    }, cfg.primaryHoldMs + cfg.transitionMs * 0.4);

    var toCornerAt = cfg.primaryHoldMs + cfg.transitionMs + cfg.secondaryHoldMs;
    setTimeout(function () {
      el.logoSecondary.classList.remove('enter-right');
      el.logoSecondary.classList.add('to-corner');
      el.introStage.style.transition = 'opacity ' + cfg.transitionMs + 'ms ease';
      el.introStage.classList.add('fade-out');
      el.mainScreen.classList.add('show');
      el.introFlare.classList.remove('show');
      if (typeof onReveal === 'function') onReveal();
    }, toCornerAt);

    setTimeout(function () {
      el.introStage.style.display = 'none';
      state.introDone = true;
      maybeFinish();
    }, toCornerAt + cfg.transitionMs + 120);
  }

  function setProgress(fraction) {
    var pct = Math.max(0, Math.min(100, Math.round(fraction * 100)));
    state.progress = pct;
    el.progressFill.style.width = pct + '%';
    el.progressGlow.style.left = pct + '%';
    el.loadingPct.textContent = pct + '%';
  }

  window.addEventListener('message', function (event) {
    var data = event.data || {};
    if (data.eventName === 'loadProgress' && typeof data.loadFraction === 'number') {
      setProgress(data.loadFraction);
    }
    if (data.eventName === 'onLogLine' && data.message) {

    }
    if (data.eventName === 'x1sResourcesReady') {
      setProgress(1);
      state.resourcesDone = true;
      maybeFinish();
    }
  });

  function fakeProgressForPreview() {
    if (isNui()) return;
    var f = 0;
    var t = setInterval(function () {
      f += 0.02 + Math.random() * 0.05;
      setProgress(f);
      if (f >= 1) {
        clearInterval(t);
        state.resourcesDone = true;
        maybeFinish();
      }
    }, 180);
  }

  function sendReadySignal(attemptsLeft) {
    fetch('https://' + getParentResourceName() + '/loadingScreenReady', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({})
    }).catch(function () {
      if (attemptsLeft > 0) {
        setTimeout(function () { sendReadySignal(attemptsLeft - 1); }, 250);
      }
    });
  }

  function maybeFinish() {
    if (!state.introDone || !state.resourcesDone) return;
    if (state.progress < 100) return;
    // Give the bar a beat to visually complete before handing off.
    setTimeout(function () {
      try {
        audio.pause();
        audio.src = '';
      } catch (e) { /* no-op */ }
      sendReadySignal(10);
    }, 350);
  }

  var audio = new Audio();

  function loadTrack(i) {
    var tracks = state.config.music.tracks;
    if (!tracks || !tracks.length) return;
    var t = tracks[(i + tracks.length) % tracks.length];
    state.trackIndex = (i + tracks.length) % tracks.length;
    el.musicTitle.textContent = t.title || 'Untitled';
    el.musicArtist.textContent = t.artist || '';
    audio.src = t.src;

    el.musicArtImg.style.opacity = '0';
    setTimeout(function () {
      el.musicArtImg.src = t.artwork || state.config.intro.secondaryLogo;
      el.musicArtImg.style.opacity = '1';
    }, 150);

    if (tracks.length > 1) {
      el.musicCount.textContent = (state.trackIndex + 1) + ' / ' + tracks.length;
    }
  }

  function formatTime(sec) {
    if (!isFinite(sec)) return '00:00';
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function setupMusic() {
    var music = state.config.music;
    if (!music.enabled || !music.tracks || !music.tracks.length) return;

    el.musicPanel.hidden = false;
    el.musicHint.hidden = false;
    el.musicControls.dataset.single = music.tracks.length > 1 ? 'false' : 'true';
    el.musicHint.textContent = music.tracks.length > 1
      ? 'SPACE TO PAUSE \u2022 \u2190 \u2192 TO CHANGE TRACK'
      : 'PRESS SPACE TO PAUSE MUSIC';
    loadTrack(0);

    el.musicToggle.addEventListener('click', toggleMusic);
    el.musicPrev.addEventListener('click', function () { loadTrack(state.trackIndex - 1); playMusic(); });
    el.musicNext.addEventListener('click', function () { loadTrack(state.trackIndex + 1); playMusic(); });

    audio.addEventListener('timeupdate', function () {
      if (!audio.duration) return;
      el.musicScrubFill.style.width = (audio.currentTime / audio.duration * 100) + '%';
      el.musicCurrent.textContent = formatTime(audio.currentTime);
      el.musicDuration.textContent = formatTime(audio.duration);
    });
    audio.addEventListener('ended', function () { loadTrack(state.trackIndex + 1); playMusic(); });

    document.addEventListener('keydown', function (e) {
      if (state.staffModalOpen) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggleMusic();
      } else if (music.tracks.length > 1 && e.code === 'ArrowRight') {
        loadTrack(state.trackIndex + 1); playMusic();
      } else if (music.tracks.length > 1 && e.code === 'ArrowLeft') {
        loadTrack(state.trackIndex - 1); playMusic();
      }
    });
  }

  function playMusic() {
    audio.play().then(function () {
      state.isPlaying = true;
      el.musicToggle.innerHTML = '&#10074;&#10074;';
    }).catch(function () {
      state.isPlaying = false;
    });
  }

  function toggleMusic() {
    if (state.isPlaying) {
      audio.pause();
      state.isPlaying = false;
      el.musicToggle.innerHTML = '&#9654;';
    } else {
      playMusic();
    }
  }

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    var first = parts[0] ? parts[0][0] : '';
    var last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase() || '?';
  }

  function buildStaffGrid(members) {
    el.staffGrid.innerHTML = '';
    if (!members || !members.length) {
      var empty = document.createElement('div');
      empty.className = 'staff-empty';
      empty.textContent = 'No staff members configured yet.';
      el.staffGrid.appendChild(empty);
      return;
    }

    members.forEach(function (m) {
      var card = document.createElement('div');
      card.className = 'staff-card';

      var avatar = document.createElement('div');
      avatar.className = 'staff-avatar';

      var initials = document.createElement('span');
      initials.className = 'staff-initials';
      initials.textContent = getInitials(m.name);
      avatar.appendChild(initials);

      if (m.photo) {
        var img = document.createElement('img');
        img.src = m.photo;
        img.alt = m.name || '';
        img.onerror = function () { img.style.display = 'none'; };
        avatar.appendChild(img);
      }

      var name = document.createElement('div');
      name.className = 'staff-name';
      name.textContent = m.name || 'Unnamed';

      var position = document.createElement('div');
      position.className = 'staff-position';
      position.textContent = m.position || '';

      card.appendChild(avatar);
      card.appendChild(name);
      card.appendChild(position);
      el.staffGrid.appendChild(card);
    });
  }

  function openStaffModal() {
    state.staffModalOpen = true;
    el.staffModal.hidden = false;
    requestAnimationFrame(function () { el.staffModal.classList.add('show'); });
  }

  function closeStaffModal() {
    el.staffModal.classList.remove('show');
    state.staffModalOpen = false;
    setTimeout(function () {
      if (!state.staffModalOpen) el.staffModal.hidden = true;
    }, 220);
  }

  function setupStaff() {
    var staff = state.config.staff;
    if (!staff.enabled) return;

    el.staffModalTitle.textContent = staff.title || 'STAFF & DEVELOPMENT TEAM';
    buildStaffGrid(staff.members);

    el.staffToggle.hidden = false;
    el.staffToggle.addEventListener('click', openStaffModal);
    el.staffModalClose.addEventListener('click', closeStaffModal);
    el.staffModalBackdrop.addEventListener('click', closeStaffModal);
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Escape' && state.staffModalOpen) closeStaffModal();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    el = {
      introStage: $('intro-stage'),
      introFlare: $('intro-flare'),
      logoPrimary: $('logo-primary'),
      logoSecondary: $('logo-secondary'),
      mainScreen: $('main-screen'),
      starsLayer: $('stars-layer'),
      infoTitle: $('info-title'),
      infoText: $('info-text'),
      progressFill: $('progress-fill'),
      progressGlow: $('progress-glow'),
      loadingPct: $('loading-pct'),
      musicPanel: $('music-panel'),
      musicHint: $('music-hint'),
      musicArtImg: $('music-art-img'),
      musicTitle: $('music-title'),
      musicArtist: $('music-artist'),
      musicControls: $('music-controls'),
      musicToggle: $('music-toggle'),
      musicPrev: $('music-prev'),
      musicNext: $('music-next'),
      musicCount: $('music-count'),
      musicScrubFill: $('music-scrub-fill'),
      musicCurrent: $('music-current'),
      musicDuration: $('music-duration'),
      bgPhotoBase: $('bg-photo-base'),
      bgPhotoOverlay: $('bg-photo-overlay'),
      staffToggle: $('staff-toggle'),
      staffModal: $('staff-modal'),
      staffModalBackdrop: $('staff-modal-backdrop'),
      staffModalClose: $('staff-modal-close'),
      staffModalTitle: $('staff-modal-title'),
      staffGrid: $('staff-grid'),
      brandPrimary: $('brand-primary'),
      brandSecondary: $('brand-secondary'),
      brandSubtitle: $('brand-subtitle')
    };

    loadConfig().then(function (cfg) {
      el.brandPrimary.textContent = cfg.brand.primaryText;
      el.brandSecondary.textContent = cfg.brand.secondaryText;
      el.brandSubtitle.textContent = cfg.brand.subtitle;
      el.infoTitle.textContent = cfg.info.title;
      el.infoText.textContent = cfg.info.text;

      buildStars(46);
      setupBackgrounds();
      setupMusic();
      setupStaff();
      playIntro(function () {
        if (state.config.music.enabled) playMusic();
      });
      fakeProgressForPreview();
    });
  });
})();
