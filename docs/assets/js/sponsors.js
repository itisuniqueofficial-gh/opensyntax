window.OPENSYNTAX_SPONSORS = {
  current: [
    {
      name: 'It Is Unique Official',
      tier: 'Founding Steward',
      url: 'https://itisuniqueofficial.com/',
      logo: '',
      note: 'Supporting OpenSyntax development, documentation, infrastructure, and release automation.'
    }
  ],
  previous: []
};

(function () {
  const data = window.OPENSYNTAX_SPONSORS || {current: [], previous: []};
  renderSponsorCards('current-sponsors', data.current, 'Current sponsors will appear here as support grows.');
  renderSponsorCards('previous-sponsors', data.previous, 'Previous sponsors will be archived here with thanks and attribution.');

  function renderSponsorCards(id, sponsors, emptyText) {
    const root = document.getElementById(id);
    if (!root) return;
    if (!sponsors.length) {
      root.innerHTML = `<article class="sponsor-card sponsor-empty"><h3>No entries yet</h3><p>${emptyText}</p></article>`;
      return;
    }
    root.innerHTML = sponsors.map((sponsor) => sponsorCard(sponsor)).join('');
  }

  function sponsorCard(sponsor) {
    const logo = sponsor.logo ? `<img src="${escapeHtml(sponsor.logo)}" alt="" class="sponsor-logo" loading="lazy">` : `<div class="sponsor-logo-fallback" aria-hidden="true">${initials(sponsor.name)}</div>`;
    const meta = sponsor.period ? `<span>${escapeHtml(sponsor.period)}</span>` : `<span>${escapeHtml(sponsor.tier || 'Sponsor')}</span>`;
    return `<article class="sponsor-card">
      <div class="sponsor-card-header">${logo}<div><h3>${escapeHtml(sponsor.name)}</h3>${meta}</div></div>
      <p>${escapeHtml(sponsor.note || 'Thank you for supporting OpenSyntax.')}</p>
      <a href="${escapeHtml(sponsor.url)}" aria-label="Visit ${escapeHtml(sponsor.name)}" rel="noopener noreferrer">Visit sponsor</a>
    </article>`;
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'OS';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[char]));
  }
})();
