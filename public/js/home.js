(async function () {
  Partials.renderHeader('home');
  Partials.renderFooter();

  const { api, formatUGX, escapeHtml } = window.App;
  const area = document.getElementById('featuredArea');

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
            <div class="price">${formatUGX(p.basePrice)}<small>from</small></div>
            <a class="btn btn-primary btn-sm" href="/product?cake=${encodeURIComponent(p.slug)}">Customise</a>
          </div>
        </div>
      </article>`;
  }

  try {
    const { products } = await api('/api/products');

    const hero = document.getElementById('heroArt');
    if (products.length && hero) {
      hero.innerHTML = `<img src="${escapeHtml(products[0].imageUrl)}" alt="${escapeHtml(products[0].name)}">`;
    }

    if (!products.length) {
      area.innerHTML = `
        <div class="empty-state">
          <h3>The menu is being set up</h3>
          <p>Cakes will appear here as soon as they're added.</p>
        </div>`;
      return;
    }

    const featured = products.filter((p) => p.featured);
    const show = (featured.length ? featured : products).slice(0, 3);
    area.innerHTML = `<div class="cake-grid">${show.map(card).join('')}</div>`;
  } catch (err) {
    area.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
  }
})();
