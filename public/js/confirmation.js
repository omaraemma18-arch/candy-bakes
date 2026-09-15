(function () {
  Partials.renderHeader();
  Partials.renderFooter();

  const { formatUGX, escapeHtml } = window.App;
  const detailsEl = document.getElementById('orderDetails');

  let order = null;
  try {
    order = JSON.parse(sessionStorage.getItem('cakeshop_last_order') || 'null');
  } catch { order = null; }

  if (!order) {
    document.getElementById('orderRef').style.display = 'none';
    document.getElementById('confirmIntro').textContent =
      "If you've just ordered, we've got it — check your email for the details.";
    detailsEl.style.display = 'none';
    return;
  }

  document.getElementById('orderRef').textContent = order.reference;

  const items = order.items.map((i) => {
    const bits = [i.size, i.flavour].filter(Boolean).map(escapeHtml).join(' · ');
    const extra = [
      i.icingMessage ? `<div class="cart-spec"><strong>Message:</strong> “${escapeHtml(i.icingMessage)}”</div>` : '',
      i.notes ? `<div class="cart-spec"><strong>Notes:</strong> ${escapeHtml(i.notes)}</div>` : '',
    ].join('');
    return `
      <div style="padding:13px 0;border-bottom:1px solid var(--line);">
        <div style="display:flex;justify-content:space-between;gap:14px;">
          <strong>${escapeHtml(i.name)} ×${i.quantity}</strong>
          <strong>${formatUGX(i.unitPrice * i.quantity)}</strong>
        </div>
        ${bits ? `<div class="cart-spec">${bits}</div>` : ''}
        ${extra}
      </div>`;
  }).join('');

  const f = order.fulfilment;
  const when = new Date(f.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  detailsEl.innerHTML = `
    <h2 style="font-size:1.12rem;">What you ordered</h2>
    ${items}
    <div class="summary-line" style="margin-top:14px;"><span>Subtotal</span><strong>${formatUGX(order.subtotal)}</strong></div>
    <div class="summary-line"><span>Delivery</span><strong>${order.deliveryFee ? formatUGX(order.deliveryFee) : (f.method === 'delivery' ? 'Free' : 'Not needed')}</strong></div>
    <div class="summary-total"><span>Total</span><span>${formatUGX(order.total)}</span></div>
    <h2 style="font-size:1.12rem;margin-top:24px;">${f.method === 'delivery' ? 'Delivery' : 'Collection'}</h2>
    <p class="cart-spec"><strong>When:</strong> ${escapeHtml(when)}, ${escapeHtml(f.timeWindow)}</p>
    <p class="cart-spec"><strong>Where:</strong> ${f.address ? escapeHtml(f.address) : 'Plot 14, Bukoto Street, Kampala'}</p>
    <p class="cart-spec"><strong>Payment:</strong> ${order.paymentMethod === 'mobile-money' ? 'Mobile money' : 'Paying on collection'}</p>`;
})();
