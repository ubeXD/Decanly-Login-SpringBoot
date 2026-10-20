// Pruebas de interacción sin servidor, sobre HTML renderizado por MockMvc.
// Ejecutar primero ./mvnw test; luego npm ci y npm test en esta carpeta.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import * as css from "css-tree";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const rendered = path.join(root, "target/frontend-qa");
const resources = path.join(root, "src/main/resources/static");
const pages = [
  ["inicio-index", "/"],
  ["catalogo-index", "/catalogo"],
  ["promociones-index", "/promociones"],
  ["packs-index", "/packs"],
  ["contacto-index", "/contacto"],
  ["cuenta-index", "/cuenta"],
  ["legal-terminos", "/terminos"],
  ["legal-envios", "/envios"],
  ["legal-privacidad", "/privacidad"],
  ["carrito-vacio", "/carrito/vacio"],
  ["carrito-index", "/carrito"],
  ["producto-index", "/producto"],
  ["promocion-index", "/promocion"],
  ["pedidos-index", "/pedidos"],
  ["producto-create", "/producto/new"],
  ["producto-edit", "/producto/edit"],
  ["promocion-create", "/promocion/new"],
  ["promocion-edit", "/promocion/edit"],
  ["perfume-detalle", "/perfume/detalle"],
  ["vistas-index", "/vistas"],
];
const session = new Map();
let live = null,
  checks = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(test, message = "La interacción no terminó") {
  for (let i = 0; i < 250; i++) {
    if (test()) return;
    await sleep(4);
  }
  throw new Error(message);
}
function check(value, message) {
  assert.ok(value, message);
  checks++;
}
function finishPage() {
  if (!live) return;
  session.clear();
  for (let i = 0; i < live.w.sessionStorage.length; i++) {
    const key = live.w.sessionStorage.key(i);
    session.set(key, live.w.sessionStorage.getItem(key));
  }
  live.w.close();
  live = null;
}
async function page(file, url, options = {}) {
  finishPage();
  const errors = [],
    navigation = [],
    opened = [];
  const console = new VirtualConsole();
  console.on("jsdomError", (error) => errors.push(error));
  const dom = new JSDOM(
    fs.readFileSync(path.join(rendered, file + ".html"), "utf8"),
    {
      url: "https://decanly.test" + url,
      runScripts: "outside-only",
      pretendToBeVisual: true,
      virtualConsole: console,
    },
  );
  const w = dom.window,
    ctx = dom.getInternalVMContext();
  for (const [key, value] of session) w.sessionStorage.setItem(key, value);
  w.structuredClone = structuredClone;
  w.TextEncoder = TextEncoder;
  Object.defineProperty(w.crypto,"subtle",{value:(await import("node:crypto")).webcrypto.subtle});
  w.matchMedia = (query) => ({
    media: query,
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  });
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = function () {
    this.dataset.scrolled = "yes";
  };
  w.HTMLElement.prototype.scrollTo = function (v) {
    this.scrollLeft = v.left || 0;
  };
  w.HTMLElement.prototype.scrollBy = function (v) {
    this.scrollLeft += v.left || 0;
  };
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new w.Event("close"));
  };
  w.URL.createObjectURL = () => "blob:photo";
  w.URL.revokeObjectURL = () => {};
  w.open = (...args) => {
    opened.push(args);
    return null;
  };
  w.__navigate = (value) => navigation.push(value);
  w.fetch =
    options.fetch ||
    (() => {
      throw new Error("El modo local no debe llamar a la API");
    });
  const evaluate = (code) => vm.runInContext(code, ctx);
  for (const script of w.document.querySelectorAll("script[src]")) {
    let code = fs.readFileSync(
      path.join(resources, "js", path.basename(script.src)),
      "utf8",
    );
    if (options.api && script.src.endsWith("frontend-config.js"))
      code = code.replace('mode: "local"', 'mode: "api"');
    evaluate(code);
    if (script.src.endsWith("estado.js"))
      evaluate("navigate = path => window.__navigate(path)");
  }
  const result = {
    w,
    dom,
    evaluate,
    navigation,
    opened,
    errors,
    $: (selector) => w.document.querySelector(selector),
    $$: (selector) => [...w.document.querySelectorAll(selector)],
    json: (code) => JSON.parse(JSON.stringify(evaluate(code))),
    async click(selector) {
      const button = this.$(selector);
      assert.ok(button, "No existe " + selector);
      button.click();
      await sleep(8);
    },
    input(selector, value, type = "input") {
      const field = this.$(selector);
      assert.ok(field, "No existe " + selector);
      field.value = value;
      field.dispatchEvent(new w.Event(type, { bubbles: true }));
    },
    async submit(selector) {
      const form = this.$(selector);
      assert.ok(form, selector);
      form.dispatchEvent(
        new w.Event("submit", { bubbles: true, cancelable: true }),
      );
      await until(() => !form.hasAttribute("aria-busy"));
      await sleep(5);
    },
  };
  live = result;
  await until(
    () =>
      evaluate("ready") ||
      navigation.length ||
      !result.$("#connection-status").hidden,
    "No terminó el inicio: " + file,
  );
  if (!options.allowFailure)
    check(
      result.$("#connection-status").hidden,
      result.$("#connection-status").textContent,
    );
  check(errors.length === 0, errors.map((e) => e.message).join("\n"));
  return result;
}

