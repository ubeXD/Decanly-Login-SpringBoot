"use strict";

// Interacciones de las vistas Thymeleaf. Las escrituras pasan siempre por DecanlyAPI.
const busyForms = new WeakSet();
const submittedRequests = new WeakMap();
async function requestKeyFor(form, payload) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const signature = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoded)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  let request = submittedRequests.get(form);
  if (!request) {
    try {
      request = JSON.parse(
        sessionStorage.getItem("decanly-pending-key") || "null",
      );
    } catch {}
  }
  if (!request || request.signature !== signature) {
    request = { signature, key: crypto.randomUUID() };
    submittedRequests.set(form, request);
    sessionStorage.setItem("decanly-pending-key", JSON.stringify(request));
  }
  return request.key;
}
const adminPages = /^(producto|promocion|pedidos)\//;
let receiptText = "";
function feedback(form, message, error = false) {
  let node = form.querySelector(".form-feedback");
  if (!node) {
    node = document.createElement("p");
    node.className = "form-feedback";
    node.setAttribute("role", "status");
    form.append(node);
  }
  node.classList.toggle("error", error);
  node.textContent = message;
}
function showError(error) {
  toast(error.message || "No se pudo completar la acción.");
}
function queryFilter() {
  const q = new URLSearchParams(location.search);
  filter = {
    q: q.get("q") || "",
    brand: q.get("marca") || "",
    category: q.get("estilo") || "",
    occasion: q.get("ocasion") || "",
    sort: q.get("orden") || "featured",
  };
}
function rememberFilters() {
  const q = new URLSearchParams();
  for (const [key, value] of [
    ["q", filter.q],
    ["marca", filter.brand],
    ["estilo", filter.category],
    ["ocasion", filter.occasion],
    ["orden", filter.sort === "featured" ? "" : filter.sort],
  ])
    if (value) q.set(key, value);
  history.replaceState(null, "", location.pathname + (q.size ? "?" + q : ""));
}
function paintCatalog(initial = false) {
  if (initial && $(".filters")) $(".filters").outerHTML = filters();
  if ($("#search")) $("#search").value = filter.q;
  if ($("#brand-filter")) $("#brand-filter").value = filter.brand;
  if ($("#category-filter")) $("#category-filter").value = filter.category;
  if ($("#sort")) $("#sort").value = filter.sort;
  document
    .querySelectorAll('[data-action="occasion"]')
    .forEach((b) =>
      b.classList.toggle("selected", b.dataset.value === filter.occasion),
    );
  put($("#product-grid"), gridContent(route === "packs" ? "pack" : "cart"));
  if ($("#result-count"))
    $("#result-count").textContent =
      filtered().length + " fragancias para descubrir";
  if (route === "catalogo" && $(".page-head h1"))
    $(".page-head h1").textContent =
      filter.brand ||
      (filter.category
        ? "Aromas " + filter.category.toLowerCase()
        : "Tu próximo favorito.");
}
function paintPack() {
  put($("#pack-summary"), packSummary());
  if ($(".pack-mobile-bar")) $(".pack-mobile-bar").outerHTML = packMobileBar();
}
function paintCart() {
  const saved = DecanlyPedido.snapshot($("#checkout"));
  const holder = document.createElement("div");
  holder.innerHTML = cartPage();
  const section = holder.querySelector(".section"),
    current = app.querySelector(".section");
  if (current) current.replaceWith(section);
  else app.append(section);
  normalize(app);
  DecanlyPedido.restore($("#checkout"), saved);
}

