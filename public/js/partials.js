// partials.js — injects the shared header and footer so the markup lives
// in one place rather than being copy-pasted across every page.

const LOGO_SVG = `
  <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="6" y="18" width="28" height="15" rx="3" fill="#C4265E"/>
    <rect x="6" y="14" width="28" height="6" rx="3" fill="#F7D9E3"/>
    <rect x="18.5" y="5" width="3" height="9" rx="1.5" fill="#F5C542"/>
    <circle cx="20" cy="4" r="2.6" fill="#F5C542"/>
  </svg>`;

function renderHeader(active) {
  const mount = document.getElementById('site-header');
  if (!mount) return;
  const link = (href, label, key) =>
    `<a href="${href}"${active === key ? ' class="active"' : ''}>${label}</a>`;

  mount.outerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <a href="/" class="logo">${LOGO_SVG} Sugarhouse</a>
        <button class="nav-toggle" aria-label="Open menu" aria-expanded="false">☰</button>
        <nav class="nav">
          ${link('/', 'Home', 'home')}
          ${link('/menu', 'Our cakes', 'menu')}
          ${link('/#how', 'How ordering works', 'how')}
          ${link('/#visit', 'Visit us', 'visit')}
          <a href="/cart" class="cart-link">Basket <span class="cart-count">0</span></a>
        </nav>
      </div>
    </header>`;
}

function renderFooter() {
  const mount = document.getElementById('site-footer');
  if (!mount) return;
  mount.outerHTML = `
    <footer class="site-footer">
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <div class="logo">Sugarhouse</div>
            <p>A small kitchen in Bukoto making birthday cakes, wedding cakes and cupcakes to order.</p>
          </div>
          <div>
            <h4>Browse</h4>
            <ul>
              <li><a href="/menu">All cakes</a></li>
              <li><a href="/menu?category=birthday">Birthday cakes</a></li>
              <li><a href="/menu?category=wedding">Wedding cakes</a></li>
              <li><a href="/menu?category=cupcakes">Cupcakes</a></li>
            </ul>
          </div>
          <div>
            <h4>Get in touch</h4>
            <ul>
              <li><a href="tel:+25670992587">+256 709 925 87</a></li>
              <li><a href="mailto:akellonoeline05@gmail.com">akellonoeline05@gmail.com</a></li>
              <li>Lukuli, Boston, Kampala</li>
              <li>Tue–Sat, 9am–6pm</li>
            </ul>
          </div>
        </div>
        <div class="footer-base">
          <span>&copy; <span id="year"></span> Sugarhouse Bakery</span>
          <span>Baked in Kampala</span>
        </div>
      </div>
    </footer>`;
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
}

window.Partials = { renderHeader, renderFooter };
