// partials.js — injects the shared header and footer so the markup lives
// in one place rather than being copy-pasted across every page.

const LOGO_SVG = `
  <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="6" y="18" width="28" height="15" rx="3" fill="#C4265E"/>
    <rect x="6" y="14" width="28" height="6" rx="3" fill="#F7D9E3"/>
    <rect x="18.5" y="5" width="3" height="9" rx="1.5" fill="#F5C542"/>
    <circle cx="20" cy="4" r="2.6" fill="#F5C542"/>
  </svg>`;

// Edit this to your real WhatsApp number: country code + number, digits
// only (no +, spaces or dashes). Everything WhatsApp-related below reads
// from this one place.
const WHATSAPP_NUMBER = '256700000000';

function whatsappUrl(message) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Edit these to your real profiles. Leave a value as '#' to hide that icon
// (see the filter in the social row below).
const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/sugarhousebakery',
  facebook: 'https://facebook.com/sugarhousebakery',
  tiktok: 'https://tiktok.com/@sugarhousebakery',
  whatsapp: whatsappUrl(),
  twitter: 'https://x.com/sugarhousebakery',
};

const SOCIAL_ICONS = {
  instagram: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 3.3.15 4.8 1.7 5 5C22 8.5 22 8.9 22 12s0 3.6-.07 4.8c-.15 3.3-1.7 4.8-5 5-1.2.06-1.6.07-4.9.07s-3.6 0-4.9-.07c-3.3-.15-4.8-1.7-5-5C2 15.6 2 15.2 2 12s0-3.6.07-4.9c.15-3.3 1.7-4.8 5-5C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.8.07-2.4.1-3.5 1.2-3.6 3.6C3.6 8.5 3.6 8.9 3.6 12s0 3.5.07 4.8c.1 2.4 1.2 3.5 3.6 3.6 1.2.06 1.6.07 4.8.07s3.5 0 4.8-.07c2.4-.1 3.5-1.2 3.6-3.6.06-1.2.07-1.6.07-4.8s0-3.5-.07-4.8c-.1-2.4-1.2-3.5-3.6-3.6-1.2-.06-1.6-.07-4.8-.07zm0 3.1a4.9 4.9 0 110 9.8 4.9 4.9 0 010-9.8zm0 1.8a3.1 3.1 0 100 6.3 3.1 3.1 0 000-6.3zm5.1-2a1.15 1.15 0 110 2.3 1.15 1.15 0 010-2.3z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.6h2.6l.4-3h-3v-1.9c0-.9.25-1.5 1.5-1.5h1.6V4.3c-.28-.04-1.25-.12-2.36-.12-2.34 0-3.94 1.43-3.94 4.04V10.4H7.7v3h2.6V21h3.2z"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 2h-3.1v13.4a2.9 2.9 0 11-2.9-2.9c.27 0 .53.03.78.09V9.5a6 6 0 105.22 5.95V8.3a7.4 7.4 0 004.2 1.3V6.5a4.3 4.3 0 01-4.2-4.5z"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 1.8a8.2 8.2 0 016.9 12.6l-.2.4.6 2.1-2.2-.6-.4.2A8.2 8.2 0 1112 3.8zm-3.2 4c-.2 0-.5 0-.7.3-.25.3-.9.9-.9 2.2s.95 2.6 1.1 2.8c.15.2 1.9 3 4.7 4.1 2.3 1 2.8.8 3.3.7.5-.05 1.6-.65 1.8-1.3.2-.6.2-1.15.15-1.25-.05-.1-.2-.17-.45-.3s-1.5-.75-1.75-.83c-.25-.1-.43-.14-.6.14-.2.3-.68.83-.83 1-.15.17-.3.19-.56.06-.25-.13-1.1-.4-2.1-1.28-.78-.68-1.3-1.53-1.46-1.8-.15-.27-.02-.4.11-.53.12-.12.27-.3.4-.46.14-.15.18-.27.28-.45.1-.2.05-.36-.02-.5-.07-.15-.6-1.5-.85-2.05-.2-.5-.42-.44-.6-.45z"/></svg>`,
  twitter: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 3h3l-6.6 7.5L23 21h-6.1l-4.8-6.3L6.6 21H3.5l7.1-8.1L2.8 3h6.2l4.3 5.8L18.9 3zm-1.1 16.2h1.7L7.3 4.7H5.5l12.3 14.5z"/></svg>`,
};

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

  const socialHtml = Object.keys(SOCIAL_ICONS)
    .filter((key) => SOCIAL_LINKS[key] && SOCIAL_LINKS[key] !== '#')
    .map((key) => `
      <a href="${SOCIAL_LINKS[key]}" class="social-icon" target="_blank" rel="noopener noreferrer" aria-label="${key}">
        ${SOCIAL_ICONS[key]}
      </a>`)
    .join('');

  mount.outerHTML = `
    <footer class="site-footer">
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <div class="logo">Sugarhouse</div>
            <p>A small kitchen in Bukoto making birthday cakes, wedding cakes and cupcakes to order.</p>
            ${socialHtml ? `<div class="social-row">${socialHtml}</div>` : ''}
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
              <li><a href="tel:+256700000000">+256 700 000 000</a></li>
              <li><a href="mailto:orders@sugarhouse.example">orders@sugarhouse.example</a></li>
              <li>Plot 14, Bukoto Street, Kampala</li>
              <li>Tue–Sat, 9am–6pm</li>
            </ul>
          </div>
        </div>
        <div class="footer-base">
          <span>&copy; <span id="year"></span> Sugarhouse Bakery</span>
          <span class="footer-links">
            <a href="/terms">Terms &amp; Conditions</a>
            <span aria-hidden="true">·</span>
            <span>Baked in Kampala</span>
          </span>
        </div>
      </div>
    </footer>`;
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
}

