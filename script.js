const dialog = document.querySelector('#figure-dialog');
const dialogImage = document.querySelector('#dialog-image');
const dialogTitle = document.querySelector('#dialog-title');
const originalFigure = document.querySelector('#original-figure');
let figureTrigger = null;

// Both links remain usable when GitHub's public API is unavailable.
const starLinks = [...document.querySelectorAll('[data-star-link]')];
if (starLinks.length) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  fetch('https://api.github.com/repos/rsi-gear/gear', {
    headers: { Accept: 'application/vnd.github+json' },
    credentials: 'omit',
    signal: controller.signal,
  }).then(response => response.ok ? response.json() : null).then(repository => {
    const count = repository?.stargazers_count;
    if (!Number.isSafeInteger(count) || count < 0) return;
    starLinks.forEach(link => {
      const label = link.querySelector('[data-star-count]');
      label.textContent = count.toLocaleString('en-US');
      label.hidden = false;
      link.setAttribute('aria-label', `Star GEAR on GitHub · ${count.toLocaleString('en-US')} stars`);
    });
  }).catch(() => {}).finally(() => clearTimeout(timeout));
}

document.querySelectorAll('[data-figure]').forEach(button => {
  button.addEventListener('click', () => {
    figureTrigger = button;
    dialogImage.src = button.dataset.figure;
    dialogImage.alt = button.closest('figure')?.querySelector('img')?.alt || button.dataset.title;
    dialogTitle.textContent = button.dataset.title;
    originalFigure.href = button.dataset.figure;
    dialog.showModal();
    document.body.classList.add('modal-open');
  });
});

document.querySelector('#close-figure').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  figureTrigger?.focus({ preventScroll: true });
});

const copyButton = document.querySelector('#copy-citation');
const copyStatus = document.querySelector('#copy-status');
copyButton.addEventListener('click', async () => {
  const citation = document.querySelector('#citation-text').textContent;
  try {
    await navigator.clipboard.writeText(citation);
    copyButton.textContent = 'Copied ✓';
    copyStatus.textContent = 'BibTeX copied to clipboard.';
    setTimeout(() => { copyButton.textContent = 'Copy BibTeX'; }, 2400);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#citation-text'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    copyStatus.textContent = 'Citation selected. Press Ctrl+C or ⌘C to copy.';
  }
});

const navigationLinks = [...document.querySelectorAll('nav a')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        for (const link of navigationLinks) {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        }
      }
    }
  }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
  navigationLinks.forEach(link => {
    const target = document.querySelector(link.hash);
    if (target) observer.observe(target);
  });
}

// Remotion renders stay portable: native video playback, with site-level controls.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const animationStates = [];
const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

document.querySelectorAll('[data-animation]').forEach(panel => {
  const video = panel.querySelector('video');
  const play = panel.querySelector('.play-animation');
  const replay = panel.querySelector('.replay-animation');
  const scrubber = panel.querySelector('.animation-scrubber');
  const timer = panel.querySelector('.animation-time');
  const phases = [...panel.querySelectorAll('[data-phase]')];
  const state = { video, inView: false, userPaused: false, userStarted: false };
  animationStates.push(state);
  video.muted = true;
  video.controls = false;

  const update = () => {
    play.textContent = video.paused ? 'Play' : 'Pause';
    play.setAttribute('aria-label', `${video.paused ? 'Play' : 'Pause'} animation`);
    const progress = video.duration ? video.currentTime / video.duration : 0;
    scrubber.value = String(Math.round(progress * 1000));
    timer.textContent = formatTime(video.currentTime);
    scrubber.setAttribute('aria-valuetext', `${formatTime(video.currentTime)} of ${formatTime(Number.isFinite(video.duration) ? video.duration : 0)}`);
    const current = phases.reduce((active, phase) => progress >= Number(phase.dataset.phase) ? phase : active, phases[0]);
    phases.forEach(phase => {
      if (phase === current) phase.setAttribute('aria-current', 'step');
      else phase.removeAttribute('aria-current');
    });
  };

  const start = () => video.play().catch(() => update());
  play.addEventListener('click', () => {
    state.userStarted = true;
    state.userPaused = !video.paused;
    if (video.paused) start();
    else video.pause();
  });
  replay.addEventListener('click', () => {
    state.userStarted = true;
    state.userPaused = false;
    video.currentTime = 0;
    start();
  });
  phases.forEach(phase => phase.addEventListener('click', () => {
    if (!Number.isFinite(video.duration)) return;
    state.userStarted = true;
    state.userPaused = false;
    video.currentTime = Number(phase.dataset.phase) * video.duration;
    start();
    update();
  }));
  scrubber.addEventListener('input', () => {
    if (!Number.isFinite(video.duration)) return;
    state.userPaused = true;
    video.pause();
    video.currentTime = Number(scrubber.value) / 1000 * video.duration;
    update();
  });
  ['play', 'pause', 'timeupdate', 'loadedmetadata', 'seeked'].forEach(event => video.addEventListener(event, update));
  video.addEventListener('error', () => {
    panel.querySelector('.animation-error').hidden = false;
    play.disabled = true;
    replay.disabled = true;
    scrubber.disabled = true;
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      state.inView = entries[0].isIntersecting;
      if (state.inView && !state.userPaused && !document.hidden && (!reducedMotion.matches || state.userStarted)) start();
      else video.pause();
    }, { threshold: .15 });
    observer.observe(video);
  }
  update();
});