function paintPromos() {
  const active = promos
    .filter((p) => p.active)
    .sort(
      (a, b) =>
        Number(!promoAvailable({ items: promoLines(a) })) -
        Number(!promoAvailable({ items: promoLines(b) })),
    );
  const shown = route === "inicio" ? active.slice(0, 3) : active;
  put(
    $(".promo-grid"),
    shown.map(promoCard).join("") ||
      '<div class="empty"><h2>Pronto tendremos más packs.</h2><a class="btn" href="#packs">Arma tu pack</a></div>',
  );
  if ($(".promotion-note b"))
    $(".promotion-note b").textContent = packDiscount + "% de ahorro";
  if (route === "promociones") {
    const grid = $(".promotions-section > .grid");
    if (grid)
      put(
        grid,
        stockFirst(products.filter((p) => p.discount > 0))
          .map((p) => card(p))
          .join(""),
      );
  }
}
function paintStats() {
  const values = [
    products.length,
    products.filter((p) => SIZES.some((s) => p.stock[s] > 0)).length,
    promos.filter((p) => p.active).length,
    products.filter((p) => p.discount > 0).length,
  ];
  document
    .querySelectorAll(".stat strong")
    .forEach((n, i) => (n.textContent = values[i]));
}
function paintAdmin() {
  paintStats();
  if (currentPage === "producto/index") {
    put($("#admin-rows"), adminRows($("#admin-search")?.value || ""));
    document.querySelectorAll(".table-actions").forEach((n) => {
      const id = n.querySelector('[data-action="edit-product"]').dataset.id;
      n.insertAdjacentHTML(
        "beforeend",
        `<button class="circle-btn delete-button" data-action="delete-product" data-id="${id}" aria-label="Eliminar perfume" title="Eliminar">${icon("close")}</button>`,
      );
    });
    if ($(".admin-toolbar .hint"))
      $(".admin-toolbar .hint").textContent =
        products.length + " perfumes · 3 tamaños";
  } else if (currentPage === "promocion/index") {
    put($("#admin-content"), adminPromos());
    document.querySelectorAll(".admin-pack-info>div").forEach((n) => {
      const id = n.querySelector('[data-action="edit-promo"]').dataset.id;
      n.insertAdjacentHTML(
        "beforeend",
        `<button class="circle-btn delete-button" data-action="delete-promo" data-id="${id}" aria-label="Eliminar pack">${icon("close")}</button>`,
      );
    });
  }
}
function paintProductForm() {
  const form = $("#product-form");
  if (!form) return;
  const id =
    currentPage === "producto/edit"
      ? Number(new URLSearchParams(location.search).get("id") || 1)
      : 0;
  const p = id ? get(id) : null;
  if (id && !p) {
    put(
      $(".editor-page"),
      '<h2>Este perfume ya no está disponible.</h2><a href="' +
        pathTo("/producto") +
        '" class="btn">Volver a productos</a>',
    );
    return;
  }
  form.dataset.id = id;
  if (p) {
    for (const name of ["name", "brand", "occasion", "notes", "discount"])
      form.elements.namedItem(name).value = p[name];
    SIZES.forEach((s) => {
      form.elements.namedItem("price" + s).value = p.prices[s];
      form.elements.namedItem("stock" + s).value = p.stock[s];
    });
  }
  const photo = form.elements.namedItem("photo");
  photo.required = !id;
  const preview = document.createElement("div");
  preview.className = "photo-preview wide";
  preview.id = "photo-preview";
  if (p)
    put(
      preview,
      `<img src="${esc(p.image)}" alt="Fotografía actual"><span>Fotografía actual. Selecciona otra para reemplazarla.</span>`,
    );
  photo.closest("label").after(preview);
  const hint = document.createElement("p");
  hint.className = "hint wide";
  hint.textContent = "Imagen PNG, JPG o WebP, hasta 2 MB.";
  preview.after(hint);
  DecanlyGallery.mount(form, p || {});
}
function paintPackForm() {
  const form = $("#promo-form");
  if (!form) return;
  const id =
    currentPage === "promocion/edit"
      ? Number(new URLSearchParams(location.search).get("id") || 1)
      : 0;
  const p = id ? promos.find((p) => p.id === id) : null;
  if (id && !p) {
    put(
      $(".editor-page"),
      '<h2>Este pack ya no está disponible.</h2><a href="' +
        pathTo("/promocion") +
        '" class="btn">Volver a packs</a>',
    );
    return;
  }
  form.dataset.id = id;
  if (p) {
    form.elements.namedItem("title").value = p.title;
    form.elements.namedItem("description").value = p.text;
    form.elements.namedItem("badge").value = p.badge || "";
    form.elements.namedItem("active").checked = p.active;
  }
  editingPackItems = p
    ? structuredClone(p.items)
    : products.slice(0, 3).map((p) => ({ id: p.id, size: "5", qty: 1 }));
  paintPackRows();
}
function paintPackRows() {
  put($("#promo-editor-rows"), promoEditorRows());
  $('#promo-form [data-action="promo-add-row"]').disabled =
    editingPackItems.length >= 6;
  let total = $("#pack-editor-total");
  if (!total) {
    total = document.createElement("p");
    total.id = "pack-editor-total";
    total.className = "notice";
    $("#promo-editor-rows").after(total);
  }
  total.textContent =
    "Precio de vista previa: " +
    money(linesTotals(editingPackItems, true).total);
}
function openDetail(id, view = null, inline = false) {
  if (!get(id)) {
    toast("Este perfume ya no está disponible.");
    return;
  }
  // El mismo componente sirve para el modal y la pantalla de detalle.
  detail(id, view);
  normalize(modal);
  if (inline) {
    put($("#standalone-detail"), modal.innerHTML);
    $("#standalone-detail .close")?.remove();
    modal.close();
    modal.innerHTML = "";
  }
  const host = inline ? $("#standalone-detail") : modal;
  DecanlyGallery.mountCarousel(
    host.querySelector(".detail-gallery"),
    (view) => {
      detailView = view;
    },
  );
}
function paintAfterSelection() {
  saveBasket();
  if (route === "carrito") paintCart();
  if (route === "packs") {
    paintPack();
    paintCatalog();
  }
}
function addProduct(id, target = "cart") {
  const p = get(id),
    s = size(id);
  if (!p) return false;
  const dest = target === "pack" ? pack : cart;
  const pending = target === "pack" ? reserved(id, s, pack) : 0;
  if (available(p, s) <= pending) {
    toast("No hay más unidades de este tamaño disponibles.");
    return false;
  }
  let line = dest.find((l) => l.id === id && l.size === s && !l.group);
  if (line) line.qty++;
  else dest.push({ id, size: s, qty: 1 });
  paintAfterSelection();
  return true;
}
function addPromo(id, buy = false) {
  const pr = promos.find((p) => p.id === id && p.active);
  if (!pr) return;
  const items = promoLines(pr);
  if (!promoAvailable({ items })) {
    toast("Este tamaño de pack está agotado.");
    return;
  }
  const group = "pack-" + crypto.randomUUID();
  cart.push(...items.map((l) => ({ ...l, group })));
  saveBasket();
  if (buy) navigate("/carrito");
  else {
    paintPromos();
    toast("Pack añadido al carrito.");
  }
}
async function confirmAction(title, message) {
  const dialog = $("#confirm-modal");
  put(
    dialog,
    `<div class="modal-content"><h2>${esc(title)}</h2><p>${esc(message)}</p><div class="confirm-actions"><button class="btn light" data-confirm="no">Cancelar</button><button class="btn" data-confirm="yes">Confirmar</button></div></div>`,
  );
  dialog.showModal();
  return new Promise((resolve) => {
    const finish = (value) => {
      dialog.removeEventListener("click", click);
      dialog.removeEventListener("cancel", cancel);
      dialog.close();
      resolve(value);
    };
    const click = (e) => {
      const b = e.target.closest("[data-confirm]");
      if (b) finish(b.dataset.confirm === "yes");
    };
    const cancel = (e) => {
      e.preventDefault();
      finish(false);
    };
    dialog.addEventListener("click", click);
    dialog.addEventListener("cancel", cancel);
  });
}
function groupOrderPreview() {
  const totals = cartTotals();
  return {
    lines: cart.map((l) => ({
      ...l,
      brand: get(l.id).brand,
      name: get(l.id).name,
    })),
    total: totals.total,
    shipping: shippingLabel(totals.total),
  };
}