// A floating WhatsApp button, present on every public page. Call again with
// a new message any time (e.g. once a product or order loads) to make the
// pre-filled chat message specific to what the customer is looking at.
function renderWhatsApp(message) {
  const DEFAULT_MESSAGE = "Hi! I have a question about your cakes.";
  let btn = document.getElementById('whatsappFloat');

  if (!btn) {
    btn = document.createElement('a');
    btn.id = 'whatsappFloat';
    btn.className = 'whatsapp-float';
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.setAttribute('aria-label', 'Chat with us on WhatsApp');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 1.8a8.2 8.2 0 016.9 12.6l-.2.4.6 2.1-2.2-.6-.4.2A8.2 8.2 0 1112 3.8zm-3.2 4c-.2 0-.5 0-.7.3-.25.3-.9.9-.9 2.2s.95 2.6 1.1 2.8c.15.2 1.9 3 4.7 4.1 2.3 1 2.8.8 3.3.7.5-.05 1.6-.65 1.8-1.3.2-.6.2-1.15.15-1.25-.05-.1-.2-.17-.45-.3s-1.5-.75-1.75-.83c-.25-.1-.43-.14-.6.14-.2.3-.68.83-.83 1-.15.17-.3.19-.56.06-.25-.13-1.1-.4-2.1-1.28-.78-.68-1.3-1.53-1.46-1.8-.15-.27-.02-.4.11-.53.12-.12.27-.3.4-.46.14-.15.18-.27.28-.45.1-.2.05-.36-.02-.5-.07-.15-.6-1.5-.85-2.05-.2-.5-.42-.44-.6-.45z"/></svg>
      <span class="whatsapp-tooltip">Chat with us</span>`;
    document.body.appendChild(btn);
  }

  btn.href = whatsappUrl(message || DEFAULT_MESSAGE);
}

window.Partials = { renderHeader, renderFooter, renderWhatsApp, whatsappUrl };
