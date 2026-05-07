(function () {
  const toggle = document.querySelector('[data-menu-toggle]');
  const topnav = document.querySelector('[data-topnav]');
  const sidebar = document.querySelector('[data-sidebar]');
  const topbarInner = document.querySelector('.topbar-inner');
  const desktopQuery = window.matchMedia('(min-width: 1024px)');
  const current = location.pathname.split('/').pop() || 'index.html';
  let activeLink = null;

  ensureSponsorNavigation();
  ensureResponsiveTables();

  document.querySelectorAll('.sidebar a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === current) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
      activeLink = link;
    }
  });

  const pageTitle = document.createElement('span');
  pageTitle.className = 'page-title';
  pageTitle.textContent = activeLink?.textContent?.trim() || document.title.replace(' - OpenSyntax Docs', '');
  if (topbarInner && toggle) topbarInner.insertBefore(pageTitle, toggle);

  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.hidden = true;
  document.body.appendChild(overlay);

  if (sidebar && !sidebar.querySelector('.drawer-header')) {
    const header = document.createElement('div');
    header.className = 'drawer-header';
    header.innerHTML = '<strong>Documentation</strong><button class="drawer-close" type="button">Close</button>';
    sidebar.prepend(header);
  }

  const closeButton = sidebar?.querySelector('.drawer-close');

  if (toggle && sidebar) {
    toggle.innerHTML = '<span class="menu-toggle-line" aria-hidden="true"></span>';
    toggle.setAttribute('aria-label', 'Open documentation menu');
    toggle.setAttribute('aria-controls', 'docs-sidebar');
    toggle.setAttribute('aria-expanded', 'false');
    sidebar.id = sidebar.id || 'docs-sidebar';

    toggle.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) closeDrawer();
      else openDrawer();
    });

    overlay.addEventListener('click', closeDrawer);
    closeButton?.addEventListener('click', closeDrawer);

    sidebar.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (!desktopQuery.matches) closeDrawer();
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && sidebar.classList.contains('open')) closeDrawer();
    });

    desktopQuery.addEventListener('change', (event) => {
      if (event.matches) closeDrawer();
    });
  }

  topnav?.classList.remove('open');

  document.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    if (!code) return;
    const button = document.createElement('button');
    button.className = 'copy-button';
    button.type = 'button';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Select code';
      }
      setTimeout(() => { button.textContent = 'Copy'; }, 1400);
    });
    pre.appendChild(button);
  });

  function openDrawer() {
    if (!toggle || !sidebar) return;
    sidebar.classList.add('open');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('open'));
    document.body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close documentation menu');
    setTimeout(() => closeButton?.focus(), 80);
  }

  function closeDrawer() {
    if (!toggle || !sidebar) return;
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open documentation menu');
    setTimeout(() => {
      if (!overlay.classList.contains('open')) overlay.hidden = true;
    }, 200);
  }

  function ensureSponsorNavigation() {
    addLink(document.querySelector('[data-topnav]'), 'Sponsors', 'sponsors.html', 'GitHub');
    addLink(document.querySelector('[data-sidebar]'), 'Sponsors', 'sponsors.html');
    document.querySelectorAll('.footer-links').forEach((footer) => addLink(footer, 'Sponsors', 'sponsors.html'));
  }

  function ensureResponsiveTables() {
    document.querySelectorAll('table').forEach((table) => {
      if (table.parentElement?.classList.contains('table')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'table';
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  function addLink(container, label, href, beforeLabel) {
    if (!container || container.querySelector(`a[href="${href}"]`)) return;
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    if (beforeLabel) {
      const before = Array.from(container.querySelectorAll('a')).find((item) => item.textContent?.trim() === beforeLabel);
      if (before) { container.insertBefore(link, before); return; }
    }
    container.appendChild(link);
  }
})();
