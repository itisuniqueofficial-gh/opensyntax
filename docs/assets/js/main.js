(function () {
  const toggle = document.querySelector('[data-menu-toggle]');
  const topnav = document.querySelector('[data-topnav]');
  const sidebar = document.querySelector('[data-sidebar]');

  if (toggle) {
    toggle.addEventListener('click', () => {
      topnav?.classList.toggle('open');
      sidebar?.classList.toggle('open');
      toggle.setAttribute('aria-expanded', topnav?.classList.contains('open') ? 'true' : 'false');
    });
  }

  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === current) link.classList.add('active');
  });

  document.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    if (!code) return;
    const button = document.createElement('button');
    button.className = 'copy-button';
    button.type = 'button';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(code.innerText);
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 1400);
    });
    pre.appendChild(button);
  });
})();
