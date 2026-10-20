"use strict";
// Todas las escrituras de la versión conectada pasan por esta API del mismo origen.
const DecanlyAPI =
  DECANLY_FRONTEND.mode === "local"
    ? DecanlyLocalAPI
    : (() => {
        const base =
          document.querySelector('meta[name="decanly-base"]')?.content || "/";
        async function request(
          endpoint,
          { method = "GET", body, requestKey } = {},
        ) {
          const controller = new AbortController(),
            timer = setTimeout(() => controller.abort(), 20000);
          try {
            const headers = { Accept: "application/json" };
            if (method !== "GET") {
              const token = await fetch(
                base + DECANLY_FRONTEND.apiPath + "csrf",
                { credentials: "same-origin", signal: controller.signal },
              );
              if (!token.ok)
                throw new Error(
                  "Recarga la página para iniciar una solicitud segura.",
                );
              const csrf = await token.json();
              headers[csrf.headerName] = csrf.token;
            }
            if (body && !(body instanceof FormData)) {
              headers["Content-Type"] = "application/json";
              body = JSON.stringify(body);
            }
            if (requestKey) headers["Idempotency-Key"] = requestKey;
            const response = await fetch(
              base + DECANLY_FRONTEND.apiPath + endpoint,
              {
                method,
                headers,
                body,
                credentials: "same-origin",
                signal: controller.signal,
              },
            );
            let data;
            try {
              data = await response.json();
            } catch {
              throw new Error("El servidor no respondió con datos válidos.");
            }
            if (!response.ok)
              throw new Error(
                data.message ||
                  (response.status === 401
                    ? "Inicia sesión para continuar."
                    : "No se pudo completar la operación."),
              );
            return data;
          } catch (error) {
            if (error.name === "AbortError")
              throw new Error(
                "El servidor tardó demasiado. Reintenta sin cambiar los datos del pedido para evitar duplicados.",
              );
            if (error instanceof TypeError)
              throw new Error(
                "No se pudo conectar al servidor. Revisa la conexión.",
              );
            throw error;
          } finally {
            clearTimeout(timer);
          }
        }
        return Object.freeze({
          localMode: false,
          async load() {
            const [products, packs, config, session] = await Promise.all([
              request("productos"),
              request("packs"),
              request("configuracion"),
              request("sesion"),
            ]);
            return { products, packs, config, user: session.user };
          },
		  		  logout: () => request("sesion", { method: "DELETE" }), 
          logout: () => request("sesion", { method: "DELETE" }),
          async saveProduct(product, photo, galleryChange) {
            const body = new FormData(),
              data = { ...product };
            delete data.gallery;
            delete data.image;
            if (galleryChange) {
              const uploads = new Set(galleryChange.files.map((e) => e.key));
              data.gallery = galleryChange.items.map((e) => ({
                ...(uploads.has(e.id)
                  ? { uploadKey: e.id }
                  : { id: String(e.id) }),
                alt: e.alt,
              }));
              galleryChange.files.forEach((e) =>
                body.append("galeria_" + e.key, e.file),
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
          },
          deleteProduct: (id) =>
            request("productos/" + id, { method: "DELETE" }),
          savePack: (pack) =>
            request("packs" + (pack.id ? "/" + pack.id : ""), {
              method: pack.id ? "PUT" : "POST",
              body: pack,
            }),
          deletePack: (id) => request("packs/" + id, { method: "DELETE" }),
          saveConfig: (config) =>
            request("configuracion", {
              method: "PUT",
              body: { packDiscount: config.packDiscount },
            }),
          createOrder: (payload, preview, requestKey) =>
            request("pedidos", { method: "POST", body: payload, requestKey }),
          listOrders: () => request("pedidos"),
          changeOrderState: (id, state) =>
            request("pedidos/" + id, { method: "PATCH", body: { state } }),
        });
      })();
