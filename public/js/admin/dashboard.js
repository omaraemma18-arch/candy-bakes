(async function () {
  const { api, formatUGX, escapeHtml } = window.App;

  const user = await AdminShell.requireSession('dashboard', 'Dashboard');
  if (!user) return;

  const statGrid = document.getElementById('statGrid');
  const upcomingArea = document.getElementById('upcomingArea');

  function stat(label, value) {
    return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`;
  }

  try {
    const s = await api('/api/admin/stats');

    statGrid.innerHTML = [
      stat('Orders today', s.ordersToday),
      stat('Awaiting confirmation', s.pendingOrders),
      stat('Cakes on the menu', s.availableProducts),
      stat('Products total', s.totalProducts),
    ].join('');

    if (!s.upcoming.length) {
      upcomingArea.innerHTML = '<p style="color:var(--muted);margin:0;">Nothing booked in yet.</p>';
      return;
    }

    upcomingArea.innerHTML = `
      <div class="table-wrap">
        <table class="admin-table">
          <thead><tr><th>When</th><th>Reference</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            ${s.upcoming.map((o) => `
              <tr>
                <td>${new Date(o.fulfilment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}<br>
                    <span style="color:var(--muted);font-size:.82rem;">${escapeHtml(o.fulfilment.timeWindow || '')}</span></td>
                <td><strong>${escapeHtml(o.reference)}</strong></td>
                <td>${escapeHtml(o.customer.name)}<br><span style="color:var(--muted);font-size:.82rem;">${escapeHtml(o.customer.phone)}</span></td>
                <td>${o.items.length}</td>
                <td>${formatUGX(o.total)}</td>
                <td>${AdminShell.statusBadge(o.status)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    statGrid.innerHTML = '';
    upcomingArea.innerHTML = `<p style="color:var(--danger);">${escapeHtml(err.message)}</p>`;
  }
})();
