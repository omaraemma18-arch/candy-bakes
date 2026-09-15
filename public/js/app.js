// app.js — shared across the public site: API calls, cart storage, formatting.

const CART_KEY = 'cakeshop_cart';

async function api(path, options = {}) {
  const opts = { credentials: 'same-origin', ...options };

  // Let the browser set its own multipart boundary for FormData.
  if (!(opts.body instanceof FormData)) {
    opts.headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  }

  let res;
  try {
    res = await fetch(path, opts);
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || 'Something went wrong. Please try again.');
    err.status = res.status;
    err.fieldErrors = data && data.fieldErrors;
    throw err;
  }
  return data;
}

function formatUGX(amount) {
  return 'UGX ' + (Number(amount) || 0).toLocaleString('en-UG');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

/* ---------- Cart (browser-side only; prices are re-checked server-side) ---------- */
function getCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // Private browsing — the cart just won't survive a reload.
  }
  updateCartCount();
}

function addToCart(item) {
  const cart = getCart();
  cart.push({ ...item, lineId: 'L' + Date.now() + Math.random().toString(36).slice(2, 7) });
  saveCart(cart);
}

function removeFromCart(lineId) {
  saveCart(getCart().filter((i) => i.lineId !== lineId));
}

function setQuantity(lineId, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.lineId === lineId);
  if (!item) return;
  item.quantity = Math.max(1, Math.min(50, qty));
  saveCart(cart);
}

function clearCart() { saveCart([]); }

function cartSubtotal() {
  return getCart().reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

function cartItemCount() {
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}

function updateCartCount() {
  const count = cartItemCount();
  document.querySelectorAll('.cart-count').forEach((el) => {
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-flex' : 'none';
  });
}

/* ---------- Dates ---------- */
function toISODate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function earliestDate(cart) {
  const items = cart || getCart();
  const lead = items.length ? Math.max(...items.map((i) => i.leadTimeDays || 3)) : 3;
  const d = new Date();
  d.setDate(d.getDate() + lead);
  return { iso: toISODate(d), lead };
}

/* ---------- Header ---------- */
function initHeader() {
  updateCartCount();
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', initHeader);

window.App = {
  api, formatUGX, escapeHtml,
  getCart, saveCart, addToCart, removeFromCart, setQuantity, clearCart,
  cartSubtotal, cartItemCount, updateCartCount,
  toISODate, earliestDate,
};
