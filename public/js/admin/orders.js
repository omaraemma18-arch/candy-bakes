(async function () {
  const { api, formatUGX, escapeHtml } = window.App;

  const user = await AdminShell.requireSession('orders', 'Orders');
  if (!user) return;

  const area = document.getElementById('ordersArea');
  const filters = document.querySelectorAll('[data-status]');
  const STATUSES = ['pending', 'confirmed', 'baking', 'ready', 'completed', 'cancelled'];

  let status = 'all';
  let orders = [];

  function itemLines(order) {
    return order.items.map((i) => {
      const bits = [i.size, i.flavour].filter(Boolean).map(escapeHtml).join(' · ');
      return `
        <div style="padding:6px 0;">
          <strong>${i.quantity}× ${escapeHtml(i.name)}</strong>
          ${bits ? `<div style="color:var(--muted);font-size:.82rem;">${bits}</div>` : ''}
          ${i.icingMessage ? `<div style="font-size:.82rem;">Message: “${escapeHtml(i.icingMessage)}”</div>` : ''}
          ${i.notes ? `<div style="color:var(--muted);font-size:.82rem;">Notes: ${escapeHtml(i.notes)}</div>` : ''}
        </div>`;
    }).join('');
  }

  async function load() {
    area.innerHTML = '<div class="spinner"></div>';
    try {
      ({ orders } = await api('/api/admin/orders?status=' + status));

      if (!orders.length) {
        area.innerHTML = `
          <div class="empty-state">
            <h3>No orders here</h3>
            <p>${status === 'all' ? 'Orders will show up as customers place them.' : 'Nothing at this status right now.'}</p>
          </div>`;
        return;
      }

      area.innerHTML = `
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr><th>Reference</th><th>Needed</th><th>Customer</th><th>What to bake</th><th>Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${orders.map((o) => {
                const when = new Date(o.fulfilment.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                return `
                  <tr>
                    <td><strong>${escapeHtml(o.reference)}</strong><br>
                        <span style="color:var(--muted);font-size:.8rem;">${new Date(o.createdAt).toLocaleDateString('en-GB')}</span></td>
                    <td>${escapeHtml(when)}<br>
                        <span style="color:var(--muted);font-size:.82rem;">${escapeHtml(o.fulfilment.timeWindow || '')}</span><br>
                        <span class="badge ${o.fulfilment.method === 'delivery' ? 'badge-confirmed' : 'badge-off'}">${o.fulfilment.method}</span></td>
                    <td>${escapeHtml(o.customer.name)}<br>
                        <a href="tel:${escapeHtml(o.customer.phone)}" style="color:var(--raspberry);font-size:.84rem;">${escapeHtml(o.customer.phone)}</a>
                        ${o.fulfilment.address ? `<div style="color:var(--muted);font-size:.8rem;margin-top:4px;">${escapeHtml(o.fulfilment.address)}</div>` : ''}</td>
                    <td style="min-width:220px;">${itemLines(o)}</td>
                    <td>${formatUGX(o.total)}<br>
                        <span style="color:var(--muted);font-size:.8rem;">${o.paymentMethod === 'mobile-money' ? 'mobile money' : 'on collection'}</span></td>
                    <td>
                      <select class="control" data-id="${o._id}" style="padding:7px 10px;font-size:.84rem;min-width:130px;">
                        ${STATUSES.map((s) => `<option value="${s}"${s === o.status ? ' selected' : ''}>${s}</option>`).join('')}
                      </select>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      area.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">${escapeHtml(err.message)}</p></div>`;
    }
  }

  area.addEventListener('change', async (e) => {
    const select = e.target.closest('select[data-id]');
    if (!select) return;

    const previous = orders.find((o) => o._id === select.dataset.id)?.status;
    select.disabled = true;
    try {
      await api(`/api/admin/orders/${select.dataset.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: select.value }),
      });
      const order = orders.find((o) => o._id === select.dataset.id);
      if (order) order.status = select.value;
    } catch (err) {
      alert(err.message);
      if (previous) select.value = previous;
    } finally {
      select.disabled = false;
    }
  });

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      status = btn.dataset.status;
      filters.forEach((b) => b.classList.toggle('active', b === btn));
      load();
    });
  });

  load();
})();
