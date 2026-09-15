// shell.js — guards every admin page and draws the sidebar + topbar.

const AdminShell = (function () {
  const { api, escapeHtml } = window.App;

  const NAV = [
    { href: '/admin/dashboard', label: 'Dashboard', key: 'dashboard' },
    { href: '/admin/products', label: 'Products', key: 'products' },
    { href: '/admin/orders', label: 'Orders', key: 'orders' },
  ];

  function initials(name) {
    return (name || '?')
      .trim().split(/\s+/).slice(0, 2)
      .map((p) => p[0].toUpperCase()).join('');
  }

  // Returns the signed-in user, or redirects to the login page.
  async function requireSession(activeKey, pageTitle) {
    let user;
    try {
      ({ user } = await api('/api/auth/me'));
    } catch {
      location.replace('/admin');
      return null;
    }

    document.getElementById('admin-sidebar').outerHTML = `
      <aside class="admin-sidebar" id="adminSidebar">
        <div class="logo">Sugarhouse<small>Admin</small></div>
        <nav class="admin-nav">
          ${NAV.map((n) => `<a href="${n.href}"${n.key === activeKey ? ' class="active"' : ''}>${n.label}</a>`).join('')}
          <a href="/" target="_blank" rel="noopener">View shop ↗</a>
          <a href="#" class="logout" id="logoutLink">Sign out</a>
        </nav>
      </aside>`;

    document.getElementById('admin-topbar').outerHTML = `
      <div class="admin-topbar">
        <div style="display:flex;align-items:center;gap:14px;">
          <button class="admin-toggle" id="sidebarToggle" aria-label="Open menu">☰</button>
          <h1>${escapeHtml(pageTitle)}</h1>
        </div>
        <div class="user-chip">
          <div class="avatar">${escapeHtml(initials(user.name))}</div>
          <div class="who">
            <div class="uname">${escapeHtml(user.name)}</div>
            <div class="urole">${escapeHtml(user.role)}</div>
          </div>
        </div>
      </div>`;

    document.getElementById('logoutLink').addEventListener('click', async (e) => {
      e.preventDefault();
      try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* sign out anyway */ }
      location.href = '/admin';
    });

    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('adminSidebar').classList.toggle('open');
    });

    return user;
  }

  function statusBadge(status) {
    return `<span class="badge badge-${status}">${status}</span>`;
  }

  return { requireSession, statusBadge };
})();
