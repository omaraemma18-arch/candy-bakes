(async function () {
  Partials.renderHeader('home');
  Partials.renderFooter();
  Partials.renderWhatsApp();

  const { api, formatUGX, escapeHtml } = window.App;
  const area = document.getElementById('featuredArea');
  const hero = document.getElementById('heroCarousel');

  function card(p) {
    return `
      <article class="cake-card featured-slide">
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

  function getDefaultHeroSlides() {
    return [
      {
        title: 'Cakes made properly, for your actual occasion',
        text: 'Custom birthday cakes, wedding cakes and celebration bakes made fresh for Boston and beyond.',
        cta: 'Order now',
        href: '/menu',
        secondary: 'See how it works',
        secondaryHref: '#how',
        image: '/images/new%20logo%20(2).jpg'
      },
      {
        title: 'Signature cakes for birthdays, weddings and gifting',
        text: 'From elegant buttercream designs to flavour-packed celebration cakes, we make every order feel personal.',
        cta: 'Browse cakes',
        href: '/menu',
        secondary: 'View details',
        secondaryHref: '#featured',
        image: '/images/new%20logo%20(2).jpg'
      },
      {
        title: 'Fresh pastries, custom bakes and last-minute treats',
        text: 'Create a sweeter moment with handcrafted pastries, cupcakes and fine celebration desserts made to order.',
        cta: 'Book a custom order',
        href: '/menu',
        secondary: 'Talk to us',
        secondaryHref: 'tel:0709992587',
        image: '/images/new%20logo%20(2).jpg'
      }
    ];
  }

  function renderHeroCarousel(slides) {
    if (!hero) return;

    let index = 0;
    let timer = null;

    const render = () => {
      const slide = slides[index];
      hero.innerHTML = `
        <div class="hero-slide active" style="background-image: linear-gradient(120deg, rgba(28,17,29,.8), rgba(59,30,55,.45)), url('${slide.image}');">
          <div class="hero-inner">
            <div class="hero-copy">
              <p class="hero-kicker">Candy Bakes and Pastries</p>
              <h1>${escapeHtml(slide.title)}</h1>
              <p class="hero-subtitle">${escapeHtml(slide.text)}</p>
              <div class="hero-actions">
                <a href="${slide.href}" class="btn btn-primary">${escapeHtml(slide.cta)}</a>
                <a href="${slide.secondaryHref}" class="btn btn-ghost hero-ghost">${escapeHtml(slide.secondary)}</a>
              </div>
            </div>
          </div>
        </div>
        <div class="hero-nav" aria-label="Hero slide navigation">
          <button type="button" class="hero-arrow prev" aria-label="Previous slide">‹</button>
          <div class="hero-dots">
            ${slides.map((_, i) => `<button type="button" class="hero-dot ${i === index ? 'active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>`).join('')}
          </div>
          <button type="button" class="hero-arrow next" aria-label="Next slide">›</button>
        </div>`;

      const prev = hero.querySelector('.hero-arrow.prev');
      const next = hero.querySelector('.hero-arrow.next');
      const dots = hero.querySelectorAll('.hero-dot');

      prev?.addEventListener('click', () => { index = (index - 1 + slides.length) % slides.length; render(); restartTimer(); });
      next?.addEventListener('click', () => { index = (index + 1) % slides.length; render(); restartTimer(); });
      dots.forEach((dot) => {
        dot.addEventListener('click', () => {
          index = Number(dot.dataset.index);
          render();
          restartTimer();
        });
      });
    };

    const startTimer = () => {
      clearInterval(timer);
      timer = setInterval(() => {
        index = (index + 1) % slides.length;
        render();
      }, 5000);
    };

    const restartTimer = () => {
      startTimer();
    };

    hero.addEventListener('mouseenter', () => clearInterval(timer));
    hero.addEventListener('mouseleave', startTimer);

    render();
    startTimer();
  }

  try {
    const { products } = await api('/api/products');

    const featured = products.filter((p) => p.featured);
    const show = (featured.length ? featured : products).slice(0, 3);

    const heroSlides = show.length
      ? show.map((p) => ({
          title: p.name,
          text: p.description.slice(0, 120) + (p.description.length > 120 ? '…' : ''),
          cta: 'Order now',
          href: `/product?cake=${encodeURIComponent(p.slug)}`,
          secondary: 'View menu',
          secondaryHref: '/menu',
          image: p.imageUrl,
        }))
      : getDefaultHeroSlides();

    renderHeroCarousel(heroSlides);

    if (!products.length) {
      area.innerHTML = `
        <div class="empty-state">
          <h3>The menu is being set up</h3>
          <p>Cakes will appear here as soon as they're added.</p>
        </div>`;
      return;
    }

    area.innerHTML = `<div class="cake-grid">${show.map(card).join('')}</div>`;
  } catch (err) {
    renderHeroCarousel(getDefaultHeroSlides());
    area.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
  }
})();