try {
  let p=await page('inicio-index','/');
  check(p.$$('.info-carousel').length===2,'Ventajas y servicios en carrusel');
  check(!/maqueta|demo|demostración/i.test(p.w.document.body.textContent),'Sin avisos antiguos');
  check(p.$('a[href="mailto:decanly@gmail.com"]'),'Correo visible');
  check(!p.$('a[href*="reclamaciones"]'),'Sin enlace retirado');
  await p.click('[data-action="detail"]');
  check(p.$('#product-modal').open,'Modal abierto');
  check(!p.$('.detail-notes'),'Sin notas aromáticas');
  check(p.$$('.detail-photo-slide').length===1,'Solo frasco original en modal');
  check(p.$('.detail-photo-slide img').src.endsWith('.svg'),'Frasco sin caja');
  await p.click('[data-action="detail-size"][data-size="5"]');
  await p.click('#product-modal [data-action="add"]');
  check(p.json('cart').length===1,'Producto añadido');
  p=await page('carrito-index','/carrito');
  check(p.$$('#checkout input').length===4,'Solo nombre, teléfono, dirección y términos');
  check(!p.$('[name="district"], [name="reference"], [name="agency"], [name="dataConfirmed"], [name="deliveryConfirmed"]'),'Campos retirados');
  p.input('#customer','Cliente de prueba');p.input('#customer-phone','936240578');p.input('#delivery-address','Av. Prueba 123, Lima');p.$('[name="terms"]').checked=true;
  await p.submit('#checkout');check(p.opened.length===1,'Se prepara WhatsApp');
  const text=decodeURIComponent(p.opened[0][0].split('?text=')[1]);
  check(text.includes('¡Hola Decanly!') && text.includes('Cliente de prueba') && text.includes('Av. Prueba 123'),'Mensaje con datos y detalle');
  check(!/Agencia:|Referencia:|Confirmo que/.test(text),'Mensaje simplificado');
  check(p.$('#checkout button[type="submit"]').disabled,'Confirmación no se duplica');
  p=await page('cuenta-index','/cuenta');await p.click('[data-action="local-fill"]');await p.submit('#login');check(p.navigation.includes('/producto'),'Acceso local');
  p=await page('producto-index','/producto');check(p.$$('#admin-rows tr').length===50,'50 perfumes administrables');
  const first=p.json('products[0]');check(first.image.endsWith('.svg'),'Catálogo sin cajas');
  p=await page('promocion-create','/promocion/new');check(p.$('[name="badge"]'),'Mensaje editable');
  p.input('[name="title"]','Selección de prueba');p.input('[name="description"]','Tres perfumes para descubrir');p.input('[name="badge"]','El favorito de muchos');
  await p.submit('#promo-form');check(p.navigation.includes('/promocion'),'Pack guardado');
  p=await page('promociones-index','/promociones');check(p.w.document.body.textContent.includes('El favorito de muchos'),'Etiqueta publicada');
  p=await page('pedidos-index','/pedidos');check(p.$('.orders-table'),'Mantenimiento de pedidos disponible');
  check(p.w.document.body.textContent.includes('Cliente de prueba'),'Pedido local conservado');
  const before=p.json('products').find(x=>x.id===first.id)?.stock['5'];
  const select=p.$('.orders-table select');select.value='CONFIRMADO';await p.click('[data-action="order-state"]');await until(()=>p.w.document.body.textContent.includes('CONFIRMADO'),'Estado guardado');
  for(const [file,url] of pages){p=await page(file,url);check(p.errors.length===0,file+' sin errores JS');check(!p.$('.detail-notes'),file+' sin notas en modal');check(!/maqueta|demostración|\bdemo\b/i.test(p.w.document.body.textContent),file+' sin textos retirados');}
  for(const file of fs.readdirSync(path.join(resources,'css')).filter(f=>f.endsWith('.css'))){css.parse(fs.readFileSync(path.join(resources,'css',file),'utf8'));checks++;}
  console.log(JSON.stringify({checks,status:'OK',pages:pages.length}));
} finally {finishPage();}
