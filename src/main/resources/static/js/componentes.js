"use strict";
// Componentes que se actualizan con datos: tarjetas, modal, carrito y resúmenes.
// Las pantallas y formularios principales permanecen en resources/templates.

function inStock(p) {
  return SIZES.some((value) => available(p, value) > 0);
}

function stockFirst(list) {
  return [...list].sort((x, y) => Number(!inStock(x)) - Number(!inStock(y)));
}

function shippingLabel(total) {
  return total >= FREE_SHIPPING
    ? "Gratis (S/ 0.00)"
    : "Por coordinar antes del pago";
}

function closeMenu() {
  document.querySelector(".site-header").classList.remove("menu-open");
  const button = document.querySelector('[data-action="menu"]');
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", "Abrir menú");
}

function closeSearch() {
  document.querySelector(".site-header").classList.remove("search-open");
  $('[data-action="toggle-search"]').setAttribute("aria-expanded", "false");
}

function packMobileBar() {
  return `<button type="button" class="pack-mobile-bar" data-action="pack-review"><span><small>Tu pack · ${pack.reduce((n, l) => n + l.qty, 0)} decants</small><strong>${money(packTotals().total)}</strong></span><span>Ver selección</span></button>`;
}

function count() {
  return cart.reduce((a, l) => a + l.qty, 0);
}

function reserved(id, s, source = cart) {
  return source
    .filter((l) => l.id === id && l.size === s)
    .reduce((a, l) => a + l.qty, 0);
}

function available(p, s) {
  return Math.max(0, (p.stock[s] || 0) - reserved(p.id, s));
}

function card(p, mode = "cart") {
  const s = size(p.id),
    disabled = available(p, s) <= 0;
  return `<article class="card ${!inStock(p) ? "sold-out" : ""}">
    <button class="card-image" data-action="detail" data-id="${p.id}" aria-label="Ver ${esc(p.name)}">
      ${!inStock(p) ? '<span class="badge">Agotado</span>' : p.discount ? `<span class="badge sale">−${p.discount}%</span>` : ""}
      <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" width="300" height="330">
      <span class="quick-view">${icon("eye")} Ver perfume</span>
    </button>
    <div class="card-info"><span class="brand">${esc(p.brand)}</span>
      <h3><button data-action="detail" data-id="${p.id}">${esc(p.name)}</button></h3>
      <div class="card-price">${p.discount ? `<del>${money(p.prices[s])}</del>` : ""}<strong>${money(unit(p, s))} <small>PEN</small></strong></div>
      <div class="size-options" aria-label="Tamaño de ${esc(p.name)}">${SIZES.map((v) => `<button data-action="size" data-id="${p.id}" data-size="${v}" aria-pressed="${s === v}" class="${s === v ? "selected" : ""} ${available(p, v) <= 0 ? "unavailable" : ""}" aria-label="${v} ml${available(p, v) <= 0 ? ", agotado" : ""}">${v} ml</button>`).join("")}</div>
      <button class="card-add" data-action="${mode === "pack" ? "pack-add" : "add"}" data-id="${p.id}" ${disabled ? "disabled" : ""}>${icon("plus")}${disabled ? "Tamaño agotado" : mode === "pack" ? "Añadir al pack" : "Añadir al carrito"}</button>
    </div>
  </article>`;
}

function intro(eyebrow, title, desc) {
  return `<section class="page-head"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${desc ? `<p>${desc}</p>` : ""}</section>`;
}