document.addEventListener("click", async (e) => {
  if (e.target.closest("#main-nav a")) closeMenu();
  const b = e.target.closest("[data-action]");
  if (!b || b.disabled) return;
  const action = b.dataset.action,
    id = Number(b.dataset.id);
  if (action === "reload-data") {
    location.reload();
    return;
  }
  if (!ready && action !== "reset-local") {
    toast("Espera a que carguen los datos.");
    return;
  }
  try {
    if (action === "menu") {
      const open = $(".site-header").classList.toggle("menu-open");
      b.setAttribute("aria-expanded", open);
      b.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      if (open) closeSearch();
    } else if (action === "toggle-search") {
      closeMenu();
      const open = $(".site-header").classList.toggle("search-open");
      b.setAttribute("aria-expanded", String(open));
      if (open) $("#header-search").focus();
    } else if (action === "brand" || action === "category") {
      e.preventDefault();
      navigate(
        "/catalogo?" +
          (action === "brand"
            ? "marca=" + encodeURIComponent(b.dataset.brand)
            : "estilo=" + encodeURIComponent(b.dataset.category)),
      );
    } else if (action === "clear-filters") {
      filter = {
        q: "",
        brand: "",
        category: "",
        occasion: "",
        sort: "featured",
      };
      paintCatalog();
      rememberFilters();
    } else if (action === "occasion") {
      filter.occasion = b.dataset.value;
      paintCatalog();
      rememberFilters();
    } else if (action === "size") {
      selected[id] = b.dataset.size;
      b.closest(".card").outerHTML = card(
        get(id),
        route === "packs" ? "pack" : "cart",
      );
      normalize(app);
      saveBasket();
    } else if (action === "detail") openDetail(id);
    else if (action === "detail-view")
      DecanlyGallery.select(b.closest(".detail-gallery"), b.dataset.view);
    else if (action === "detail-size") {
      selected[id] = b.dataset.size;
      saveBasket();
      openDetail(id, detailView, Boolean(b.closest("#standalone-detail")));
    } else if (action === "close") modal.close();
    else if (
      action === "add" ||
      action === "pack-add" ||
      action === "buy-now"
    ) {
      if (addProduct(id, action === "pack-add" ? "pack" : "cart")) {
        if (action === "buy-now") {
          modal.close();
          navigate("/carrito");
          return;
        }
        const cardNode = b.closest(".card");
        if (cardNode?.isConnected) {
          cardNode.outerHTML = card(
            get(id),
            route === "packs" ? "pack" : "cart",
          );
          normalize(app);
        }
        if (modal.open) {
          openDetail(id, detailView);
          $("#detail-feedback").textContent =
            "Añadido " + (action === "pack-add" ? "al pack." : "al carrito.");
        } else
          toast(
            action === "pack-add"
              ? "Añadido a tu pack."
              : "Añadido al carrito.",
          );
      }
    } else if (action === "promo-size") {
      promoSizes[id] = b.dataset.size;
      b.closest(".promo").outerHTML = promoCard(
        promos.find((p) => p.id === id),
      );
      normalize(app);
      saveBasket();
    } else if (action === "promo-cart" || action === "promo-buy")
      addPromo(id, action === "promo-buy");
    else if (action === "choose-promo") {
      const pr = promos.find((p) => p.id === id && p.active);
      if (!pr || !promoAvailable({ items: promoLines(pr) }))
        throw new Error("Revisa la disponibilidad de este pack.");
      pack = promoLines(pr);
      saveBasket();
      navigate("/packs");
    } else if (action === "pack-remove") {
      pack.splice(id, 1);
      paintAfterSelection();
    } else if (action === "pack-cart") {
      if (
        !pack.length ||
        pack.some((l) => available(get(l.id), l.size) < l.qty)
      )
        throw new Error("Revisa la disponibilidad de tu pack.");
      const group = "pack-" + crypto.randomUUID();
      cart.push(...pack.map((l) => ({ ...l, group })));
      pack = [];
      saveBasket();
      navigate("/carrito");
    } else if (action === "pack-review")
      $("#pack-summary").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    else if (action === "remove") {
      cart.splice(id, 1);
      paintAfterSelection();
    } else if (action === "quantity") {
      const l = cart[id],
        delta = Number(b.dataset.delta);
      if (!l) return;
      if (delta > 0 && available(get(l.id), l.size) < 1)
        throw new Error("No hay más unidades disponibles.");
      l.qty += delta;
      if (l.qty <= 0) cart.splice(id, 1);
      paintAfterSelection();
	  } else if (action === "local-fill") {
		if (DECANLY_FRONTEND.authMode === "api") {
		  throw new Error(
		    "El acceso local de demostración está desactivado."
		  );
		}
	  $("#email").value = "admin@decanly.pe";
	  $("#password").value = "Decanly2026";
	  $('#login button[type="submit"]').focus();
    } else if (action === "refresh-orders") {
      await paintOrders();
    } else if (action === "order-state") {
      const state = b.closest("tr").querySelector("select").value;
      if (
        state === "CANCELADO" &&
        !(await confirmAction(
          "Cancelar pedido",
          "Se devolverán las unidades reservadas al stock.",
        ))
      )
        return;
      b.disabled = true;
      await DecanlyAPI.changeOrderState(id, state);
      await refreshData();
      await paintOrders();
    } else if (action === "logout") {
      await DecanlyAPI.logout();
      navigate("/cuenta");
    } else if (action === "admin-tab")
      navigate(
        { products: "/producto", promos: "/promocion", orders: "/pedidos" }[
          b.dataset.value
        ],
      );
    else if (action === "new-product") navigate("/producto/new");
    else if (action === "edit-product") navigate("/producto/edit?id=" + id);
    else if (action === "new-promo") navigate("/promocion/new");
    else if (action === "edit-promo") navigate("/promocion/edit?id=" + id);
    else if (action === "stock-zero") {
      if (!admin) throw new Error("Inicia sesión para administrar.");
      b.disabled = true;
      await DecanlyAPI.saveProduct({
        ...get(id),
        stock: { 3: 0, 5: 0, 10: 0 },
      });
      await refreshData();
      paintAdmin();
      toast("Stock actualizado.");
    } else if (action === "delete-product" || action === "delete-promo") {
      if (!admin) throw new Error("Inicia sesión para administrar.");
      const product = action === "delete-product";
      if (
        await confirmAction(
          product ? "Eliminar perfume" : "Eliminar pack",
          "Se retirará del catálogo de esta " + "tienda.",
        )
      ) {
        b.disabled = true;
        await (product
          ? DecanlyAPI.deleteProduct(id)
          : DecanlyAPI.deletePack(id));
        await refreshData();
        paintAdmin();
        toast("Registro eliminado.");
      }
    } else if (action === "toggle-promo") {
      if (!admin) throw new Error("Inicia sesión para administrar.");
      const pr = promos.find((p) => p.id === id);
      b.disabled = true;
      await DecanlyAPI.savePack({ ...pr, active: !pr.active });
      await refreshData();
      paintAdmin();
    } else if (action === "promo-add-row" || action === "promo-remove-row") {
      capturePromoRows();
      if (action === "promo-add-row" && editingPackItems.length < 6) {
        const p = products.find(
          (p) => !editingPackItems.some((l) => l.id === p.id),
        );
        if (p) editingPackItems.push({ id: p.id, size: "5", qty: 1 });
      } else if (action === "promo-remove-row") editingPackItems.splice(id, 1);
      paintPackRows();
    } else if (action === "clear-promos") {
      if (!admin) throw new Error("Inicia sesión para administrar.");
      await DecanlyAPI.saveConfig({ store: storeConfig, packDiscount: 0 });
      await refreshData();
      paintAdmin();
      toast("Descuento de packs desactivado.");
    } else if (action === "reset-local") {
      if (
        await confirmAction(
          "Restablecer datos locales",
          "Se borrarán los cambios y la selección guardados en esta pestaña.",
        )
      ) {
        await DecanlyAPI.resetLocal();
        sessionStorage.removeItem(basketKey);
        navigate("/");
      }
    }
  } catch (error) {
    if (b.isConnected) b.disabled = false;
    showError(error);
  }
});

