/* =========================================================
   Cumple de Alexis — interacción, animación y confeti
   ========================================================= */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  const dom = {
    body: document.body,
    overlay: document.getElementById('entryOverlay'),
    form: document.getElementById('entryForm'),
    input: document.getElementById('guestName'),
    error: document.getElementById('entryError'),
    banner: document.getElementById('welcomeBanner'),
    card: document.getElementById('birthdayCard'),
    tilt: document.getElementById('cardTilt'),
    stage: document.querySelector('.card-stage'),
    share: document.getElementById('shareButton'),
    musicToggle: document.getElementById('musicToggle'),
    audio: document.getElementById('birthdayMusic'),
    bokeh: document.getElementById('bokehLayer'),
  };

  /* -------------------------------------------------------
     1. Confeti con física (canvas)
     ------------------------------------------------------- */
  const Confetti = (() => {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    const COLORS = [
      '#f5d68a', '#d7a952', '#ffd166', '#ff6ea6', '#75d2ff',
      '#b37dff', '#8de6b6', '#f5e6d0', '#ffffff',
    ];
    const SHAPES = ['rect', 'ribbon', 'circle', 'star'];

    let width = 0;
    let height = 0;
    let parts = [];
    let raf = null;
    let last = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function make(x, y, opts) {
      const angle = opts.angle + (Math.random() - 0.5) * opts.spread;
      const speed = opts.power * (0.45 + Math.random() * 0.75);
      const shape = SHAPES[(Math.random() * SHAPES.length) | 0];
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: opts.gravity * (0.8 + Math.random() * 0.5),
        drag: 0.985,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.35,
        wob: 0.04 + Math.random() * 0.05,
        sway: 0.6 + Math.random() * 1.4,
        size: shape === 'ribbon' ? 6 + Math.random() * 5 : 5 + Math.random() * 7,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        shape,
        age: 0,
        life: opts.life * (0.75 + Math.random() * 0.6),
      };
    }

    function burst(x, y, opts = {}) {
      if (reduceMotion.matches) return;
      const o = Object.assign(
        {
          count: 70,
          power: 13,
          angle: -Math.PI / 2,
          spread: Math.PI * 0.9,
          gravity: 0.36,
          life: 150,
        },
        opts
      );
      for (let i = 0; i < o.count; i += 1) parts.push(make(x, y, o));
      start();
    }

    function rain(count = 80) {
      if (reduceMotion.matches) return;
      const o = {
        count,
        power: 0,
        angle: Math.PI / 2,
        spread: 0,
        gravity: 0.12,
        life: 320,
      };
      for (let i = 0; i < o.count; i += 1) {
        const p = make(-40 + Math.random() * (width + 80), -30 - Math.random() * height * 0.7, o);
        p.vx = (Math.random() - 0.5) * 1.6;
        p.vy = 1.6 + Math.random() * 3;
        p.gravity = 0.05 + Math.random() * 0.07;
        p.age = -Math.random() * 120; // aparece escalonado
        parts.push(p);
      }
      start();
    }

    function star(c, r) {
      c.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const rad = i % 2 ? r * 0.45 : r;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
      c.fill();
    }

    function draw(p, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.scale(1, Math.max(0.15, Math.abs(Math.cos(p.rot * 0.6))));
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      } else if (p.shape === 'ribbon') {
        ctx.scale(1, Math.max(0.12, Math.abs(Math.cos(p.rot * 0.5))));
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size * 0.35);
        ctx.quadraticCurveTo(0, p.size * 0.55, p.size, -p.size * 0.35);
        ctx.quadraticCurveTo(0, p.size * 0.1, -p.size, -p.size * 0.35);
        ctx.fill();
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        star(ctx, p.size * 0.75);
      }
      ctx.restore();
    }

    function loop(now) {
      const dt = Math.min((now - last) / 16.67, 3) || 1;
      last = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i];
        p.age += dt;
        if (p.age < 0) continue;

        p.vy += p.gravity * dt;
        p.vx *= Math.pow(p.drag, dt);
        p.x += p.vx * dt + Math.sin(p.age * p.wob) * p.sway * dt * 0.4;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;

        const progress = p.age / p.life;
        if (progress >= 1 || p.y - 60 > height) {
          parts.splice(i, 1);
          continue;
        }
        draw(p, progress > 0.75 ? (1 - progress) / 0.25 : 1);
      }

      if (parts.length) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
        ctx.clearRect(0, 0, width, height);
      }
    }

    function start() {
      if (raf === null && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      } else if (!document.hidden && parts.length) {
        start();
      }
    });

    window.addEventListener('resize', resize);
    resize();

    return { burst, rain };
  })();

  /* -------------------------------------------------------
     2. Burbujas / brillitas de fondo
     ------------------------------------------------------- */  (function buildBokeh() {
    if (!dom.bokeh) return;
    const tones = [
      'rgba(255,214,120,0.95)',
      'rgba(117,210,255,0.9)',
      'rgba(255,110,166,0.9)',
      'rgba(179,125,255,0.85)',
      'rgba(141,230,182,0.85)',
    ];
    const frag = document.createDocumentFragment();

    for (let i = 0; i < 20; i += 1) {
      const el = document.createElement('span');
      const isStar = i % 3 === 0;
      const size = isStar ? 10 + Math.random() * 14 : 8 + Math.random() * 26;
      el.className = 'bubble' + (isStar ? ' is-star' : '');
      el.style.setProperty('--x', (Math.random() * 96).toFixed(2) + '%');
      el.style.setProperty('--y', (12 + Math.random() * 84).toFixed(2) + '%');
      el.style.setProperty('--size', size.toFixed(1) + 'px');
      el.style.setProperty('--tone', tones[i % tones.length]);
      el.style.setProperty('--alpha', (0.2 + Math.random() * 0.4).toFixed(2));
      el.style.setProperty('--blur', (Math.random() * 4).toFixed(1) + 'px');
      el.style.setProperty('--dur', (7 + Math.random() * 9).toFixed(1) + 's');
      el.style.setProperty('--delay', (Math.random() * -12).toFixed(1) + 's');
      if (isStar) {
        el.textContent = '✦';
        el.style.color = tones[i % tones.length];
      }
      frag.appendChild(el);
    }
    dom.bokeh.appendChild(frag);
  })();

  /* -------------------------------------------------------
     2b. Piezas de confeti y estrellas (compartido)
     ------------------------------------------------------- */
  function buildPieces(holder, config) {
    if (!holder) return;

    const frag = document.createDocumentFragment();

    for (let i = 0; i < config.count; i += 1) {
      const shape = config.shapes[i % config.shapes.length];
      const piece = document.createElement('span');
      piece.className =
        'entry-piece' +
        (shape === 'star' ? ' is-star' : shape === 'circle' ? ' is-circle' : '');

      piece.style.setProperty('--x', (Math.random() * 100).toFixed(2) + '%');
      piece.style.setProperty('--tone', config.tones[i % config.tones.length]);
      piece.style.setProperty('--w', (7 + Math.random() * 8).toFixed(1) + 'px');
      piece.style.setProperty(
        '--h',
        (shape === 'ribbon' ? 14 + Math.random() * 12 : 9 + Math.random() * 8).toFixed(1) + 'px'
      );
      piece.style.setProperty('--radius', shape === 'ribbon' ? '60%' : '3px');
      piece.style.setProperty(
        '--fs',
        (config.fsMin + Math.random() * (config.fsMax - config.fsMin)).toFixed(0) + 'px'
      );
      piece.style.setProperty('--drift', ((Math.random() - 0.5) * 170).toFixed(0) + 'px');
      piece.style.setProperty('--spin', (360 + Math.random() * 720).toFixed(0) + 'deg');
      piece.style.setProperty(
        '--dur',
        (config.durMin + Math.random() * (config.durMax - config.durMin)).toFixed(1) + 's'
      );
      piece.style.setProperty('--delay', (-Math.random() * config.durMax).toFixed(1) + 's');

      if (shape === 'star') piece.textContent = i % 2 ? '★' : '✦';
      frag.appendChild(piece);
    }

    holder.appendChild(frag);
  }

  // Fondo animado de la pantalla de ingreso
  buildPieces(document.getElementById('entryCeleb'), {
    count: 34,
    shapes: ['rect', 'ribbon', 'circle', 'star'],
    tones: ['#ff6ea6', '#75d2ff', '#f5d68a', '#b37dff', '#8de6b6', '#ffd166', '#f5e6d0'],
    fsMin: 13,
    fsMax: 25,
    durMin: 7,
    durMax: 15,
  });

  // Lluvia de estrellas en la página principal
  buildPieces(document.getElementById('starsRain'), {
    count: 36,
    shapes: ['star', 'star', 'star', 'circle', 'star', 'ribbon'],
    tones: ['#f5d68a', '#fff6df', '#75d2ff', '#ffd166', '#ff9dc2', '#ffffff'],
    fsMin: 14,
    fsMax: 32,
    durMin: 13,
    durMax: 27,
  });

  /* -------------------------------------------------------
     2c. Cuenta regresiva hacia el cumple
     ------------------------------------------------------- */
  (function countdown() {
    const box = document.getElementById('countdown');
    if (!box) return;

    const days = document.getElementById('cdDays');
    const hours = document.getElementById('cdHours');
    const mins = document.getElementById('cdMins');
    // Sábado 14 de noviembre de 2026, 16:00 (Argentina)
    const target = new Date('2026-11-14T16:00:00-03:00').getTime();
    // Fin del cumple: medianoche del mismo día (para el mensaje posterior)
    const endOfDay = new Date('2026-11-15T03:59:59-03:00').getTime();
    const pad = (n) => String(n).padStart(2, '0');
    let timer = null;

    function tick() {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        // Llegó la fecha: separamos "hoy es el día" de "ya pasó"
        box.classList.toggle('is-past', now > endOfDay);
        box.classList.toggle('is-today', now <= endOfDay);
        days.textContent = '0';
        hours.textContent = '00';
        mins.textContent = '00';
        // Sigue refrescando por si el visitante deja la pestaña abierta
        return;
      }

      days.textContent = Math.floor(diff / 86400000);
      hours.textContent = pad(Math.floor((diff % 86400000) / 3600000));
      mins.textContent = pad(Math.floor((diff % 3600000) / 60000));
    }

    tick();
    timer = setInterval(tick, 30000);
  })();

  /* -------------------------------------------------------
     3. Parallax suave con el puntero
     ------------------------------------------------------- */
  if (finePointer.matches && !reduceMotion.matches) {
    let px = 0;
    let py = 0;
    window.addEventListener(
      'pointermove',
      (event) => {
        px = event.clientX / window.innerWidth - 0.5;
        py = event.clientY / window.innerHeight - 0.5;
        document.documentElement.style.setProperty('--px', px.toFixed(3));
        document.documentElement.style.setProperty('--py', py.toFixed(3));
      },
      { passive: true }
    );
  }

  /* -------------------------------------------------------
     4. Inclinación 3D de la tarjeta + destello
     ------------------------------------------------------- */
  if (dom.stage && dom.tilt && dom.card && finePointer.matches) {
    const resetTilt = () => {
      dom.tilt.style.setProperty('--rx', '0deg');
      dom.tilt.style.setProperty('--ry', '0deg');
    };

    dom.stage.addEventListener('pointermove', (event) => {
      const r = dom.stage.getBoundingClientRect();
      const nx = (event.clientX - r.left) / r.width - 0.5;
      const ny = (event.clientY - r.top) / r.height - 0.5;
      dom.tilt.style.setProperty('--ry', (nx * 17).toFixed(2) + 'deg');
      dom.tilt.style.setProperty('--rx', (-ny * 13).toFixed(2) + 'deg');
      dom.card.style.setProperty('--gx', ((nx + 0.5) * 100).toFixed(1) + '%');
      dom.card.style.setProperty('--gy', ((ny + 0.5) * 100).toFixed(1) + '%');
    });

    dom.stage.addEventListener('pointerleave', resetTilt);
  }

  /* -------------------------------------------------------
     5. Giro de la tarjeta + explosión de confeti
     ------------------------------------------------------- */
  function flipCard() {
    if (!dom.card) return;
    dom.card.classList.toggle('is-flipped');
    const flipped = dom.card.classList.contains('is-flipped');
    dom.card.setAttribute('aria-pressed', String(flipped));

    if (dom.stage && !reduceMotion.matches) {
      const r = dom.stage.getBoundingClientRect();
      Confetti.burst(r.left + r.width / 2, r.top + r.height / 2, {
        count: flipped ? 80 : 45,
        power: flipped ? 14 : 10,
        life: 170,
      });
    }
  }

  if (dom.card) {
    dom.card.addEventListener('click', flipCard);
    dom.card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        flipCard();
      }
    });
  }

  // Los botones de la parte trasera no deben voltear la tarjeta
  document.querySelectorAll('.back-actions a, .back-actions button').forEach((el) => {
    el.addEventListener('click', (event) => event.stopPropagation());
  });

  /* -------------------------------------------------------
     6. Banner de bienvenida letra a letra
     ------------------------------------------------------- */
  function buildBanner(name) {
    if (!dom.banner) return;
    const before = 'Hola ';
    const after = ' te invitamos al cumple de Alexis';
    const message = before + name + after;

    dom.banner.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = message;
    dom.banner.appendChild(sr);

    let index = 0;
    const addChars = (text, isName) => {
      const words = text.split(/(\s+)/);

      words.forEach((chunk) => {
        if (!chunk) return;

        if (/^\s+$/.test(chunk)) {
          // Espacio real: mantiene los saltos de línea entre palabras
          dom.banner.appendChild(document.createTextNode(chunk));
          return;
        }

        // Una palabra completa: nunca se corta a mitad
        const word = document.createElement('span');
        word.className = 'word';
        word.setAttribute('aria-hidden', 'true');

        chunk.split('').forEach((ch) => {
          const span = document.createElement('span');
          span.className = 'char' + (isName ? ' is-gold' : '');
          span.style.setProperty('--i', String(index));
          span.textContent = ch;
          word.appendChild(span);
          index += 1;
        });

        dom.banner.appendChild(word);
      });
    };

    addChars(before, false);
    addChars(name.toUpperCase(), true);
    addChars(after, false);
  }

  /* -------------------------------------------------------
     7. Música con fundido y control
     ------------------------------------------------------- */
  const audio = dom.audio;
  const musicToggle = dom.musicToggle;
  let fadeTimer = null;
  const TARGET_VOLUME = 0.55;

  function syncMusicUI() {
    if (!musicToggle || !audio) return;
    const playing = !audio.paused;
    musicToggle.classList.toggle('is-playing', playing);
    musicToggle.setAttribute('aria-pressed', String(playing));
    musicToggle.setAttribute('aria-label', playing ? 'Pausar la música' : 'Reproducir la música');
  }

  function fadeTo(target, duration = 1000) {
    if (!audio) return;
    clearInterval(fadeTimer);
    const from = audio.volume;
    const started = performance.now();
    fadeTimer = setInterval(() => {
      const t = Math.min((performance.now() - started) / duration, 1);
      audio.volume = from + (target - from) * t;
      if (t >= 1) clearInterval(fadeTimer);
    }, 40);
  }

  function startMusic() {
    if (!audio) return;
    audio.volume = 0;
    const attempt = audio.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => syncMusicUI());
    }
    fadeTo(TARGET_VOLUME, 1400);
    syncMusicUI();
  }

  if (musicToggle && audio) {
    musicToggle.addEventListener('click', () => {
      if (audio.paused) {
        audio.volume = 0;
        audio.play().then(() => fadeTo(TARGET_VOLUME, 900)).catch(() => {});
      } else {
        fadeTo(0, 500);
        setTimeout(() => {
          audio.pause();
          syncMusicUI();
        }, 500);
      }
      syncMusicUI();
    });

    audio.addEventListener('play', syncMusicUI);
    audio.addEventListener('pause', syncMusicUI);
    audio.addEventListener('ended', syncMusicUI);
  }

  /* -------------------------------------------------------
     8. Compartir
     ------------------------------------------------------- */
  if (dom.share) {
    dom.share.addEventListener('click', async () => {
      const text = '¡Te invito al cumple de Alexis! 🎉🎂';
      const data = { title: 'Feliz Cumpleaños Alexis', text, url: location.href };
      try {
        if (navigator.share) {
          await navigator.share(data);
        } else {
          window.open(
            'https://wa.me/?text=' + encodeURIComponent(text + ' ' + location.href),
            '_blank',
            'noopener'
          );
        }
      } catch (err) {
        /* el usuario canceló */
      }
    });
  }

  /* -------------------------------------------------------
     9. Ingreso a la invitación
     ------------------------------------------------------- */
  function showEntry() {
    dom.body.classList.remove('entry-mode');
    dom.body.classList.add('is-entered');

    dom.overlay.classList.add('hidden');
    setTimeout(() => {
      dom.overlay.setAttribute('aria-hidden', 'true');
      if ('inert' in HTMLElement.prototype) dom.overlay.inert = true;
    }, 700);

    startMusic();

    if (!reduceMotion.matches) {
      setTimeout(() => Confetti.rain(70), 420);
      setTimeout(() => {
        Confetti.burst(window.innerWidth * 0.12, window.innerHeight * 0.35, {
          count: 45,
          power: 15,
          angle: Math.PI * 0.28,
          spread: Math.PI * 0.5,
        });
        Confetti.burst(window.innerWidth * 0.88, window.innerHeight * 0.35, {
          count: 45,
          power: 15,
          angle: Math.PI * 0.72,
          spread: Math.PI * 0.5,
        });
      }, 750);
    }

    // No enfocamos la tarjeta automáticamente: así no aparece el anillo de
    // foco (que parecía un marco). Con el teclado se llega con Tab.
  }

  function handleSubmit(event) {
    event.preventDefault();
    const name = (dom.input.value || '').trim();

    if (!name) {
      dom.error.textContent = 'Escribí tu nombre para continuar';
      dom.input.focus();
      return;
    }

    dom.error.textContent = '';
    buildBanner(name);
    showEntry();
  }

  if (dom.form) {
    dom.form.addEventListener('submit', handleSubmit);
  }

  if (dom.input) {
    dom.input.addEventListener('input', () => {
      if (dom.error.textContent) dom.error.textContent = '';
    });
    window.addEventListener('load', () => dom.input.focus({ preventScroll: true }));
  }
})();
