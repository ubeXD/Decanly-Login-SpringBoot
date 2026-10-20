"use strict";

// Iconos vectoriales propios: la misma cuadrícula y grosor en toda la tienda.
function icon(name, className = "") {
  const paths = {
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    left: '<path d="m14 6-6 6 6 6"/>',
    right: '<path d="m10 6 6 6-6 6"/>',
    bag: '<path d="M5 7h14l1 14H4L5 7Zm4 1V5a3 3 0 0 1 6 0v3"/>',
    shield:
      '<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8C4 8 5 1 9 3c2 1 3 5 3 5Zm0 0c8 0 7-7 3-5-2 1-3 5-3 5Z"/>',
    truck:
      '<path d="M3 5h11v12H3V5Zm11 5h4l3 4v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    support:
      '<path d="M4 13v-1a8 8 0 0 1 16 0v1M20 17v1a3 3 0 0 1-3 3h-4"/><rect x="2" y="11" width="4" height="7" rx="2"/><rect x="18" y="11" width="4" height="7" rx="2"/>',
    wallet:
      '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="m3 7 14-4v3m4 6h-6v4h6"/><path d="M17 14h.01"/>',
    bottle: '<path d="M9 3h6v4H9V3Zm0 4v3H7v11h10V10h-2V7M7 13h10"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="m14 5 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5Z"/>',
    box: '<path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10 9-5M3 8l9 5v9M7.5 5.5l9 5v5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    tag: '<path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7" cy="7" r="1"/>',
    settings:
      '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
    logout: '<path d="M9 4H4v16h5M10 12h11m-5-5 5 5-5 5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    sparkle:
      '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  };
  return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || paths.sparkle}</svg>`;
}

// Encuadres en SVG de las fotografías aportadas, sin retocar los originales.
function referencePhoto(file, viewBox, width, height, label, className = "") {
  return `<svg class="reference-photo ${className}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(label)}"><image href="assets/references/${file}" width="${width}" height="${height}"/></svg>`;
}

const DecanlyUX = (() => {
  let cleanup = () => {};
  function init() {
    cleanup();
    const listeners = [],
      timers = [];
    const on = (node, type, handler) => {
      if (!node) return;
      node.addEventListener(type, handler);
      listeners.push(() => node.removeEventListener(type, handler));
    };
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const rail = document.querySelector(".brand-rail");
    if (rail) {
      let touching = false,
        hovered = false;
      const step = () =>
        rail.firstElementChild.getBoundingClientRect().width +
        (parseFloat(getComputedStyle(rail).columnGap) || 0);
      const move = (direction) => {
        const end = rail.scrollWidth - rail.clientWidth;
        const next =
          direction > 0
            ? rail.scrollLeft >= end - 3
              ? 0
              : Math.min(end, rail.scrollLeft + step())
            : rail.scrollLeft <= 3
              ? end
              : Math.max(0, rail.scrollLeft - step());
        rail.scrollTo({
          left: next,
          behavior: reduced.matches ? "auto" : "smooth",
        });
      };
      const root = rail.closest(".brand-carousel");
      on(root, "mouseenter", () => {
        hovered = true;
      });
      on(root, "mouseleave", () => {
        hovered = false;
      });
      on(rail, "pointerdown", () => {
        touching = true;
      });
      on(window, "pointerup", () => {
        touching = false;
      });
      on(window, "pointercancel", () => {
        touching = false;
      });
      on(rail, "keydown", (event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }
      });
      timers.push(
        setInterval(() => {
          if (
            !reduced.matches &&
            !touching &&
            !hovered &&
            !document.hidden &&
            !root.contains(document.activeElement)
          )
            move(1);
        }, 3800),
      );
    }
    document.querySelectorAll("[data-scroll-target]").forEach((button) => {
      on(button, "click", () => {
        const target = document.getElementById(button.dataset.scrollTarget);
        target?.scrollBy({
          left: target.clientWidth * Number(button.dataset.direction),
          behavior: reduced.matches ? "auto" : "smooth",
        });
      });
    });
    cleanup = () => {
      listeners.forEach((fn) => fn());
      timers.forEach(clearInterval);
    };
  }
  return { init, destroy: () => cleanup() };
})();
