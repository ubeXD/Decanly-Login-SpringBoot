"use strict";

// Estado de edición aislado: cancelar no modifica las imágenes del producto.
const DecanlyGallery = (() => {
  const MAX_IMAGES = 6,
    MAX_BYTES = 2 * 1024 * 1024;
  const editors = new WeakMap();
  const escape = (text) =>
    String(text ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const clone = (value) => structuredClone(value);
  const resolve = (src) =>
    typeof assetUrl === "function" ? assetUrl(src) : src;
  function entries(product) {
    if (Array.isArray(product.gallery)) {
      if (product.gallery.length) return clone(product.gallery);
      return product.image
        ? [{ id: "perfume", src: product.image, alt: product.name }]
        : [];
    }
    if (!product.image) return [];
    const first = {
      id: "perfume",
      src: product.image,
      alt: "Frasco original de " + (product.name || "tu perfume"),
    };
    return [first];
  }
  function photo(entry, decorative = false) {
    const alt = decorative ? "" : entry.alt || "Fotografía del perfume";
    if (entry.crop)
      return `<svg class="reference-photo" viewBox="${escape(entry.crop.viewBox)}" preserveAspectRatio="xMidYMid meet" ${decorative ? 'aria-hidden="true"' : `role="img" aria-label="${escape(alt)}"`}><image href="${escape(resolve(entry.src))}" width="${Number(entry.crop.width)}" height="${Number(entry.crop.height)}"/></svg>`;
    return `<img src="${escape(resolve(entry.src))}" alt="${escape(alt)}">`;
  }
  function markup(product, requested) {
    const list = entries(product);
    const index = Math.max(
      0,
      list.findIndex((entry) => String(entry.id) === String(requested)),
    );
    const active = list[index];
    if (!active)
      return {
        view: "",
        html: '<div class="detail-gallery"><p>Sin fotografía disponible.</p></div>',
      };
    const controls = (entry, i, thumbnail) =>
      `<button type="button" class="${i === index ? "selected" : ""}" data-action="detail-view" data-id="${product.id}" data-view="${escape(entry.id)}" aria-label="Ver imagen ${i + 1}: ${escape(entry.alt)}" aria-pressed="${i === index}">${thumbnail ? photo(entry, true) : "<span></span>"}</button>`;
    return {
      view: active.id,
      html: `<div class="detail-gallery" role="group" aria-roledescription="carrusel" aria-label="Fotografías de ${escape(product.name)}">
        <div class="detail-thumbnails" aria-label="Elegir fotografía">${list.map((entry, i) => controls(entry, i, true)).join("")}</div>
        <div class="detail-carousel">
          <div class="detail-art" data-gallery-viewport ${list.length > 1 ? 'tabindex="0" aria-label="Fotografías: desliza o usa las teclas izquierda y derecha"' : ""}>
            <div class="detail-photo-track" style="transform:translateX(-${index * 100}%)">
              ${list.map((entry, i) => `<div class="detail-photo-slide" data-photo-id="${escape(entry.id)}" data-photo-alt="${escape(entry.alt)}" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${list.length}" aria-hidden="${i !== index}" ${i !== index ? "inert" : ""}>${photo(entry)}</div>`).join("")}
            </div>
            ${list.length > 1 ? `<span class="detail-photo-counter" aria-hidden="true">${index + 1} / ${list.length}</span>` : ""}
          </div>
          <span class="detail-photo-label">${escape(active.alt)}</span>
          ${list.length > 1 ? `<div class="detail-photo-dots" aria-label="Páginas de fotografías">${list.map((entry, i) => controls(entry, i, false)).join("")}</div>` : ""}
          <span class="sr-only" data-gallery-status role="status" aria-live="polite" aria-atomic="true"></span>
        </div>
      </div>`,
    };
  }
  const carousels = new WeakMap();
  function mountCarousel(root, onChange = () => {}) {
    if (!root || carousels.has(root)) return;
    const viewport = root.querySelector("[data-gallery-viewport]");
    const track = root.querySelector(".detail-photo-track");
    const slides = [...root.querySelectorAll(".detail-photo-slide")];
    if (!viewport || !slides.length) return;
    const buttons = [...root.querySelectorAll('[data-action="detail-view"]')];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let index = Math.max(
      0,
      slides.findIndex(
        (slide) => slide.getAttribute("aria-hidden") === "false",
      ),
    );
    let gesture = null;
    function show(next, announce = true) {
      index = (next + slides.length) % slides.length;
      viewport.classList.remove("is-dragging");
      track.style.transition = reduced.matches
        ? "none"
        : "transform 380ms ease";
      track.style.transform = `translateX(-${index * 100}%)`;
      const active = slides[index];
      slides.forEach((slide, i) => {
        slide.setAttribute("aria-hidden", String(i !== index));
        slide.toggleAttribute("inert", i !== index);
      });
      buttons.forEach((button) => {
        const selected = button.dataset.view === active.dataset.photoId;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      root.querySelector(".detail-photo-label").textContent =
        active.dataset.photoAlt;
      const counter = root.querySelector(".detail-photo-counter");
      if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
      if (announce)
        root.querySelector("[data-gallery-status]").textContent =
          `Imagen ${index + 1} de ${slides.length}: ${active.dataset.photoAlt}`;
      onChange(active.dataset.photoId);
      // Mantener la miniatura seleccionada dentro de su tira sin mover la página.
      const thumb = root.querySelector(".detail-thumbnails .selected");
      const rail = thumb?.parentElement;
      if (rail && rail.scrollWidth > rail.clientWidth)
        rail.scrollTo({
          left: Math.max(
            0,
            thumb.offsetLeft -
              rail.offsetLeft -
              (rail.clientWidth - thumb.offsetWidth) / 2,
          ),
          behavior: reduced.matches ? "auto" : "smooth",
        });
      if (rail && rail.scrollHeight > rail.clientHeight)
        rail.scrollTo({
          top: Math.max(
            0,
            thumb.offsetTop -
              rail.offsetTop -
              (rail.clientHeight - thumb.offsetHeight) / 2,
          ),
          behavior: reduced.matches ? "auto" : "smooth",
        });
    }
    carousels.set(root, (id) => {
      const next = slides.findIndex(
        (slide) => slide.dataset.photoId === String(id),
      );
      if (next >= 0) show(next);
    });
    if (slides.length < 2) return;
    viewport.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const keys = {
        ArrowLeft: index - 1,
        ArrowRight: index + 1,
        Home: 0,
        End: slides.length - 1,
      };
      if (!(event.key in keys)) return;
      event.preventDefault();
      show(keys[event.key]);
    });
    viewport.addEventListener("pointerdown", (event) => {
      if (
        event.isPrimary === false ||
        (event.button !== undefined && event.button !== 0)
      )
        return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
      viewport.setPointerCapture?.(event.pointerId);
    });
    viewport.addEventListener("pointermove", (event) => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x,
        dy = event.clientY - gesture.y;
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        viewport.classList.add("is-dragging");
        track.style.transition = "none";
        track.style.transform = `translateX(calc(-${index * 100}% + ${dx}px))`;
      }
    });
    const release = (event, cancelled = false) => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x,
        dy = event.clientY - gesture.y;
      gesture = null;
      if (viewport.hasPointerCapture?.(event.pointerId))
        viewport.releasePointerCapture(event.pointerId);
      if (!cancelled && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3)
        show(index + (dx < 0 ? 1 : -1));
      else show(index, false);
    };
    viewport.addEventListener("pointerup", (event) => release(event));
    viewport.addEventListener("pointercancel", (event) => release(event, true));
    viewport.addEventListener("lostpointercapture", (event) =>
      release(event, true),
    );
    viewport.addEventListener("dragstart", (event) => event.preventDefault());
  }
  function select(root, id) {
    carousels.get(root)?.(id);
  }
  function fileDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () =>
        reject(
          new Error(
            "No se pudo leer la imagen. Intenta seleccionarla otra vez.",
          ),
        );
      reader.readAsDataURL(file);
    });
  }
  function mount(form, product = {}) {
    const state = {
      items: product.id ? entries(product) : [],
      files: new Map(),
      busy: false,
    };
    editors.set(form, state);
    form.querySelector(".gallery-editor")?.remove();
    const panel = document.createElement("fieldset");
    panel.className = "gallery-editor wide";
    panel.innerHTML = `<legend>Imágenes del modal</legend><p class="hint">Agrega hasta ${MAX_IMAGES} fotos, cambia su descripción y ordénalas. La primera se mostrará al abrir el perfume. Puedes eliminar las imágenes de referencia; si dejas la galería vacía, se usará la foto principal del catálogo.</p><label class="gallery-upload">${typeof icon === "function" ? icon("plus") : "+"}<span>Agregar fotos<input class="field" name="galleryFiles" type="file" multiple accept="image/png,image/jpeg,image/webp"></span></label><p class="hint">PNG, JPG o WebP · máximo 2 MB por foto.</p><div class="gallery-editor-list"></div><p class="gallery-status" role="status" aria-live="polite"></p>`;
    form.querySelector('button[type="submit"]').before(panel);
    const status = panel.querySelector(".gallery-status");
    const message = (text, error = false) => {
      status.textContent = text;
      status.classList.toggle("error", error);
    };
    const draw = () => {
      panel.querySelector(".gallery-editor-list").innerHTML =
        state.items
          .map(
            (entry, i) =>
              `<div class="gallery-editor-card"><div class="gallery-editor-photo">${photo(entry, true)}<span>${i === 0 ? "Primera" : i + 1}</span></div><label>Descripción<input class="field" data-gallery-alt="${escape(entry.id)}" maxlength="120" value="${escape(entry.alt)}" placeholder="Ej. Frasco de frente"></label><div class="gallery-editor-actions"><button type="button" data-gallery-action="left" data-image-id="${escape(entry.id)}" aria-label="Mover imagen ${i + 1} antes" ${i === 0 ? "disabled" : ""}>${icon("left")}</button><button type="button" data-gallery-action="right" data-image-id="${escape(entry.id)}" aria-label="Mover imagen ${i + 1} después" ${i === state.items.length - 1 ? "disabled" : ""}>${icon("right")}</button><button type="button" data-gallery-action="remove" data-image-id="${escape(entry.id)}" class="gallery-remove" aria-label="Eliminar imagen ${i + 1}">${icon("close")}<span>Quitar</span></button></div></div>`,
          )
          .join("") ||
        '<p class="gallery-empty">El modal mostrará la foto principal. Agrega imágenes para personalizarlo.</p>';
      panel.querySelector('[name="galleryFiles"]').disabled =
        state.busy || state.items.length >= MAX_IMAGES;
    };
    panel.addEventListener("input", (e) => {
      const id = e.target.dataset.galleryAlt;
      if (id) {
        const entry = state.items.find((x) => String(x.id) === id);
        if (entry) entry.alt = e.target.value;
      }
    });
    panel.addEventListener("click", (e) => {
      const button = e.target.closest("[data-gallery-action]");
      if (!button || button.disabled || state.busy) return;
      const index = state.items.findIndex(
        (x) => String(x.id) === button.dataset.imageId,
      );
      if (index < 0) return;
      const action = button.dataset.galleryAction;
      if (action === "remove") {
        state.files.delete(state.items[index].id);
        state.items.splice(index, 1);
      } else {
        const next = index + (action === "left" ? -1 : 1);
        if (next < 0 || next >= state.items.length) return;
        [state.items[index], state.items[next]] = [
          state.items[next],
          state.items[index],
        ];
      }
      draw();
      message("Cambios pendientes. Guarda el perfume para aplicarlos.");
    });
    panel
      .querySelector('[name="galleryFiles"]')
      .addEventListener("change", async (e) => {
        const input = e.target,
          files = [...input.files];
        if (!files.length) return;
        try {
          if (state.items.length + files.length > MAX_IMAGES)
            throw new Error(
              `Puedes guardar hasta ${MAX_IMAGES} imágenes en el modal.`,
            );
          if (
            files.some(
              (f) =>
                !["image/png", "image/jpeg", "image/webp"].includes(f.type) ||
                !f.size ||
                f.size > MAX_BYTES,
            )
          )
            throw new Error(
              "Elige imágenes PNG, JPG o WebP de hasta 2 MB cada una.",
            );
          state.busy = true;
          input.disabled = true;
          panel.setAttribute("aria-busy", "true");
          message("Preparando imágenes…");
          const added = await Promise.all(
            files.map(async (file) => ({
              id: "new-" + crypto.randomUUID(),
              src: await fileDataURL(file),
              alt: file.name.replace(/\.[^.]+$/, "").slice(0, 120),
            })),
          );
          added.forEach((entry, i) => {
            state.items.push(entry);
            state.files.set(entry.id, files[i]);
          });
          message(
            `${added.length} ${added.length === 1 ? "imagen lista" : "imágenes listas"}. Guarda el perfume para aplicar los cambios.`,
          );
        } catch (error) {
          message(error.message, true);
        } finally {
          state.busy = false;
          panel.removeAttribute("aria-busy");
          input.value = "";
          draw();
        }
      });
    draw();
  }
  function collect(form) {
    const state = editors.get(form);
    if (!state)
      throw new Error(
        "No se pudo cargar el editor de imágenes. Recarga esta pantalla.",
      );
    if (state.busy)
      throw new Error("Espera a que terminen de cargar las imágenes.");
    const items = state.items.map((entry) => ({
      ...clone(entry),
      alt: entry.alt.trim() || "Fotografía del perfume",
    }));
    return {
      items,
      files: items
        .filter((entry) => state.files.has(entry.id))
        .map((entry) => ({ key: entry.id, file: state.files.get(entry.id) })),
    };
  }
  function withCover(items, oldCover, newCover) {
    return items.map((entry) =>
      entry.src === oldCover && !entry.crop
        ? { ...entry, src: newCover }
        : entry,
    );
  }
  return {
    entries,
    photo,
    markup,
    mountCarousel,
    select,
    mount,
    collect,
    withCover,
    fileDataURL,
  };
})();
