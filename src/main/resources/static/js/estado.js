"use strict";

const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (value) => "S/ " + Number(value).toFixed(2);
const BASE =
  document.querySelector('meta[name="decanly-base"]')?.content || "/";
const route = document.body.dataset.route || "inicio";
const currentPage = document.body.dataset.page || "inicio/index";
const SIZES = ["3", "5", "10"],
  FREE_SHIPPING = 200;
const app = $("#app"),
  modal = $("#product-modal");
const basketKey = "decanly-basket-v2:" + BASE;
let products = [],
  promos = [],
  cart = [],
  pack = [],
  selected = {},
  promoSizes = {},
  editingPackItems = [];
let storeConfig = {},
  packDiscount = 10,
  admin = false,
  detailView = "perfume",
  toastTimer,
  ready = false;
let filter = { q: "", brand: "", occasion: "", category: "", sort: "featured" };
const get = (id) => products.find((p) => p.id === Number(id));
const size = (id) =>
  selected[id] || SIZES.find((s) => get(id)?.stock[s] > 0) || "3";
const unit = (p, s) => +(p.prices[s] * (1 - p.discount / 100)).toFixed(2);
const pathTo = (path) => BASE + path.replace(/^\//, "");
const assetUrl = (value) =>
  value?.startsWith("assets/") || value?.startsWith("api/")
    ? pathTo(value)
    : value;
function navigate(path) {
  location.assign(pathTo(path));
}
const routePaths = {
  inicio: "/",
  catalogo: "/catalogo",
  promociones: "/promociones",
  packs: "/packs",
  carrito: "/carrito",
  contacto: "/contacto",
  cuenta: "/cuenta",
  terminos: "/terminos",
  envios: "/envios",
  privacidad: "/privacidad",
};
function normalize(root) {
  root.querySelectorAll("[src],image[href]").forEach((n) => {
    const a = n.hasAttribute("src") ? "src" : "href",
      v = n.getAttribute(a);
    if (v?.startsWith("assets/")) n.setAttribute(a, pathTo(v));
  });
  root.querySelectorAll('a[href^="#"]').forEach((a) => {
    const [r, q] = a.getAttribute("href").slice(1).split("?");
    if (routePaths[r]) a.href = pathTo(routePaths[r]) + (q ? "?" + q : "");
  });
}
function put(node, markup) {
  if (!node) return;
  node.innerHTML = markup;
  normalize(node);
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3600);
}
function updateCount() {
  $("#cart-count").textContent = cart.reduce((n, l) => n + l.qty, 0);
}
function saveBasket() {
  try {
    sessionStorage.setItem(
      basketKey,
      JSON.stringify({ cart, pack, selected, promoSizes }),
    );
  } catch {
    toast(
      "No se pudo conservar la selección al cambiar de página. Revisa el almacenamiento del navegador.",
    );
  }
  updateCount();
}
function loadBasket() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(basketKey) || "{}");
    cart = Array.isArray(saved.cart) ? saved.cart : [];
    pack = Array.isArray(saved.pack) ? saved.pack : [];
    selected = saved.selected || {};
    promoSizes = saved.promoSizes || {};
  } catch {
    cart = [];
    pack = [];
    selected = {};
    promoSizes = {};
  }
  reconcileBasket();
}
function reconcileBasket() {
  const clean = (lines, reserve = {}) =>
    lines.filter((l) => {
      const p = get(l.id);
      if (
        !p ||
        !SIZES.includes(String(l.size)) ||
        !Number.isInteger(l.qty) ||
        l.qty < 1
      )
        return false;
      l.size = String(l.size);
      const k = l.id + "-" + l.size;
      const remain = Math.max(0, p.stock[l.size] - (reserve[k] || 0));
      l.qty = Math.min(l.qty, remain);
      reserve[k] = (reserve[k] || 0) + l.qty;
      return l.qty > 0;
    });
  const reserve = {};
  cart = clean(cart, reserve);
  pack = clean(pack, reserve);
  saveBasket();
}
async function refreshData({ syncBasket = true } = {}) {
  const data = await DecanlyAPI.load();
  products = data.products.map((p) => ({ ...p, image: assetUrl(p.image) }));
  promos = data.packs;
  storeConfig = data.config.store;
  packDiscount = data.config.packDiscount;
  admin = data.user?.role === "ADMIN";
  if (syncBasket) reconcileBasket();
  return data;
}
