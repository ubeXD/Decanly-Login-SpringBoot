"use strict";
// Formulario y mensaje compartidos por las dos versiones.
const DecanlyPedido = (() => {
  function fields() {
    return `<form class="checkout-form" id="checkout">
      <h3>Datos de tu pedido</h3>
      <label for="customer">Nombre completo</label>
      <input class="field" id="customer" name="customer" autocomplete="name" placeholder="Nombres y apellidos" minlength="2" maxlength="120" required>
      <label for="customer-phone">WhatsApp</label>
      <input class="field" id="customer-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="Ej. 936240578" maxlength="15" required>
      <label for="delivery-address">Dirección</label>
      <input class="field" id="delivery-address" name="address" autocomplete="street-address" placeholder="Tu dirección completa" minlength="5" maxlength="250" required>
      <label class="check-label"><input type="checkbox" name="terms" required><span>Acepto los <a href="#terminos" target="_blank" rel="noopener">términos y condiciones</a>.</span></label>
      <button class="btn" type="submit">Confirmar pedido por WhatsApp ↗</button>
      <p class="form-feedback" role="status" aria-live="polite"></p>
    </form>`;
  }
  function read(form) {
    const data = new FormData(form);
    const text = (key) => String(data.get(key) || "").trim();
    const digits = text("phone").replace(/\D/g, "");
    if (!/^(?:51)?9\d{8}$/.test(digits))
      throw new Error(
        "Escribe un WhatsApp peruano de 9 dígitos, con +51 opcional.",
      );
    const payload = {
      customer: text("customer"),
      phone: "+51" + digits.slice(-9),
      address: text("address"),
      acceptTerms: data.has("terms"),
    };
    if (payload.customer.length < 2 || payload.address.length < 5)
      throw new Error("Completa tu nombre y dirección.");
    if (!payload.acceptTerms)
      throw new Error("Acepta los términos y condiciones para continuar.");
    return payload;
  }
  function message({ reference, customer, lines, total, shipping }) {
    const detail = lines
      .map(
        (line, index) =>
          `${index + 1}. ${line.brand} · ${line.name}\n   ${line.qty} × ${line.size} ml${line.group ? " · Pack" : ""}`,
      )
      .join("\n\n");
    return `¡Hola Decanly! 👋 Quiero confirmar mi pedido:

🧾 Pedido: ${reference}
👤 Cliente: ${customer.customer}
📱 WhatsApp: ${customer.phone}

📦 Detalle del Pedido:

${detail}

💰 Total: S/ ${Number(total).toFixed(2)}
🚚 Envío: ${shipping}

📍 Dirección: ${customer.address}

✅ Acepto los términos y condiciones.`;
  }
  function snapshot(form) {
    return form ? [...new FormData(form)] : [];
  }
  function restore(form, saved) {
    if (!form) return;
    for (const [key, value] of saved) {
      const field = form.elements.namedItem(key);
      if (!field) continue;
      if (field.type === "checkbox") field.checked = true;
      else field.value = value;
    }
  }
  return Object.freeze({ fields, read, message, snapshot, restore });
})();