function filtered() {
  let q = filter.q.toLocaleLowerCase();
  let list = products.filter(
    (p) =>
      (p.name + " " + p.brand + " " + p.notes)
        .toLocaleLowerCase()
        .includes(q) &&
      (!filter.brand || p.brand === filter.brand) &&
      (!filter.occasion || p.occasion === filter.occasion) &&
      (!filter.category || categoryMatch(p, filter.category)),
  );
  if (filter.sort === "price-up")
    list.sort((a, b) => unit(a, size(a.id)) - unit(b, size(b.id)));
  if (filter.sort === "price-down")
    list.sort((a, b) => unit(b, size(b.id)) - unit(a, size(a.id)));
  if (filter.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  return stockFirst(list);
}

function filters() {
  return `<aside class="filters"><div class="filter-heading">${icon("settings")} Filtrar colección</div>
    <label for="search">BUSCAR PERFUME</label><input id="search" class="field" placeholder="Nombre, marca o nota…" value="${esc(filter.q)}" type="search">
    <label for="brand-filter">MARCA</label><select id="brand-filter" class="field"><option value="">Todas las marcas</option>${[
      ...new Set(products.map((p) => p.brand)),
    ]
      .sort()
      .map(
        (b) =>
          `<option ${b === filter.brand ? "selected" : ""}>${esc(b)}</option>`,
      )
      .join("")}</select>
    <label for="category-filter">TU ESTILO</label><select class="field" id="category-filter"><option value="">Todos los aromas</option>${["Verano", "Invierno", "Dulce", "Amaderado", "Limpio", "Floral"].map((c) => `<option ${filter.category === c ? "selected" : ""}>${c}</option>`).join("")}</select>
    <label>OCASIÓN</label><div class="filter-buttons">${["", "Día", "Noche"].map((o) => `<button class="${filter.occasion === o ? "selected" : ""}" data-action="occasion" data-value="${o}">${o || "Todas"}</button>`).join("")}</div>
    <div class="format-note">${icon("bottle")}<p><b>Una fragancia, tres tamaños.</b><br>3 ml para probar · 5 ml para descubrir<br>10 ml para llevar contigo</p></div><button class="text-link clear" data-action="clear-filters">Limpiar filtros ${icon("close")}</button>
  </aside>`;
}

function toolbar() {
  return `<div class="toolbar"><span id="result-count">${filtered().length} fragancias para descubrir</span><select id="sort" aria-label="Ordenar perfumes">${[
    ["featured", "Nuestra selección"],
    ["price-up", "Menor precio"],
    ["price-down", "Mayor precio"],
    ["name", "Nombre A–Z"],
  ]
    .map(
      ([v, t]) =>
        `<option value="${v}" ${filter.sort === v ? "selected" : ""}>${t}</option>`,
    )
    .join("")}</select></div>`;
}

function gridContent(mode = "cart") {
  return (
    filtered()
      .map((p) => card(p, mode))
      .join("") ||
    '<div class="empty"><h2>No encontramos ese aroma.</h2><p>Prueba otra marca, nota o nombre.</p><button class="btn light" data-action="clear-filters">Ver todos los perfumes</button></div>'
  );
}

function packQualifies(lines) {
  return new Set(lines.map((l) => l.id)).size >= 3;
}

function packTotals() {
  return linesTotals(pack, true);
}

function packSummary() {
  let t = packTotals(),
    distinct = new Set(pack.map((l) => l.id)).size;
  return `<div class="eyebrow">Hecho por ti</div><h2>Tu colección</h2><p class="hint">Mezcla 3 ml, 5 ml y 10 ml como prefieras.</p><div class="progress"><span style="width:${Math.min(100, (distinct / 3) * 100)}%"></span></div><p class="hint">${distinct >= 3 ? `${packDiscount}% de descuento de pack disponible` : `Elige ${3 - distinct} perfume${3 - distinct === 1 ? "" : "s"} distinto${3 - distinct === 1 ? "" : "s"} más para el ${packDiscount}% de descuento.`}</p><div class="pack-list">${pack.map((l, i) => `<div class="pack-line"><img src="${esc(get(l.id).image)}" alt=""><div>${esc(get(l.id).name)}<br><small>${l.size} ml × ${l.qty} · ${money(get(l.id).prices[l.size] * l.qty)}</small></div><button data-action="pack-remove" data-id="${i}" aria-label="Quitar ${esc(get(l.id).name)}">×</button></div>`).join("") || '<p class="hint">Tu próximo favorito te está esperando. Añade perfumes de la colección.</p>'}</div><div class="summary-row"><span>Subtotal</span><span>${money(t.base)}</span></div><div class="summary-row"><span>Tu ahorro</span><span>−${money(t.saving)}</span></div><div class="summary-row total"><strong>Total del pack</strong><strong>${money(t.total)}</strong></div><button class="btn" data-action="pack-cart" ${pack.length ? "" : "disabled"}>Añadir pack al carrito ↗</button><p class="hint">Los descuentos no se acumulan: aplicamos la mejor opción. Envío por coordinar.</p>`;
}

function cartTotals() {
  let base = 0,
    total = 0;
  const groups = new Map();
  for (const l of cart) {
    if (!groups.has(l.group || "regular")) groups.set(l.group || "regular", []);
    groups.get(l.group || "regular").push(l);
  }
  for (const [key, lines] of groups) {
    let b = lines.reduce((a, l) => a + get(l.id).prices[l.size] * l.qty, 0),
      d = lines.reduce((a, l) => a + unit(get(l.id), l.size) * l.qty, 0);
    base += b;
    total +=
      key !== "regular" && packQualifies(lines)
        ? Math.min(d, b * (1 - packDiscount / 100))
        : d;
  }
  return { base, total: +total.toFixed(2), saving: +(base - total).toFixed(2) };
}

function cartPage() {
  let t = cartTotals();
  return (
    intro(
      "Tu selección",
      "Pequeños frascos.<br><em>Grandes elecciones.</em>",
      "Revisa tu selección. El vendedor confirmará disponibilidad, envío y forma de pago.",
    ) +
    `<section class="section" style="padding-top:15px">${
      !cart.length
        ? `<div class="empty"><h2>Tu carrito aún no tiene un aroma.</h2><p>Encuentra ese perfume que quieres probar.</p><a class="btn" href="#catalogo">Explorar perfumes ↗</a></div>`
        : `<div class="split"><div>${cart
            .map((l, i) => {
              let p = get(l.id);
              return `<article class="cart-row"><img src="${esc(p.image)}" alt="${esc(p.name)}"><div><span class="brand">${esc(p.brand)}</span><h3>${esc(p.name)}</h3><p>${l.size} ml · ${l.group ? "Parte de tu pack" : "Decant individual"}</p><div class="quantity"><button data-action="quantity" data-id="${i}" data-delta="-1" aria-label="Reducir cantidad">−</button><span>${l.qty}</span><button data-action="quantity" data-id="${i}" data-delta="1" aria-label="Aumentar cantidad">+</button></div><button class="remove" data-action="remove" data-id="${i}">Quitar</button></div><strong>${money(p.prices[l.size] * l.qty)}</strong></article>`;
            })
            .join(
              "",
            )}<p class="hint">Los precios por línea se muestran antes de descuentos. El resumen aplica las ofertas disponibles.</p><a class="text-link" href="#catalogo">← Seguir descubriendo</a></div><aside class="panel"><h2>Tu pedido</h2><div class="summary-row"><span>Subtotal (${count()} decants)</span><span>${money(t.base)}</span></div><div class="summary-row"><span>Descuentos</span><span>−${money(t.saving)}</span></div><div class="summary-row"><span>Envío</span><span>${shippingLabel(t.total)}</span></div><div class="summary-row total"><strong>Total</strong><strong>${money(t.total)}</strong></div><p class="hint">${t.total >= FREE_SHIPPING ? "Alcanzaste el envío gratis desde S/ 200." : `Te faltan ${money(FREE_SHIPPING - t.total)} para el envío gratis.`} <a href="#envios">Ver condiciones de entrega</a>.</p>${DecanlyPedido.fields()}</aside></div>`
    }</section>`
  );
}

function detail(id, view = detailView) {
  const p = get(id);
  if (!p) return;
  const gallery = DecanlyGallery.markup(p, view);
  detailView = gallery.view;
  const s = size(p.id),
    ready = available(p, s) > 0;
  modal.classList.add("perfume-dialog");
  modal.setAttribute("aria-label", p.name);
  modal.innerHTML = `<div class="modal-content"><button class="close" data-action="close" aria-label="Cerrar detalle">${icon("close")}</button><div class="detail">
    ${gallery.html}
    <div class="detail-copy"><span class="brand">${esc(p.brand)}</span><h2>${esc(p.name)}</h2><span class="detail-rule"></span><span class="size-label">SELECCIONA TU TAMAÑO</span>
    <div class="detail-sizes">${SIZES.map((v) => `<button data-action="detail-size" data-id="${p.id}" data-size="${v}" aria-pressed="${s === v}" class="${s === v ? "selected" : ""} ${available(p, v) <= 0 ? "unavailable" : ""}"><span class="radio-dot"></span><b>${v} ml</b><strong>${money(unit(p, v))}</strong><small>${available(p, v) > 0 ? (v === "3" ? "Para probar" : v === "5" ? "Para descubrir" : "Tu favorito diario") : "Agotado"}</small></button>`).join("")}</div>
    <div class="detail-actions"><button class="btn outline" data-action="${route === "packs" ? "pack-add" : "add"}" data-id="${p.id}" ${ready ? "" : "disabled"}>${icon("bag")} ${ready ? (route === "packs" ? "Agregar al pack" : "Agregar al carrito") : "Tamaño agotado"}</button><button class="btn" data-action="buy-now" data-id="${p.id}" ${ready ? "" : "disabled"}>Comprar ahora ${icon("arrow")}</button></div>
    <p id="detail-feedback" class="detail-feedback" role="status" aria-live="polite"></p><ul class="detail-perks"><li>${icon("check")} Delivery gratis desde S/ 200</li><li>${icon("check")} Envíos a todo el Perú</li><li>${icon("check")} Coordina tu entrega por WhatsApp</li></ul>
    <div class="detail-trust"><span>${icon("shield")}Perfume<br>original</span><span>${icon("bottle")}Atomizador<br>de vidrio</span><span>${icon("truck")}Entrega<br>coordinada</span></div>
    <p class="hint">Recibirás un decant de ${s} ml. El frasco original de la foto no está incluido.</p></div></div></div>`;
  if (!modal.open) modal.showModal();
}

function linesTotals(lines, isPack = false) {
  const base = lines.reduce(
    (sum, l) => sum + get(l.id).prices[l.size] * l.qty,
    0,
  );
  const individual = lines.reduce(
    (sum, l) => sum + unit(get(l.id), l.size) * l.qty,
    0,
  );
  const total = +(
    isPack && packQualifies(lines)
      ? Math.min(individual, base * (1 - packDiscount / 100))
      : individual
  ).toFixed(2);
  return { base: +base.toFixed(2), total, saving: +(base - total).toFixed(2) };
}

function promoAvailable(pr) {
  if (!pr.items.length) return false;
  const needs = new Map();
  for (const l of pr.items) {
    if (!get(l.id)) return false;
    const key = l.id + "-" + l.size;
    needs.set(key, (needs.get(key) || 0) + l.qty);
  }
  return pr.items.every(
    (l) => available(get(l.id), l.size) >= needs.get(l.id + "-" + l.size),
  );
}

function capturePromoRows() {
  editingPackItems = Array.from(
    document.querySelectorAll(".promo-editor-row"),
  ).map((row) => ({
    id: Number(row.querySelector('[name="perfume"]').value),
    size: row.querySelector('[name="size"]').value,
    qty: Number(row.querySelector('[name="quantity"]').value),
  }));
}

function promoEditorRows() {
  return editingPackItems
    .map(
      (l, i) =>
        `<div class="promo-editor-row"><label>Perfume<select class="field" name="perfume" required>${products.map((p) => `<option value="${p.id}" ${p.id === l.id ? "selected" : ""}>${esc(p.name)} · ${esc(p.brand)}</option>`).join("")}</select></label><label>Tamaño<select class="field" name="size"><option value="3" ${l.size === "3" ? "selected" : ""}>3 ml</option><option value="5" ${l.size === "5" ? "selected" : ""}>5 ml</option><option value="10" ${l.size === "10" ? "selected" : ""}>10 ml</option></select></label><label>Cantidad<input class="field" name="quantity" type="number" min="1" max="10" step="1" required value="${l.qty}"></label><button type="button" class="btn light" data-action="promo-remove-row" data-id="${i}" aria-label="Quitar perfume ${i + 1}">×</button></div>`,
    )
    .join("");
}

function safeHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function promoLines(pr) {
  const chosen = promoSizes[pr.id];
  return pr.items.map((l) => ({ ...l, size: chosen || l.size }));
}

function promoCard(pr) {
  const lines = promoLines(pr),
    total = linesTotals(lines, true),
    ready = promoAvailable({ items: lines });
  const sizes = new Set(lines.map((l) => l.size));
  const current = sizes.size === 1 ? lines[0].size : "mixed";
  return `<article class="promo ${ready ? "" : "sold-out"}"><div class="promo-images"><span class="badge sale">${ready ? `PACK · ${packDiscount}%` : "Agotado"}</span>${lines.map((l) => `<img src="${esc(get(l.id).image)}" alt="${esc(get(l.id).name)}" loading="lazy">`).join("")}</div>${pr.badge ? `<span class="promo-editorial">${icon("sparkle")}${esc(pr.badge)}</span>` : '<span class="brand">LA SELECCIÓN DECANLY</span>'}<h3>${esc(pr.title)}</h3><p class="promo-description">${esc(pr.text)}</p><div class="promo-price">${total.saving ? `<del>${money(total.base)}</del>` : ""}<strong>${money(total.total)} <small>PEN</small></strong></div><div class="size-options">${SIZES.map((v) => `<button data-action="promo-size" data-id="${pr.id}" data-size="${v}" class="${current === v ? "selected" : ""}" aria-pressed="${current === v}" aria-label="Todos los decants de ${v} ml">${v} ml</button>`).join("")}${current === "mixed" ? '<span class="mixed-label">Mixto</span>' : ""}</div><details class="promo-includes"><summary>Ver los ${lines.length} perfumes</summary><ul>${lines.map((l) => `<li>${esc(get(l.id).name)} <span>${l.qty} × ${l.size} ml</span></li>`).join("")}</ul></details><div class="promo-actions"><button class="btn outline" data-action="promo-cart" data-id="${pr.id}" ${ready ? "" : "disabled"}>Agregar al carrito ${icon("plus")}</button><button class="btn" data-action="promo-buy" data-id="${pr.id}" ${ready ? "" : "disabled"}>Comprar ahora ${icon("arrow")}</button><button class="text-link" data-action="choose-promo" data-id="${pr.id}" ${ready ? "" : "disabled"}>Personalizar este pack</button></div></article>`;
}

function categoryMatch(p, category) {
  const notes = p.notes
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (category === "Verano") return p.occasion === "Día";
  if (category === "Invierno") return p.occasion === "Noche";
  if (category === "Dulce")
    return /vainilla|caramelo|miel|haba tonka|toffee/.test(notes);
  if (category === "Amaderado")
    return /amaderado|sandalo|cedro|vetiver|pachuli/.test(notes);
  if (category === "Floral")
    return /floral|jazmin|iris|lavanda|geranio|rosa/.test(notes);
  if (category === "Limpio")
    return /almizcle|marino|bergamota|lima|limon/.test(notes);
  return true;
}

function adminRows(q = "") {
  return (
    products
      .filter((p) =>
        (p.name + " " + p.brand).toLowerCase().includes(q.toLowerCase()),
      )
      .map(
        (p) =>
          `<tr><td><div class="admin-product"><img src="${esc(p.image)}" alt=""><div><b>${esc(p.name)}</b><small>${esc(p.brand)}</small></div></div></td><td data-label="Precios 3 / 5 / 10 ml">${SIZES.map((v) => `<span class="table-price">${money(p.prices[v])}</span>`).join(" / ")}</td><td data-label="Stock 3 / 5 / 10 ml"><div class="stock-chips">${SIZES.map((v) => `<span class="${p.stock[v] === 0 ? "zero" : ""}" title="${v} ml">${p.stock[v]}</span>`).join("")}</div></td><td data-label="Oferta"><span class="discount-chip">${p.discount}%</span></td><td><div class="table-actions"><button class="circle-btn" data-action="edit-product" data-id="${p.id}" aria-label="Editar ${esc(p.name)}" title="Editar">${icon("edit")}</button><button class="btn light" data-action="stock-zero" data-id="${p.id}" ${SIZES.every((v) => p.stock[v] === 0) ? "disabled" : ""}>Agotar</button></div></td></tr>`,
      )
      .join("") || '<tr><td colspan="5">No se encontraron perfumes.</td></tr>'
  );
}

function adminPromos() {
  return `<div class="admin-section-title"><div><h2>Promociones y packs</h2><p>Combinaciones que invitan a descubrir más.</p></div><button class="btn" data-action="new-promo">${icon("plus")} Nuevo pack</button></div><form id="promo-settings" class="promo-settings"><div>${icon("tag")}<label for="pack-discount"><b>Descuento de packs</b><small>Desde 3 perfumes diferentes. Sin acumular ofertas.</small></label></div><div class="promo-setting-actions"><input id="pack-discount" aria-label="Porcentaje de descuento en packs" class="field" type="number" min="0" max="70" step="1" value="${packDiscount}" required><span>%</span><button class="btn" type="submit">Guardar</button><button class="text-link" type="button" data-action="clear-promos">Desactivar</button></div></form><div class="admin-pack-grid">${promos.map((pr) => `<article class="admin-pack-card"><div class="admin-pack-art">${pr.items.map((l) => `<img src="${esc(get(l.id).image)}" alt="${esc(get(l.id).name)}">`).join("")}<span class="status-pill ${pr.active ? "" : "inactive"}">${pr.active ? "Publicado" : "Oculto"}</span></div><div class="admin-pack-info"><h3>${esc(pr.title)}</h3><p>${pr.items.length} perfumes · ${money(linesTotals(pr.items, true).total)}</p><div><button class="btn light" data-action="edit-promo" data-id="${pr.id}">${icon("edit")} Editar</button><button class="btn light" data-action="toggle-promo" data-id="${pr.id}">${icon("eye")} ${pr.active ? "Ocultar" : "Publicar"}</button></div></div></article>`).join("")}</div>`;
}

function legalLayout(title, body) {
  return (
    intro("Información para tu compra", title, "") +
    `<section class="section legal-content">${body}</section>`
  );
}
function termsPage() {
  return legalLayout(
    "Términos <em>y condiciones.</em>",
    `<h2>Qué estás comprando</h2><p>Ofrecemos decants de 3 ml, 5 ml y 10 ml: perfume transferido del frasco original a un atomizador. Las fotografías identifican la fragancia; no incluyen el frasco de marca ni su caja. Las marcas pertenecen a sus respectivos titulares.</p><h2>Precios y promociones</h2><p>Los precios se expresan en soles (S/). El descuento de pack se aplica desde tres perfumes distintos. No se acumula con las ofertas individuales: se elige el menor importe. Si cambias tu selección, el total se recalcula.</p><h2>Pedidos y pago</h2><p>Al preparar tu pedido se genera una referencia y el mensaje para WhatsApp. El pedido queda pendiente de coordinación; este paso no acredita un pago. Revisa con el vendedor el importe final, la entrega y los datos de Yape, Plin o BCP antes de pagar. Solicita tu comprobante.</p><h2>Entrega y atención</h2><p>El envío es gratis desde S/ 200 en productos después de descuentos. Para importes menores, la tarifa se coordina antes del pago. El plazo de entrega se acuerda por WhatsApp.</p><p>Si recibes un producto incorrecto o dañado, contáctanos para atender tu caso. Estas condiciones no limitan tus derechos como consumidor.</p><p><a href="#envios">Condiciones de envío</a> · <a href="#privacidad">Privacidad</a></p><p>WhatsApp: <a href="https://wa.me/51936240578">+51 936 240 578</a> · <a href="mailto:decanly@gmail.com">decanly@gmail.com</a></p>`,
  );
}
function shippingPage() {
  return legalLayout(
    "Envíos <em>y atención.</em>",
    `<h2>A todo el Perú</h2><p>Coordinamos la entrega de tu pedido por WhatsApp. Indica tu dirección completa en el formulario y acuerda con el vendedor el plazo y la forma de entrega antes del pago.</p><h2>Delivery gratis desde S/ 200</h2><p>El mínimo se calcula después de los descuentos. Para pedidos menores, consulta la tarifa antes de pagar. El total de productos se muestra por separado de cualquier envío pendiente de coordinación.</p><h2>¿Tienes un inconveniente?</h2><p>Escríbenos con la referencia de tu pedido y cuéntanos qué ocurrió. Si el producto está dañado o es distinto a lo solicitado, puedes adjuntar fotografías para facilitar la atención.</p><p><a href="https://wa.me/51936240578">+51 936 240 578</a> · <a href="mailto:decanly@gmail.com">decanly@gmail.com</a></p>`,
  );
}
function privacyPage() {
  return legalLayout(
    "Política <em>de privacidad.</em>",
    `<h2>Datos de tu pedido</h2><p>Solicitamos nombre, WhatsApp y dirección para atender tu compra, coordinar la entrega y brindar atención posventa. No te suscribimos a publicidad.</p><h2>WhatsApp</h2><p>Al confirmar, los datos de contacto, la dirección y los productos seleccionados se incluyen en un enlace de WhatsApp. Revisa el mensaje y decide si deseas enviarlo. El uso de WhatsApp está sujeto a las políticas de ese servicio.</p><h2>Tu información</h2><p>El carrito conserva tu selección en esta pestaña. La información que compartes para un pedido se utiliza para gestionar tu solicitud y atender las obligaciones correspondientes. Puedes consultar el tratamiento de tus datos y solicitar acceso, rectificación, cancelación u oposición escribiendo a <a href="mailto:decanly@gmail.com">decanly@gmail.com</a>.</p>`,
  );
}
