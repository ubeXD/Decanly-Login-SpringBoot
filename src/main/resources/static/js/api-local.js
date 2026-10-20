"use strict";

// Único punto de conexión entre la interfaz y el futuro backend.
// El modo local nunca llama a endpoints ni guarda datos personales de pedidos/reclamos.
const DecanlyLocalAPI = (() => {
  const base =
    document.querySelector('meta[name="decanly-base"]')?.content || "/";
  const localMode = DECANLY_FRONTEND.mode === "local";
  const key = "decanly-local-v3:" + base;
  const copy = (value) => structuredClone(value);
  const initial = () => ({
    ...copy(DECANLY_INITIAL),
    user: null,
    orderNumber: 0,
    orders: [],
  });
  let local;
  function readLocal() {
    if (local) return local;
    const raw = sessionStorage.getItem(key);
    local = raw ? JSON.parse(raw) : initial();
    if (
      !Array.isArray(local.products) ||
      !Array.isArray(local.packs) ||
      !local.config
    ) {
      throw new Error(
        "No se pudieron leer los datos guardados. Restablece los datos localeses.",
      );
    }
    return local;
  }
  function persist(next) {
    try {
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      throw new Error(
        "No hay espacio en esta pestaña. Prueba una foto más pequeña o restablece los datos locales.",
      );
    }
    local = next;
  }
  function requireAdmin() {
    if (readLocal().user?.role !== "ADMIN")
      throw new Error("Inicia sesión para administrar la tienda.");
  }
  async function request(endpoint, { method = "GET", body, requestKey } = {}) {
    const headers = { Accept: "application/json" };
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }
    let csrfInfo;
    if (!localMode && method !== "GET") {
      const tokenResponse = await fetch(
        base + DECANLY_FRONTEND.apiPath + "csrf",
        { credentials: "same-origin" },
      );
      if (!tokenResponse.ok)
        throw new Error(
          "No se pudo iniciar una solicitud segura. Recarga la página.",
        );
      csrfInfo = await tokenResponse.json();
    }
    const csrf =
      csrfInfo?.token ||
      document.querySelector('meta[name="csrf-token"]')?.content;
    const csrfHeader =
      csrfInfo?.headerName ||
      document.querySelector('meta[name="csrf-header"]')?.content ||
      "X-CSRF-TOKEN";
    if (csrf && method !== "GET") headers[csrfHeader] = csrf;
    if (requestKey) headers["Idempotency-Key"] = requestKey;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(base + DECANLY_FRONTEND.apiPath + endpoint, {
        method,
        headers,
        body,
        credentials: "same-origin",
        signal: controller.signal,
      });
      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}
      if (!response.ok)
        throw new Error(
          data?.message ||
            (response.status === 401
              ? "Tu sesión terminó. Vuelve a iniciar sesión."
              : "No se pudo completar la solicitud. Inténtalo nuevamente."),
        );
      if (text && data === null)
        throw new Error(
          "El backend respondió con un formato inválido; se esperaba JSON.",
        );
      return data;
    } catch (error) {
      if (error.name === "AbortError")
        throw new Error(
          "El servidor tardó demasiado. No se confirmó la operación; vuelve a intentarlo.",
        );
      if (error instanceof TypeError)
        throw new Error(
          "No se pudo conectar al backend. Revisa la conexión y vuelve a intentarlo.",
        );
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  const fileDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () =>
        reject(new Error("No se pudo leer la fotografía."));
      reader.readAsDataURL(file);
    });
  function nextId(items) {
    return Math.max(0, ...items.map((item) => item.id)) + 1;
  }

  return Object.freeze({
    localMode,
    async load() {
      if (localMode) return copy(readLocal());
      const [products, packs, config, session] = await Promise.all([
        request("productos"),
        request("packs"),
        request("configuracion"),
        request("sesion"),
      ]);
      if (
        !Array.isArray(products) ||
        !Array.isArray(packs) ||
        !config ||
        !session
      )
        throw new Error(
          "Revisa los formatos JSON definidos en INTEGRACION_BACKEND.md.",
        );
      return { products, packs, config, user: session.user };
    },
    async login(email, password) {
      if (!localMode)
        return request("sesion", { method: "POST", body: { email, password } });
      if (email !== "admin@decanly.pe" || password !== "Decanly2026")
        throw new Error("Correo o contraseña incorrectos.");
      const next = copy(readLocal());
      next.user = { name: "Administrador", email, role: "ADMIN" };
      persist(next);
      return { user: copy(next.user) };
    },
    async logout() {
      if (!localMode) return request("sesion", { method: "DELETE" });
      const next = copy(readLocal());
      next.user = null;
      persist(next);
    },
    async saveProduct(product, photo, galleryChange) {
      if (!localMode) {
        const body = new FormData();
        const data = { ...product };
        delete data.gallery;
        if (galleryChange) {
          const uploads = new Set(
            galleryChange.files.map((entry) => entry.key),
          );
          data.gallery = galleryChange.items.map((entry) => ({
            ...(uploads.has(entry.id)
              ? { uploadKey: entry.id }
              : { id: entry.id }),
            alt: entry.alt,
          }));
          galleryChange.files.forEach((entry) =>
            body.append("galeria_" + entry.key, entry.file),
          );
        }
        body.append(
          "datos",
          new Blob([JSON.stringify(data)], { type: "application/json" }),
        );
        if (photo?.size) body.append("foto", photo);
        return request("productos" + (product.id ? "/" + product.id : ""), {
          method: product.id ? "PUT" : "POST",
          body,
        });
      }
      requireAdmin();
      const next = copy(readLocal()),
        item = copy(product);
      if (photo?.size) item.image = await fileDataURL(photo);
      if (galleryChange)
        item.gallery = DecanlyGallery.withCover(
          galleryChange.items,
          product.image,
          item.image,
        );
      if (item.id) {
        const i = next.products.findIndex((p) => p.id === item.id);
        if (i < 0) throw new Error("El producto ya no existe.");
        next.products[i] = item;
      } else {
        item.id = nextId(next.products);
        next.products.push(item);
      }
      persist(next);
      return copy(item);
    },
    async deleteProduct(id) {
      if (!localMode) return request("productos/" + id, { method: "DELETE" });
      requireAdmin();
      const next = copy(readLocal());
      if (next.packs.some((p) => p.items.some((l) => l.id === id)))
        throw new Error(
          "Este perfume pertenece a un pack. Retíralo del pack antes de eliminarlo.",
        );
      next.products = next.products.filter((p) => p.id !== id);
      persist(next);
    },
    async savePack(pack) {
      if (!localMode)
        return request("packs" + (pack.id ? "/" + pack.id : ""), {
          method: pack.id ? "PUT" : "POST",
          body: pack,
        });
      requireAdmin();
      const next = copy(readLocal()),
        item = copy(pack);
      if (item.id) {
        const i = next.packs.findIndex((p) => p.id === item.id);
        if (i < 0) throw new Error("El pack ya no existe.");
        next.packs[i] = item;
      } else {
        item.id = nextId(next.packs);
        next.packs.push(item);
      }
      persist(next);
      return copy(item);
    },
    async deletePack(id) {
      if (!localMode) return request("packs/" + id, { method: "DELETE" });
      requireAdmin();
      const next = copy(readLocal());
      next.packs = next.packs.filter((p) => p.id !== id);
      persist(next);
    },
    async saveConfig(config) {
      if (!localMode)
        return request("configuracion", { method: "PUT", body: config });
      requireAdmin();
      const next = copy(readLocal());
      next.config = copy(config);
      persist(next);
      return copy(config);
    },
    async listOrders() {
      requireAdmin();
      return copy(readLocal().orders || []);
    },
    async changeOrderState(id, state) {
      requireAdmin();
      const next = copy(readLocal()),
        order = (next.orders || []).find((o) => o.id === id);
      if (!order) throw new Error("Pedido no disponible.");
      const allowed = {
        PENDIENTE: ["CONFIRMADO", "CANCELADO"],
        CONFIRMADO: ["ENTREGADO", "CANCELADO"],
      };
      if (!allowed[order.state]?.includes(state))
        throw new Error("Este pedido ya cambió de estado.");
      if (state === "CANCELADO")
        for (const l of order.items) {
          const p = next.products.find((p) => p.id === l.id);
          if (p) p.stock[l.size] += l.qty;
        }
      order.state = state;
      persist(next);
      return { ok: true };
    },
    async createOrder(payload, preview, requestKey) {
      const next = copy(readLocal());
      next.orders ||= [];
      const old = next.orders.find((o) => o.requestKey === requestKey);
      if (old)
        return { reference: old.reference, whatsappText: old.whatsappText };
      const required = {};
      for (const l of payload.items) {
        const k = l.id + "-" + l.size;
        required[k] = (required[k] || 0) + l.qty;
      }
      for (const l of payload.items) {
        const p = next.products.find((p) => p.id === l.id);
        if (!p || p.stock[l.size] < required[l.id + "-" + l.size])
          throw new Error("Revisa el stock del carrito.");
      }
      next.orderNumber++;
      const reference = "DEC-" + String(next.orderNumber).padStart(5, "0");
      const whatsappText = DecanlyPedido.message({
        ...preview,
        customer: payload,
        reference,
      });
      const items = payload.items.map((l) => {
        const p = next.products.find((p) => p.id === l.id);
        p.stock[l.size] -= l.qty;
        return {
          ...l,
          name: p.name,
          brand: p.brand,
          amount: p.prices[l.size] * l.qty,
        };
      });
      next.orders.unshift({
        id: next.orderNumber,
        reference,
        requestKey,
        whatsappText,
        customer: payload.customer,
        phone: payload.phone,
        address: payload.address,
        total: preview.total,
        state: "PENDIENTE",
        createdAt: new Date().toISOString(),
        items,
      });
      persist(next);
      return { reference, whatsappText, total: preview.total };
    },
    async resetLocal() {
      if (!localMode) throw new Error("Esta acción solo existe en modo local.");
      sessionStorage.removeItem(key);
      local = initial();
    },
  });
})();
