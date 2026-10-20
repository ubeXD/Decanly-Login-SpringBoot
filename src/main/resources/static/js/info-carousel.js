"use strict";

// Carruseles de ventajas y atención, compartidos por ambas versiones.
const DecanlyInfoCarousel = (() => {
  let cleanups = [];
  const destroy = () => {
    cleanups.forEach((fn) => fn());
    cleanups = [];
  };
  function init() {
    destroy();
    document
      .querySelectorAll(".benefit-grid, .service-grid")
      .forEach((root) => {
        const original = root.innerHTML;
        const slides = [...root.children].filter(
          (n) => n.tagName === "ARTICLE",
        );
        if (slides.length < 2) return;
        const reduced = matchMedia("(prefers-reduced-motion: reduce)");
        const viewport = document.createElement("div");
        viewport.className = "info-viewport";
        viewport.tabIndex = 0;
        viewport.setAttribute(
          "aria-label",
          "Desliza o usa las teclas izquierda y derecha",
        );
        const track = document.createElement("div");
        track.className = "info-track";
        slides.forEach((slide, i) => {
          const symbol = slide.querySelector(".ui-icon");
          const title = slide.querySelector("h3"),
            copy = slide.querySelector("p");
          const card = document.createElement("div");
          card.className = "info-card";
          const text = document.createElement("div");
          text.className = "info-copy";
          text.append(title, copy);
          card.append(symbol, text);
          slide.replaceChildren(card);
          slide.className = "info-slide";
          slide.setAttribute("role", "group");
          slide.setAttribute("aria-roledescription", "diapositiva");
          slide.setAttribute("aria-label", `${i + 1} de ${slides.length}`);
          track.append(slide);
        });
        viewport.append(track);
        const dots = document.createElement("div");
        dots.className = "info-dots";
        const buttons = slides.map((slide, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.dataset.infoSlide = i;
          b.setAttribute(
            "aria-label",
            "Mostrar: " + slide.querySelector("h3").textContent,
          );
          b.innerHTML = "<span></span>";
          dots.append(b);
          return b;
        });
        const status = document.createElement("span");
        status.className = "sr-only";
        status.setAttribute("aria-live", "off");
        root.replaceChildren(viewport, dots, status);
        root.classList.add("info-carousel");
        root.setAttribute("aria-roledescription", "carrusel");
        const listeners = [];
        let index = 0,
          timer,
          hovered = false,
          gesture = null,
          disposed = false;
        const on = (el, name, handler) => {
          el.addEventListener(name, handler);
          listeners.push(() => el.removeEventListener(name, handler));
        };
        const schedule = () => {
          clearTimeout(timer);
          if (
            !disposed &&
            !reduced.matches &&
            !hovered &&
            !gesture &&
            !document.hidden &&
            !root.contains(document.activeElement)
          )
            timer = setTimeout(
              () => show(index + 1, false),
              root.classList.contains("benefit-grid") ? 7000 : 6500,
            );
        };
        function show(next, manual = true) {
          index = (next + slides.length) % slides.length;
          track.style.transition = reduced.matches
            ? "none"
            : "transform 480ms ease";
          track.style.transform = `translateX(-${index * 100}%)`;
          slides.forEach((slide, i) => {
            slide.setAttribute("aria-hidden", String(i !== index));
            slide.toggleAttribute("inert", i !== index);
            buttons[i].setAttribute("aria-pressed", String(i === index));
          });
          status.setAttribute("aria-live", manual ? "polite" : "off");
          status.textContent = slides[index].querySelector("h3").textContent;
          schedule();
        }
        buttons.forEach((button, i) => on(button, "click", () => show(i)));
        on(viewport, "keydown", (e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            show(index + (e.key === "ArrowRight" ? 1 : -1));
          }
        });
        on(viewport, "pointerdown", (e) => {
          gesture = { x: e.clientX, y: e.clientY, id: e.pointerId };
          clearTimeout(timer);
        });
        on(window, "pointerup", (e) => {
          if (!gesture || gesture.id !== e.pointerId) return;
          const dx = e.clientX - gesture.x,
            dy = e.clientY - gesture.y;
          gesture = null;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3)
            show(index + (dx < 0 ? 1 : -1));
          else schedule();
        });
        on(window, "pointercancel", () => {
          gesture = null;
          schedule();
        });
        on(root, "mouseenter", () => {
          hovered = true;
          clearTimeout(timer);
        });
        on(root, "mouseleave", () => {
          hovered = false;
          schedule();
        });
        on(root, "focusin", () => clearTimeout(timer));
        on(root, "focusout", (e) => {
          if (!root.contains(e.relatedTarget)) {
            clearTimeout(timer);
            timer = setTimeout(schedule, 0);
          }
        });
        on(document, "visibilitychange", schedule);
        on(reduced, "change", () => show(index, false));
        show(0, false);
        cleanups.push(() => {
          disposed = true;
          clearTimeout(timer);
          listeners.forEach((fn) => fn());
          root.innerHTML = original;
          root.classList.remove("info-carousel");
          root.removeAttribute("aria-roledescription");
        });
      });
  }
  return { init, destroy };
})();
