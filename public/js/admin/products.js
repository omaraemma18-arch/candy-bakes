(async function () {
  const { api, formatUGX, escapeHtml } = window.App;

  const user = await AdminShell.requireSession('products', 'Products');
  if (!user) return;

  const isAdmin = user.role === 'admin';
  const area = document.getElementById('productsArea');
  const pageAlert = document.getElementById('pageAlert');
  const newBtn = document.getElementById('newProductBtn');

  if (!isAdmin) newBtn.style.display = 'none';

  let products = [];
  let editingId = null;
  let selectedFiles = [];

  function flash(message, kind = 'success') {
    pageAlert.textContent = message;
    pageAlert.className = `alert alert-${kind} show`;
    setTimeout(() => pageAlert.classList.remove('show'), 4000);
  }

  /* ---------------- Modal ---------------- */
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal">
      <h2 id="modalTitle">Add a cake</h2>
      <p class="modal-sub">It goes live on the customer menu as soon as you save.</p>

      <div class="alert alert-error" id="modalAlert"></div>

      <form id="productForm">
        <div class="field">
          <span class="field-label">Photo</span>
          <label class="dropzone" id="dropzone">
            <input type="file" id="imageInput" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" multiple>
            <div class="dropzone-prompt" id="dropPrompt">
              <strong>Choose photos</strong> or drag them here<br>
              <span style="font-size:.84rem;">Up to 8 JPG, PNG or WEBP images — 8MB each</span>
            </div>
          </label>
          <div id="previewArea" style="margin-top:12px;"></div>
          <div class="field-error" id="imageError">Add a photo of the cake.</div>
        </div>

        <div class="field" data-field="name">
          <label for="pName">Cake name</label>
          <input type="text" class="control" id="pName" maxlength="120">
          <div class="field-error">Give the cake a name.</div>
        </div>

        <div class="field" data-field="description">
          <label for="pDescription">Description</label>
          <textarea class="control" id="pDescription" maxlength="1200" placeholder="What it is, what's in it, who it suits."></textarea>
          <div class="field-error">Add a short description.</div>
        </div>

        <div class="field-row">
          <div class="field" data-field="category">
            <label for="pCategory">Category</label>
            <select class="control" id="pCategory">
              <option value="birthday">Birthday</option>
              <option value="wedding">Wedding</option>
              <option value="cupcakes">Cupcakes</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="field" data-field="basePrice">
            <label for="pBasePrice">Base price (UGX)</label>
            <input type="number" class="control" id="pBasePrice" min="0" step="1000">
            <div class="field-error">Set a price.</div>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="pLeadTime">Days' notice needed</label>
            <input type="number" class="control" id="pLeadTime" min="0" max="90" value="3">
          </div>
          <div class="field">
            <label for="pFlavours">Flavours <span class="field-hint">comma separated</span></label>
            <input type="text" class="control" id="pFlavours" placeholder="Vanilla, Chocolate, Red velvet">
          </div>
        </div>

        <div class="field">
          <span class="field-label">Sizes <span class="field-hint">price added to the base</span></span>
          <div id="sizeRows"></div>
          <button type="button" class="btn btn-ghost btn-sm" id="addSizeBtn">＋ Add a size</button>
        </div>

        <div class="field">
          <div class="pill-group">
            <label class="pill">
              <input type="checkbox" id="pAvailable" checked>
              <span class="pill-text"><strong>On the menu</strong><span>Customers can order it</span></span>
            </label>
            <label class="pill">
              <input type="checkbox" id="pFeatured">
              <span class="pill-text"><strong>Featured</strong><span>Show on the homepage</span></span>
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="cancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="saveBtn">Save and publish</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  const form = modal.querySelector('#productForm');
  const modalAlert = modal.querySelector('#modalAlert');
  const imageInput = modal.querySelector('#imageInput');
  const dropzone = modal.querySelector('#dropzone');
  const previewArea = modal.querySelector('#previewArea');
  const dropPrompt = modal.querySelector('#dropPrompt');
  const sizeRows = modal.querySelector('#sizeRows');

  function openModal(product) {
    editingId = product ? product._id : null;
    selectedFiles = [];
    modalAlert.classList.remove('show');
    form.querySelectorAll('.field').forEach((f) => f.classList.remove('invalid'));
    modal.querySelector('#imageError').style.display = 'none';

    modal.querySelector('#modalTitle').textContent = product ? 'Edit cake' : 'Add a cake';
    modal.querySelector('#pName').value = product?.name || '';
    modal.querySelector('#pDescription').value = product?.description || '';
    modal.querySelector('#pCategory').value = product?.category || 'birthday';
    modal.querySelector('#pBasePrice').value = product?.basePrice ?? '';
    modal.querySelector('#pLeadTime').value = product?.leadTimeDays ?? 3;
    modal.querySelector('#pFlavours').value = (product?.flavours || []).join(', ');
    modal.querySelector('#pAvailable').checked = product ? product.available : true;
    modal.querySelector('#pFeatured').checked = product ? product.featured : false;

    sizeRows.innerHTML = '';
    (product?.sizes || []).forEach((s) => addSizeRow(s.label, s.priceModifier));

    const existingImages = product?.images?.length ? product.images : (product ? [{ url: product.imageUrl }] : []);
    previewArea.innerHTML = product
      ? `<div class="preview-wrap" style="display:flex;gap:8px;flex-wrap:wrap;">${existingImages.map((image) => `<img src="${escapeHtml(image.url)}" alt="" style="width:96px;height:96px;object-fit:cover;">`).join('')}</div>
         <p style="font-size:.84rem;color:var(--muted);margin:8px 0 0;">Choose more photos to add them to this product.</p>`
      : '';
    dropPrompt.style.display = 'block';

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    form.reset();
    selectedFiles = [];
  }

  modal.querySelector('#cancelBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  newBtn.addEventListener('click', () => openModal(null));

  /* ---------------- Sizes ---------------- */
  function addSizeRow(label = '', modifier = '') {
    const row = document.createElement('div');
    row.className = 'size-row';
    row.innerHTML = `
      <input type="text" class="control size-label" placeholder="8 inch — serves 16–20" value="${escapeHtml(label)}">
      <input type="number" class="control size-mod" placeholder="+ UGX" step="1000" value="${modifier}">
      <button type="button" aria-label="Remove size">×</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    sizeRows.appendChild(row);
  }
  modal.querySelector('#addSizeBtn').addEventListener('click', () => addSizeRow());

  /* ---------------- Image handling ---------------- */
  function showPreview(files) {
    const previews = files.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(`<img src="${e.target.result}" alt="Preview of ${escapeHtml(file.name)}" style="width:96px;height:96px;object-fit:cover;">`);
      reader.readAsDataURL(file);
    }));
    Promise.all(previews).then((html) => {
      previewArea.innerHTML = `<div class="preview-wrap" style="display:flex;gap:8px;flex-wrap:wrap;">${html.join('')}</div>`;
      dropPrompt.style.display = 'none';
    });
  }

  function acceptFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (files.length > 8 || files.some((file) => file.size > 8 * 1024 * 1024)) {
      modalAlert.textContent = 'Choose up to 8 images, each no larger than 8MB.';
      modalAlert.classList.add('show');
      return;
    }
    selectedFiles = files;
    modalAlert.classList.remove('show');
    modal.querySelector('#imageError').style.display = 'none';
    showPreview(files);
  }

  imageInput.addEventListener('change', () => acceptFiles(imageInput.files));

  ['dragenter', 'dragover'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    })
  );
  ['dragleave', 'drop'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    })
  );
  dropzone.addEventListener('drop', (e) => acceptFiles(e.dataTransfer.files));

  /* ---------------- Save ---------------- */
  form.addEventListener('input', (e) => {
    e.target.closest('[data-field]')?.classList.remove('invalid');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalAlert.classList.remove('show');

    const name = modal.querySelector('#pName').value.trim();
    const description = modal.querySelector('#pDescription').value.trim();
    const basePrice = modal.querySelector('#pBasePrice').value;

    let ok = true;
    const invalid = (n, bad) => {
      form.querySelector(`[data-field="${n}"]`)?.classList.toggle('invalid', bad);
      if (bad) ok = false;
    };
    invalid('name', name.length < 2);
    invalid('description', description.length < 5);
    invalid('basePrice', basePrice === '' || Number(basePrice) < 0);

    if (!editingId && !selectedFiles.length) {
      modal.querySelector('#imageError').style.display = 'block';
      ok = false;
    }
    if (!ok) return;

    const sizes = Array.from(sizeRows.querySelectorAll('.size-row'))
      .map((row) => ({
        label: row.querySelector('.size-label').value.trim(),
        priceModifier: Number(row.querySelector('.size-mod').value) || 0,
      }))
      .filter((s) => s.label);

    const flavours = modal.querySelector('#pFlavours').value
      .split(',').map((f) => f.trim()).filter(Boolean);

    const fd = new FormData();
    fd.append('name', name);
    fd.append('description', description);
    fd.append('category', modal.querySelector('#pCategory').value);
    fd.append('basePrice', basePrice);
    fd.append('leadTimeDays', modal.querySelector('#pLeadTime').value || 3);
    fd.append('sizes', JSON.stringify(sizes));
    fd.append('flavours', JSON.stringify(flavours));
    fd.append('available', modal.querySelector('#pAvailable').checked);
    fd.append('featured', modal.querySelector('#pFeatured').checked);
    selectedFiles.forEach((file) => fd.append('images', file));

    const saveBtn = modal.querySelector('#saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = selectedFiles.length ? 'Uploading photos…' : 'Saving…';

    try {
      if (editingId) {
        await api(`/api/admin/products/${editingId}`, { method: 'PUT', body: fd });
        flash('Cake updated — the menu is already showing the change.');
      } else {
        await api('/api/admin/products', { method: 'POST', body: fd });
        flash('Cake published — it is live on the menu now.');
      }
      closeModal();
      load();
    } catch (err) {
      modalAlert.textContent = err.message;
      modalAlert.classList.add('show');
      if (err.fieldErrors) {
        Object.keys(err.fieldErrors).forEach((f) =>
          form.querySelector(`[data-field="${f}"]`)?.classList.add('invalid')
        );
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save and publish';
    }
  });

  /* ---------------- List ---------------- */
  async function load() {
    area.innerHTML = '<div class="spinner"></div>';
    try {
      ({ products } = await api('/api/admin/products'));

      if (!products.length) {
        area.innerHTML = `
          <div class="empty-state">
            <h3>No cakes yet</h3>
            <p>Add your first one and it will appear on the customer menu straight away.</p>
            ${isAdmin ? '<button class="btn btn-primary" id="emptyAddBtn">＋ Add a cake</button>' : ''}
          </div>`;
        document.getElementById('emptyAddBtn')?.addEventListener('click', () => openModal(null));
        return;
      }

      area.innerHTML = `
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr><th></th><th>Cake</th><th>Category</th><th>From</th><th>Status</th>${isAdmin ? '<th></th>' : ''}</tr>
            </thead>
            <tbody>
              ${products.map((p) => `
                <tr>
                  <td><img class="thumb" src="${escapeHtml(p.imageUrl)}" alt=""></td>
                  <td>
                    <strong>${escapeHtml(p.name)}</strong>
                    ${p.featured ? ' <span class="badge badge-on">featured</span>' : ''}
                    <br><span style="color:var(--muted);font-size:.82rem;">${p.sizes.length} size${p.sizes.length === 1 ? '' : 's'} · ${p.leadTimeDays}d notice</span>
                  </td>
                  <td style="text-transform:capitalize;">${escapeHtml(p.category)}</td>
                  <td>${formatUGX(p.basePrice)}</td>
                  <td>${p.available ? '<span class="badge badge-on">on menu</span>' : '<span class="badge badge-off">hidden</span>'}</td>
                  ${isAdmin ? `
                    <td>
                      <div class="row-actions">
                        <button class="btn btn-ghost btn-sm" data-act="edit" data-id="${p._id}">Edit</button>
                        <button class="btn btn-ghost btn-sm" data-act="toggle" data-id="${p._id}">${p.available ? 'Hide' : 'Show'}</button>
                        <button class="btn btn-danger btn-sm" data-act="delete" data-id="${p._id}">Delete</button>
                      </div>
                    </td>` : ''}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      area.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">${escapeHtml(err.message)}</p></div>`;
    }
  }

  area.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const { act, id } = btn.dataset;
    const product = products.find((p) => p._id === id);
    if (!product) return;

    if (act === 'edit') return openModal(product);

    if (act === 'toggle') {
      btn.disabled = true;
      try {
        await api(`/api/admin/products/${id}/availability`, { method: 'PATCH' });
        flash(product.available ? 'Hidden from the menu.' : 'Back on the menu.');
        load();
      } catch (err) {
        flash(err.message, 'error');
        btn.disabled = false;
      }
      return;
    }

    if (act === 'delete') {
      if (!confirm(`Delete "${product.name}"? This also removes its photo and can't be undone.`)) return;
      btn.disabled = true;
      try {
        await api(`/api/admin/products/${id}`, { method: 'DELETE' });
        flash('Cake deleted.');
        load();
      } catch (err) {
        flash(err.message, 'error');
        btn.disabled = false;
      }
    }
  });

  load();
})();