document.addEventListener('visibilitychange', () => {
  animationStates.forEach(state => {
    if (document.hidden) state.video.pause();
    else if (state.inView && !state.userPaused && (!reducedMotion.matches || state.userStarted)) state.video.play().catch(() => {});
  });
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) animationStates.forEach(state => state.video.pause());
});

const policyContent = {
  parent: {
    stage: '01 / Diagnose', name: 'Parent selection',
    description: 'Choose which archived harness to improve next. Staged GEPA uses task-level fronts to retain useful specialists and sample parents from the frozen archive.',
    input: 'Frozen archive, champion, task-level evidence', output: 'A parent harness for candidate generation',
  },
  proposal: {
    stage: '02 / Evolve', name: 'Proposal planning',
    description: 'Turn shared failure diagnosis into a repair hypothesis. Declare the editable paths, task scope, and budget before mutation. The runtime executes the workplan and seals the resulting revision.',
    input: 'Parent trajectories, failure diagnosis, authorized edit scope', output: 'A workplan with hypothesis, edit paths, task scope, and budget',
  },
  sampling: {
    stage: '03 / Evaluate', name: 'Task sampling',
    description: 'Decide where to spend evaluation effort. Local scopes target failure families; a common bridge enables paired comparisons before full-seed evaluation of nominated candidates. Candidate budgets at all three stages are configurable hyperparameters.',
    input: 'Seed tasks, parent evidence, frozen scope, evaluation budget', output: 'Local scopes, a shared bridge, and full-seed coverage',
  },
  scoring: {
    stage: '03 / Evaluate', name: 'Scoring rule',
    description: 'Specify how execution evidence is measured. Preserve raw outcome and process metrics alongside the declared optimization objective, so candidate comparisons remain inspectable.',
    input: 'Verified task outcomes, process evidence, declared objective', output: 'Comparable candidate measurements with their original units',
  },
  ranking: {
    stage: '04 / Promote', name: 'Candidate ranking',
    description: 'Rank candidates using a weighted aggregate of multiple metrics. For example, combine task pass rate and token consumption to reward higher success rates and lower token usage.',
    input: 'Candidate metrics, normalization rules, and aggregation weights', output: 'Weighted aggregate scores and ranked candidates',
  },
};
const policyTabs = [...document.querySelectorAll('[data-policy]')];
const choosePolicy = tab => {
  const content = policyContent[tab.dataset.policy];
  policyTabs.forEach(item => {
    item.setAttribute('aria-selected', String(item === tab));
    item.tabIndex = item === tab ? 0 : -1;
  });
  document.querySelector('#policy-panel').setAttribute('aria-labelledby', tab.id);
  for (const field of ['stage', 'name', 'description', 'input', 'output']) {
    document.querySelector(`#policy-${field}`).textContent = content[field];
  }
};
policyTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => choosePolicy(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % policyTabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + policyTabs.length) % policyTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = policyTabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    choosePolicy(policyTabs[next]);
    policyTabs[next].focus();
  });
});
