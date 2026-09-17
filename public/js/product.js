(async function () {
  Partials.renderHeader('menu');
  Partials.renderFooter();

  const { api, formatUGX, escapeHtml, addToCart } = window.App;
  const area = document.getElementById('productArea');

  const slug = new URLSearchParams(location.search).get('cake');
  if (!slug) {
    area.innerHTML = `
      <div class="empty-state">
        <h2>No cake selected</h2>
        <a href="/menu" class="btn btn-primary">See the cakes</a>
      </div>`;
    return;
  }

  let product;
  try {
    ({ product } = await api('/api/products/' + encodeURIComponent(slug)));
  } catch (err) {
    area.innerHTML = `
      <div class="empty-state">
        <h2>We couldn't find that cake</h2>
        <p>${escapeHtml(err.message)}</p>
        <a href="/menu" class="btn btn-primary">See what we're baking</a>
      </div>`;
    return;
  }

  document.title = `${product.name} | Candy Bakes and Pestries`;
  Partials.renderWhatsApp(`Hi! I'm interested in the ${product.name} (${window.location.href}).`);
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', product.description.slice(0, 155));

  const sizeOptions = product.sizes.length
    ? `<div class="field">
         <span class="field-label">Size</span>
         <div class="option-list">
           ${product.sizes.map((s, i) => `
             <label class="option">
               <input type="radio" name="size" value="${escapeHtml(s.label)}" data-mod="${s.priceModifier}" ${i === 0 ? 'checked' : ''}>
               <span class="option-name">${escapeHtml(s.label)}</span>
               <span class="option-price">${s.priceModifier === 0 ? 'included' : (s.priceModifier > 0 ? '+' : '−') + formatUGX(Math.abs(s.priceModifier)).replace('UGX ', '')}</span>
             </label>`).join('')}
         </div>
       </div>`
    : '';

  const flavourOptions = product.flavours.length
    ? `<div class="field">
         <label for="flavour">Flavour</label>
         <select class="control" id="flavour">
           ${product.flavours.map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('')}
         </select>
       </div>`
    : '';

  const productImages = product.images?.length ? product.images : [{ url: product.imageUrl }];
  area.innerHTML = `
    <div class="product-layout">
      <div class="product-photo">
        <img id="mainProductImage" src="${escapeHtml(productImages[0].url)}" alt="${escapeHtml(product.name)}">
        ${productImages.length > 1 ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">${productImages.map((image, index) => `<button type="button" class="product-thumb" data-image-index="${index}" aria-label="View image ${index + 1}"><img src="${escapeHtml(image.url)}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div>
        <h1>${escapeHtml(product.name)}</h1>
        <p class="product-tagline">${escapeHtml(product.category)}</p>
        <p>${escapeHtml(product.description)}</p>

        <div class="lead-notice">
          We need ${product.leadTimeDays} days' notice for this one — you'll pick a date at checkout.
        </div>

        <form id="customiseForm">
          ${sizeOptions}
          ${flavourOptions}

          <div class="field">
            <label for="icingMessage">Message on the cake <span class="field-hint">optional</span></label>
            <input type="text" class="control" id="icingMessage" maxlength="120" placeholder="Happy Birthday, Aunt Grace!">
            <div class="char-count"><span id="charCount">0</span>/120</div>
          </div>

          <div class="field">
            <label for="notes">Anything else we should know? <span class="field-hint">optional</span></label>
            <textarea class="control" id="notes" maxlength="500" placeholder="Colours, allergies, a design you've seen, how many candles…"></textarea>
          </div>

          <div class="field">
            <label for="quantity">How many?</label>
            <input type="number" class="control" id="quantity" value="1" min="1" max="50" style="max-width:120px;">
          </div>

          <div class="price-summary">
            <div class="price-row"><span>Base price</span><span>${formatUGX(product.basePrice)}</span></div>
            <div class="price-row" id="sizeRow" style="display:none;"><span>Size</span><span id="sizeAmount"></span></div>
            <div class="price-row" id="qtyRow" style="display:none;"><span>Quantity</span><span id="qtyAmount"></span></div>
            <div class="price-row total"><span>Total</span><span id="totalAmount">${formatUGX(product.basePrice)}</span></div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" id="addBtn">Add to basket</button>
        </form>
      </div>
    </div>`;

  const form = document.getElementById('customiseForm');
  const qtyInput = document.getElementById('quantity');
  const messageInput = document.getElementById('icingMessage');

  area.querySelectorAll('[data-image-index]').forEach((button) => {
    button.addEventListener('click', () => {
      document.getElementById('mainProductImage').src = productImages[button.dataset.imageIndex].url;
    });
  });

  function selection() {
    const sizeEl = form.querySelector('input[name="size"]:checked');
    const mod = sizeEl ? Number(sizeEl.dataset.mod) : 0;
    const quantity = Math.max(1, Math.min(50, parseInt(qtyInput.value, 10) || 1));
    const unitPrice = product.basePrice + mod;
    return {
      size: sizeEl ? sizeEl.value : null,
      flavour: document.getElementById('flavour')?.value || null,
      mod, quantity, unitPrice, total: unitPrice * quantity,
    };
  }

  function updateTotals() {
    const s = selection();

    const sizeRow = document.getElementById('sizeRow');
    if (s.mod !== 0) {
      sizeRow.style.display = 'flex';
      document.getElementById('sizeAmount').textContent =
        (s.mod > 0 ? '+ ' : '− ') + formatUGX(Math.abs(s.mod));
    } else {
      sizeRow.style.display = 'none';
    }

    const qtyRow = document.getElementById('qtyRow');
    if (s.quantity > 1) {
      qtyRow.style.display = 'flex';
      document.getElementById('qtyAmount').textContent = `${formatUGX(s.unitPrice)} × ${s.quantity}`;
    } else {
      qtyRow.style.display = 'none';
    }

    document.getElementById('totalAmount').textContent = formatUGX(s.total);
  }

  form.addEventListener('change', updateTotals);
  qtyInput.addEventListener('input', updateTotals);
  messageInput.addEventListener('input', () => {
    document.getElementById('charCount').textContent = messageInput.value.length;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const s = selection();

    addToCart({
      productId: product._id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      leadTimeDays: product.leadTimeDays,
      size: s.size,
      flavour: s.flavour,
      icingMessage: messageInput.value.trim(),
      notes: document.getElementById('notes').value.trim(),
      quantity: s.quantity,
      unitPrice: s.unitPrice,
    });

    const btn = document.getElementById('addBtn');
    btn.textContent = 'Added — opening your basket';
    btn.disabled = true;
    setTimeout(() => { location.href = '/cart'; }, 500);
  });
})();