document.addEventListener("input", (e) => {
  if (!ready) return;
  if (e.target.id === "search") {
    filter.q = e.target.value;
    paintCatalog();
    rememberFilters();
  }
  if (e.target.id === "admin-search") paintAdmin();
});
document.addEventListener("change", async (e) => {
  if (!ready) return;
  const el = e.target;
  if (["brand-filter", "category-filter", "sort"].includes(el.id)) {
    filter[
      { "brand-filter": "brand", "category-filter": "category", sort: "sort" }[
        el.id
      ]
    ] = el.value;
    paintCatalog();
    rememberFilters();
  }
  if (el.closest(".promo-editor-row")) {
    capturePromoRows();
    if (editingPackItems.every((l) => get(l.id) && l.qty > 0))
      $("#pack-editor-total").textContent =
        "Precio de vista previa: " +
        money(linesTotals(editingPackItems, true).total);
  }
  if (el.name === "photo") {
    const f = el.files[0];
    if (!f) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(f.type) ||
      f.size > DECANLY_FRONTEND.maxPhotoBytes
    ) {
      el.value = "";
      toast("Elige una imagen PNG, JPG o WebP de hasta 2 MB.");
      return;
    }
    if (el.dataset.previewUrl) URL.revokeObjectURL(el.dataset.previewUrl);
    const url = URL.createObjectURL(f);
    el.dataset.previewUrl = url;
    put(
      $("#photo-preview"),
      `<img src="${url}" alt="Vista previa de la nueva fotografía"><span>${esc(f.name)}</span>`,
    );
  }
});

