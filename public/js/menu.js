(function () {
  Partials.renderHeader('menu');
  Partials.renderFooter();

  const { api, formatUGX, escapeHtml } = window.App;
  const area = document.getElementById('menuArea');
  const searchInput = document.getElementById('searchInput');
  const buttons = document.querySelectorAll('.filter-btn');

  let category = new URLSearchParams(location.search).get('category') || 'all';
  let debounce = null;

  function card(p) {
    return `
      <article class="cake-card">
        <a class="cake-photo" href="/product?cake=${encodeURIComponent(p.slug)}">
          <img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" loading="lazy">
        </a>
        <div class="cake-body">
          <div class="cake-cat">${escapeHtml(p.category)}</div>
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.description.slice(0, 130))}${p.description.length > 130 ? '…' : ''}</p>
          <div class="cake-foot">
            <div class="price">${formatUGX(p.basePrice)}<small>from · ${p.leadTimeDays} days' notice</small></div>
            <a class="btn btn-primary btn-sm" href="/product?cake=${encodeURIComponent(p.slug)}">Customise</a>
          </div>
        </div>
      </article>`;
  }

  async function load() {
    area.innerHTML = '<div class="spinner"></div>';
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (searchInput.value.trim()) params.set('search', searchInput.value.trim());

    try {
      const { products } = await api('/api/products?' + params.toString());
      if (!products.length) {
        area.innerHTML = `
          <div class="empty-state">
            <h3>Nothing matches that</h3>
            <p>Try another category, or clear your search.</p>
          </div>`;
        return;
      }
      area.innerHTML = `<div class="cake-grid">${products.map(card).join('')}</div>`;
    } catch (err) {
      area.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
    }
  }

  buttons.forEach((b) => {
    b.classList.toggle('active', b.dataset.category === category);
    b.addEventListener('click', () => {
      category = b.dataset.category;
      buttons.forEach((x) => x.classList.toggle('active', x === b));
      history.replaceState(null, '', category === 'all' ? '/menu' : `/menu?category=${category}`);
      load();
    });
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(load, 280);
  });

  load();
})();
