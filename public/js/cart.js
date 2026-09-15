(function () {
  Partials.renderHeader();
  Partials.renderFooter();

  const {
    formatUGX, escapeHtml, getCart, removeFromCart, setQuantity,
    cartSubtotal, cartItemCount, earliestDate,
  } = window.App;

  const emptyCart = document.getElementById('emptyCart');
  const content = document.getElementById('cartContent');
  const itemsEl = document.getElementById('cartItems');

  function render() {
    const cart = getCart();
    if (!cart.length) {
      emptyCart.style.display = 'block';
      content.style.display = 'none';
      return;
    }
    emptyCart.style.display = 'none';
    content.style.display = 'block';

    itemsEl.innerHTML = cart.map((i) => {
      const specs = [
        i.size ? `<p class="cart-spec"><strong>Size:</strong> ${escapeHtml(i.size)}</p>` : '',
        i.flavour ? `<p class="cart-spec"><strong>Flavour:</strong> ${escapeHtml(i.flavour)}</p>` : '',
        i.icingMessage ? `<p class="cart-spec"><strong>Message:</strong> “${escapeHtml(i.icingMessage)}”</p>` : '',
        i.notes ? `<p class="cart-spec"><strong>Notes:</strong> ${escapeHtml(i.notes)}</p>` : '',
      ].join('');

      return `
        <div class="cart-item">
          <div class="cart-item-photo"><img src="${escapeHtml(i.imageUrl)}" alt="${escapeHtml(i.name)}"></div>
          <div>
            <h3>${escapeHtml(i.name)}</h3>
            ${specs}
          </div>
          <div class="cart-item-side">
            <div class="price">${formatUGX(i.unitPrice * i.quantity)}</div>
            <div class="qty-control">
              <button type="button" data-act="dec" data-id="${i.lineId}" aria-label="Reduce quantity">−</button>
              <span>${i.quantity}</span>
              <button type="button" data-act="inc" data-id="${i.lineId}" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" class="link-remove" data-act="remove" data-id="${i.lineId}">Remove</button>
          </div>
        </div>`;
    }).join('');

    document.getElementById('sumCount').textContent = cartItemCount();
    document.getElementById('sumSubtotal').textContent = formatUGX(cartSubtotal());
    document.getElementById('sumTotal').textContent = formatUGX(cartSubtotal());
    document.getElementById('earliestDate').textContent = earliestDate(cart).iso;
  }

  itemsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const { act, id } = btn.dataset;
    const item = getCart().find((i) => i.lineId === id);
    if (!item) return;

    if (act === 'remove') removeFromCart(id);
    else if (act === 'inc') setQuantity(id, item.quantity + 1);
    else if (act === 'dec') {
      if (item.quantity <= 1) removeFromCart(id);
      else setQuantity(id, item.quantity - 1);
    }
    render();
  });

  render();
})();
