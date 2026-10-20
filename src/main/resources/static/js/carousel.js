"use strict";

// Se conserva la imagen de referencia completa. Los viewBox muestran únicamente
// las fotografías del banner, sin la cabecera ni el pie de la captura original.
const DecanlyCarousel = (() => {
  const scenes = [
    { brand: "Valentino", title: "Una noche en Roma", x: 74 },
    { brand: "Xerjoff", title: "Un viaje al Mediterráneo", x: 458 },
    { brand: "Jean Paul Gaultier", title: "El aroma del atardecer", x: 843 },
  ];
  let cleanup = () => {};

  function markup() {
    const slides = Array.from({ length: 9 }, (_, index) => {
      const scene = scenes[index % 3];
      return `<article class="banner-slide" role="group" aria-roledescription="diapositiva" aria-label="${(index % 3) + 1} de 3: ${scene.brand}" aria-hidden="true" inert>
        <a class="banner-link" href="#catalogo?marca=${encodeURIComponent(scene.brand)}" data-action="brand" data-brand="${scene.brand}" aria-label="Descubrir perfumes de ${scene.brand}">
          <svg class="banner-image" viewBox="${scene.x} 118 383 490" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
            <image href="assets/banner-reference.png" width="1300" height="731" />
          </svg>
          <div class="banner-caption"><span>${scene.brand}</span><strong>${scene.title}</strong><span class="banner-cta">Descubrir fragancias</span></div>
        </a>
      </article>`;
    }).join("");
    return `<section class="showcase" aria-roledescription="carrusel" aria-label="Fragancias destacadas">
      <h1 class="sr-only">Descubre tus perfumes favoritos en decants de 3, 5 y 10 ml.</h1>
      <div class="carousel-viewport" tabindex="0" aria-label="Explora las fragancias con las teclas izquierda y derecha"><div class="carousel-track">${slides}</div></div>
      <div class="carousel-controls">
        <span class="carousel-hint">Tu próxima fragancia te espera</span>
        <div class="carousel-dots" aria-label="Elegir fragancia">${scenes.map((s, i) => `<button type="button" data-slide="${i}" aria-label="Mostrar ${s.brand}" aria-pressed="${i === 0}"><span></span></button>`).join("")}</div>
      </div>
      <span class="sr-only carousel-status" aria-live="off"></span>
    </section>`;
  }

  function init() {
    cleanup();
    const root = document.querySelector(".showcase");
    if (!root) return;
    const viewport = root.querySelector(".carousel-viewport");
    const track = root.querySelector(".carousel-track");
    const slides = [...track.children];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listeners = [];
    let position = 3,
      timer,
      settling,
      busy = false;
    let paused = reduced.matches,
      hovered = false,
      touching = false;
    let pointerStart = null,
      blockClick = false;
    const visibleCount = () =>
      window.innerWidth <= 600 ? 1 : window.innerWidth <= 900 ? 2 : 3;
    const current = () => (((position - 3) % 3) + 3) % 3;
    const on = (el, event, handler, options) => {
      el.addEventListener(event, handler, options);
      listeners.push(() => el.removeEventListener(event, handler, options));
    };

    function paint(animate = true) {
      track.style.transition =
        animate && !reduced.matches
          ? "transform 650ms cubic-bezier(.22,.61,.36,1)"
          : "none";
      track.style.transform = `translateX(-${(position * 100) / visibleCount()}%)`;
      slides.forEach((slide, i) => {
        const visible = i >= position && i < position + visibleCount();
        slide.toggleAttribute("inert", !visible);
        slide.setAttribute("aria-hidden", String(!visible));
      });
      root
        .querySelectorAll("[data-slide]")
        .forEach((button, i) =>
          button.setAttribute("aria-pressed", String(i === current())),
        );
      root.querySelector(".carousel-status").textContent =
        `${scenes[current()].brand}, ${current() + 1} de 3`;
    }
    function schedule() {
      clearTimeout(timer);
      if (
        !paused &&
        !hovered &&
        !touching &&
        !document.hidden &&
        !root.contains(document.activeElement)
      )
        timer = setTimeout(() => move(1, false), 6500);
    }
    function settle() {
      clearTimeout(settling);
      position = 3 + current();
      busy = false;
      paint(false);
      schedule();
    }
    function move(delta, manual = true) {
      if (busy) return;
      clearTimeout(timer);
      root
        .querySelector(".carousel-status")
        .setAttribute("aria-live", manual ? "polite" : "off");
      position += delta;
      busy = true;
      paint();
      settling = setTimeout(settle, reduced.matches ? 0 : 680);
    }
    on(root, "click", (event) => {
      const button = event.target.closest("[data-slide]");
      if (!button) return;
      move(Number(button.dataset.slide) - current());
    });
    on(viewport, "keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        move(event.key === "ArrowLeft" ? -1 : 1);
      }
    });
    on(viewport, "pointerdown", (event) => {
      pointerStart = { x: event.clientX, y: event.clientY };
      touching = true;
      clearTimeout(timer);
    });
    on(viewport, "pointerup", (event) => {
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x,
        dy = event.clientY - pointerStart.y;
      pointerStart = null;
      touching = false;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        blockClick = true;
        move(dx < 0 ? 1 : -1);
        setTimeout(() => {
          blockClick = false;
        }, 400);
      } else schedule();
    });
    on(viewport, "pointercancel", () => {
      pointerStart = null;
      touching = false;
      schedule();
    });
    on(
      viewport,
      "click",
      (event) => {
        if (blockClick) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true,
    );
    on(viewport, "dragstart", (event) => event.preventDefault());
    on(root, "mouseenter", (event) => {
      hovered = true;
      clearTimeout(timer);
    });
    on(root, "mouseleave", () => {
      hovered = false;
      schedule();
    });
    on(root, "focusin", () => clearTimeout(timer));
    on(root, "focusout", () => setTimeout(schedule, 0));
    on(document, "visibilitychange", schedule);
    on(window, "resize", settle);
    on(reduced, "change", () => {
      paused = reduced.matches;
      settle();
    });
    paint(false);
    schedule();
    cleanup = () => {
      paused = true;
      clearTimeout(timer);
      clearTimeout(settling);
      listeners.forEach((remove) => remove());
    };
  }
  return { markup, init, destroy: () => cleanup() };
})();
