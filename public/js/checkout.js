(function () {
  Partials.renderHeader();
  Partials.renderFooter();

  const {
    api, formatUGX, escapeHtml, getCart, cartSubtotal, clearCart, earliestDate,
  } = window.App;

  const DELIVERY_FEE = 15000;
  const FREE_DELIVERY_OVER = 300000;

  const cart = getCart();
  if (!cart.length) {
    document.getElementById('emptyCart').style.display = 'block';
    return;
  }
  document.getElementById('checkoutContent').style.display = 'block';

  const itemNames = cart.map((i) => i.name).join(', ');
  Partials.renderWhatsApp(`Hi! I'm about to order ${itemNames} and had a quick question before I check out.`);

  const form = document.getElementById('checkoutForm');
  const formAlert = document.getElementById('formAlert');
  const addressField = document.getElementById('addressField');
  const dateInput = document.getElementById('date');

  /* ---------- Summary ---------- */
  document.getElementById('summaryItems').innerHTML = cart.map((i) => `
    <div class="summary-line" style="align-items:flex-start;">
      <span>${escapeHtml(i.name)} ×${i.quantity}${i.size ? `<br><span style="font-size:.81rem;">${escapeHtml(i.size)}</span>` : ''}</span>
      <strong>${formatUGX(i.unitPrice * i.quantity)}</strong>
    </div>`).join('');

  const isDelivery = () =>
    form.querySelector('input[name="fulfilment"]:checked').value === 'delivery';

  const deliveryCost = () =>
    isDelivery() && cartSubtotal() < FREE_DELIVERY_OVER ? DELIVERY_FEE : 0;

  function updateTotals() {
    const subtotal = cartSubtotal();
    const delivery = deliveryCost();
    document.getElementById('sumSubtotal').textContent = formatUGX(subtotal);
    document.getElementById('sumDelivery').textContent =
      !isDelivery() ? 'Not needed' : delivery === 0 ? 'Free' : formatUGX(delivery);
    document.getElementById('sumTotal').textContent = formatUGX(subtotal + delivery);
    addressField.style.display = isDelivery() ? 'block' : 'none';
  }

  form.addEventListener('change', updateTotals);
  updateTotals();

  /* ---------- Date rules ---------- */
  const { iso: earliest, lead } = earliestDate(cart);
  dateInput.min = earliest;
  document.getElementById('leadInfo').textContent =
    `Your basket needs ${lead} days' notice, so the soonest we can have it ready is ${earliest}.`;

  /* ---------- Validation ---------- */
  function setInvalid(name, invalid, message) {
    const field = form.querySelector(`[data-field="${name}"]`);
    if (!field) return;
    field.classList.toggle('invalid', invalid);
    if (message) {
      const err = field.querySelector('.field-error');
      if (err) err.textContent = message;
    }
  }

  function validate() {
    let ok = true;

    const name = document.getElementById('name').value.trim();
    setInvalid('name', name.length < 2);
    if (name.length < 2) ok = false;

    const phone = document.getElementById('phone').value.replace(/[\s-]/g, '');
    const phoneOk = /^\+?\d{9,15}$/.test(phone);
    setInvalid('phone', !phoneOk);
    if (!phoneOk) ok = false;

    const email = document.getElementById('email').value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setInvalid('email', !emailOk);
    if (!emailOk) ok = false;

    if (isDelivery()) {
      const address = document.getElementById('address').value.trim();
      setInvalid('address', address.length < 8);
      if (address.length < 8) ok = false;
    } else {
      setInvalid('address', false);
    }

    if (!dateInput.value) {
      setInvalid('date', true, 'Choose a date.');
      ok = false;
    } else if (dateInput.value < earliest) {
      setInvalid('date', true, `We need ${lead} days' notice — the soonest is ${earliest}.`);
      ok = false;
    } else {
      setInvalid('date', false);
    }

    const timeWindow = document.getElementById('timeWindow').value;
    setInvalid('timeWindow', !timeWindow);
    if (!timeWindow) ok = false;

    return ok;
  }

  form.addEventListener('input', (e) => {
    e.target.closest('[data-field]')?.classList.remove('invalid');
  });

  /* ---------- Submit ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formAlert.classList.remove('show');

    if (!validate()) {
      formAlert.textContent = 'Some details need fixing — see the highlighted fields.';
      formAlert.classList.add('show');
      form.querySelector('.field.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const payload = {
      customer: {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
      },
      fulfilment: {
        method: isDelivery() ? 'delivery' : 'pickup',
        address: isDelivery() ? document.getElementById('address').value.trim() : undefined,
        date: dateInput.value,
        timeWindow: document.getElementById('timeWindow').value,
      },
      items: cart.map((i) => ({
        productId: i.productId,
        size: i.size,
        flavour: i.flavour,
        icingMessage: i.icingMessage,
        notes: i.notes,
        quantity: i.quantity,
      })),
      paymentMethod: form.querySelector('input[name="payment"]:checked').value,
    };

    const btn = document.getElementById('placeBtn');
    btn.disabled = true;
    btn.textContent = 'Placing your order…';

    try {
      const { order } = await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      try {
        sessionStorage.setItem('cakeshop_last_order', JSON.stringify(order));
      } catch { /* confirmation page falls back to a generic message */ }

      clearCart();
      location.href = '/confirmation';
    } catch (err) {
      formAlert.textContent = err.message;
      formAlert.classList.add('show');
      formAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.disabled = false;
      btn.textContent = 'Place order';
    }
  });
})();