document.addEventListener("submit", async (e) => {
  const f = e.target;
  if (!(f instanceof HTMLFormElement)) return;
  e.preventDefault();
  if (!ready || busyForms.has(f)) return;
  if (!f.reportValidity()) return;
  if (f.id === "header-search-form") {
    navigate(
      "/catalogo?q=" +
        encodeURIComponent(f.elements.namedItem("query").value.trim()),
    );
    return;
  }
  const d = new FormData(f),
    buttons = [...f.querySelectorAll('button[type="submit"]')];
  busyForms.add(f);
  buttons.forEach((b) => (b.disabled = true));
  f.setAttribute("aria-busy", "true");
  feedback(f, "Procesando…");
  try {
    if (
      ["product-form", "promo-form", "promo-settings"].includes(f.id) &&
      !admin
    )
      throw new Error("Inicia sesión para administrar.");

    if (f.id === "product-form") {
      const id = Number(f.dataset.id),
        photo = d.get("photo");
      const item = {
        id,
        version: get(id)?.version,
        name: d.get("name").trim(),
        brand: d.get("brand").trim(),
        occasion: d.get("occasion"),
        notes: d.get("notes").trim(),
        discount: Number(d.get("discount")),
        prices: Object.fromEntries(
          SIZES.map((s) => [s, Number(d.get("price" + s))]),
        ),
        stock: Object.fromEntries(
          SIZES.map((s) => [s, Number(d.get("stock" + s))]),
        ),
        image: get(id)?.image || "",
      };
      if (
        !item.name ||
        !item.brand ||
        !Number.isInteger(item.discount) ||
        item.discount < 0 ||
        item.discount > 70 ||
        SIZES.some(
          (s) =>
            !Number.isFinite(item.prices[s]) ||
            item.prices[s] <= 0 ||
            item.prices[s] > 10000 ||
            !Number.isInteger(item.stock[s]) ||
            item.stock[s] < 0 ||
            item.stock[s] > 9999,
        )
      )
        throw new Error("Revisa nombre, marca, precios, descuento y stock.");
      if (!id && !photo.size)
        throw new Error("Selecciona la fotografía del nuevo perfume.");
      if (
        photo.size &&
        (photo.size > DECANLY_FRONTEND.maxPhotoBytes ||
          !["image/png", "image/jpeg", "image/webp"].includes(photo.type))
      )
        throw new Error("La foto debe ser PNG, JPG o WebP de hasta 2 MB.");
      await DecanlyAPI.saveProduct(item, photo, DecanlyGallery.collect(f));
      sessionStorage.setItem("decanly-flash:" + BASE, "Producto guardado.");
      navigate("/producto");
    } else if (f.id === "promo-form") {
      capturePromoRows();
      if (
        !d.get("title").trim() ||
        !d.get("description").trim() ||
        editingPackItems.length < 3 ||
        editingPackItems.length > 6 ||
        new Set(editingPackItems.map((l) => l.id)).size !==
          editingPackItems.length ||
        editingPackItems.some(
          (l) =>
            !get(l.id) ||
            !SIZES.includes(l.size) ||
            !Number.isInteger(l.qty) ||
            l.qty < 1 ||
            l.qty > 10,
        )
      )
        throw new Error(
          "Elige de 3 a 6 perfumes diferentes, con cantidades de 1 a 10.",
        );
      await DecanlyAPI.savePack({
        id: Number(f.dataset.id),
        version: promos.find((p) => p.id === Number(f.dataset.id))?.version,
        title: d.get("title").trim(),
        text: d.get("description").trim(),
        badge: String(d.get("badge") || "").trim(),
        items: editingPackItems,
        active: d.has("active"),
      });
      sessionStorage.setItem("decanly-flash:" + BASE, "Pack guardado.");
      navigate("/promocion");
    } else if (f.id === "promo-settings") {
      const discount = Number($("#pack-discount").value);
      if (!Number.isInteger(discount) || discount < 0 || discount > 70)
        throw new Error("El descuento debe estar entre 0 y 70%.");
      await DecanlyAPI.saveConfig({
        store: storeConfig,
        packDiscount: discount,
      });
      await refreshData();
      paintAdmin();
      toast("Descuento guardado.");
    } else if (f.id === "checkout") {
      if (
        !cart.length ||
        cart.some(
          (l) => !get(l.id) || reserved(l.id, l.size) > get(l.id).stock[l.size],
        )
      )
        throw new Error("Revisa el stock del pedido.");
      const payload = {
        ...DecanlyPedido.read(f),
        items: cart.map((l) => ({
          id: l.id,
          size: l.size,
          qty: l.qty,
          ...(l.group ? { group: l.group } : {}),
        })),
      };
      const order = await DecanlyAPI.createOrder(
        payload,
        groupOrderPreview(),
        await requestKeyFor(f, payload),
      );
      if (!order?.whatsappText || !order?.reference)
        throw new Error(
          "El backend debe devolver la referencia y el mensaje de WhatsApp con el total validado.",
        );
      const url =
        "https://wa.me/" +
        DECANLY_FRONTEND.sellerPhone +
        "?text=" +
        encodeURIComponent(order.whatsappText);
      feedback(
        f,
        "Pedido " +
          order.reference +
          " preparado. Revisa y envía el mensaje en WhatsApp.",
      );
      f.querySelector(".whatsapp-ready")?.remove();
      f.insertAdjacentHTML(
        "beforeend",
        `<a class="btn whatsapp-ready" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp con mi pedido ↗</a>`,
      );
      f.dataset.completed = "true";
      f.querySelectorAll("input").forEach((input) => {
        input.readOnly = true;
        if (input.type === "checkbox") input.disabled = true;
      });
      window.open(url, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    feedback(f, error.message || "No se pudo completar la operación.", true);
  } finally {
    busyForms.delete(f);
    buttons.forEach((b) => (b.disabled = f.dataset.completed === "true"));
    f.removeAttribute("aria-busy");
  }
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.close();
});
modal.addEventListener("close", () => modal.classList.remove("perfume-dialog"));
document.addEventListener("click", (e) => {
  if (!e.target.closest(".site-header")) {
    closeMenu();
    closeSearch();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const header = $(".site-header");
    const focusTarget = header.classList.contains("search-open")
      ? $('[data-action="toggle-search"]')
      : header.classList.contains("menu-open")
        ? $('[data-action="menu"]')
        : null;
    closeMenu();
    closeSearch();
    focusTarget?.focus();
  }
});

async function startFrontend() {
  app.inert = true;
  try {
    await refreshData({ syncBasket: false });
    loadBasket();
    queryFilter();
    if (adminPages.test(currentPage) && !admin) {
      app.hidden = true;
      navigate(
        "/cuenta?volver=" +
          encodeURIComponent(
            "/" + location.pathname.slice(BASE.length) + location.search,
          ),
      );
      return;
    }
    if (route === "catalogo" && currentPage === "catalogo/index")
      paintCatalog(true);
    if (route === "packs") {
      paintCatalog(true);
      paintPack();
    }
    if (route === "carrito") paintCart();
    if (currentPage === "inicio/index") {
      const best = stockFirst(
        [25, 3, 14, 11, 1, 18, 9, 15].map(get).filter(Boolean),
      );
      put($("#best-sellers"), best.map((p) => card(p)).join(""));
      paintPromos();
    }
    if (route === "promociones") paintPromos();
    if (adminPages.test(currentPage)) paintAdmin();
    if (currentPage === "pedidos/index") await paintOrders();
    paintProductForm();
    paintPackForm();
    if (currentPage === "perfume/detalle")
      openDetail(
        Number(new URLSearchParams(location.search).get("id") || 1),
        "perfume",
        true,
      );
    if (currentPage === "legal/terminos") put(app, termsPage());
    if (currentPage === "legal/envios") put(app, shippingPage());
    if (currentPage === "legal/privacidad") put(app, privacyPage());
    if (currentPage === "cuenta/index") {
      if (admin) {
        $("#login").hidden = true;
        $(".account .notice").textContent = "Ya tienes una sesión iniciada.";
        $(".account").insertAdjacentHTML(
          "beforeend",
          `<a class="btn" href="${pathTo("/producto")}">Ir al panel</a> <button class="btn light" data-action="logout">Cerrar sesión</button>`,
        );
		}else if (
		  DecanlyAPI.localMode &&
		  DECANLY_FRONTEND.authMode !== "api"
		)
        $("#login").insertAdjacentHTML(
          "beforeend",
          '<button type="button" class="text-link" data-action="local-fill">Acceder con cuenta local</button>',
        );
      else {
        $(".account .notice").textContent =
          "Ingresa con tu cuenta de administrador.";
        $(".account .hint")?.remove();
        document.querySelector('label[for="password"]').textContent =
          "Contraseña";
      }
    }
    document
      .querySelectorAll("[data-local-only]")
      .forEach((n) => (n.hidden = !DecanlyAPI.localMode));
    document
      .querySelectorAll(".admin-mode-pill")
      .forEach(
        (n) =>
          (n.textContent = DecanlyAPI.localMode
            ? "Administración"
            : "Administración"),
      );
    if (!DecanlyAPI.localMode)
      document
        .querySelectorAll(".admin-notice")
        .forEach(
          (n) => (n.textContent = "Los cambios se guardan en el servidor."),
        );
    document.querySelectorAll("#main-nav a").forEach((a) => {
      const r = route === "cuenta" ? "cuenta" : route;
      a.classList.toggle(
        "active",
        a.getAttribute("href") === pathTo(routePaths[r] || "/"),
      );
      if (a.classList.contains("active"))
        a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    normalize(document);
    updateCount();
    DecanlyCarousel.init();
    DecanlyInfoCarousel.init();
    DecanlyUX.init();
    ready = true;
    app.inert = false;
    const key = "decanly-flash:" + BASE,
      flash = sessionStorage.getItem(key);
    if (flash) {
      toast(flash);
      sessionStorage.removeItem(key);
    }
    document.dispatchEvent(new CustomEvent("decanly:ready"));
  } catch (error) {
    app.inert = true;
    const status = $("#connection-status");
    status.hidden = false;
    put(
      status,
      `<span>${esc(error.message)}</span><button class="btn light" data-action="reload-data">Reintentar</button>${DecanlyAPI.localMode ? '<button class="text-link" data-action="reset-local">Restablecer datos locales</button>' : ""}`,
    );
  }
}
startFrontend();

async function paintOrders() {
  const orders = await DecanlyAPI.listOrders();
  put(
    $("#orders-content"),
    orders.length
      ? '<div class="table-wrap"><table class="orders-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Entrega y selección</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' +
          orders
            .map((order) => {
              const states =
                {
                  PENDIENTE: ["CONFIRMADO", "CANCELADO"],
                  CONFIRMADO: ["ENTREGADO", "CANCELADO"],
                }[order.state] || [];
              return `<tr><td data-label="Pedido"><b>${esc(order.reference)}</b><br><small>${esc(new Date(order.createdAt).toLocaleString("es-PE", { timeZone: "America/Lima" }))}</small></td><td data-label="Cliente">${esc(order.customer)}<br><a href="https://wa.me/${esc(order.phone.replace(/\D/g, ""))}" target="_blank" rel="noopener">${esc(order.phone)}</a></td><td data-label="Entrega"><p>${esc(order.address)}</p><details><summary>Ver productos</summary><div class="order-detail">${order.items.map((l) => esc(l.brand + " · " + l.name + " — " + l.qty + " × " + l.size + " ml")).join("<br>")}</div></details></td><td data-label="Total">${money(order.total)}</td><td data-label="Estado"><span class="order-state">${esc(order.state)}</span></td><td>${states.length ? `<div class="admin-order-actions"><select class="field" aria-label="Estado del pedido ${esc(order.reference)}">${states.map((s) => `<option>${s}</option>`).join("")}</select><button class="btn light" data-action="order-state" data-id="${order.id}">Guardar</button></div>` : "Finalizado"}</td></tr>`;
            })
            .join("") +
          "</tbody></table></div>"
      : '<div class="empty"><h2>Aún no hay pedidos.</h2><p>Aquí aparecerán las selecciones confirmadas desde el carrito.</p></div>',
  );
}
