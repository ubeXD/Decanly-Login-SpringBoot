package com.cibertec.app.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Solo abre vistas. El frontend ya es interactivo. El grupo implementará la API y la persistencia. */
@Controller
public class VistasController {
    @GetMapping("/")
    public String vistaInicioIndex() {
        return "inicio/index";
    }

    @GetMapping("/catalogo")
    public String vistaCatalogoIndex() {
        return "catalogo/index";
    }

    @GetMapping("/promociones")
    public String vistaPromocionesIndex() {
        return "promociones/index";
    }

    @GetMapping("/packs")
    public String vistaPacksIndex() {
        return "packs/index";
    }

    @GetMapping("/contacto")
    public String vistaContactoIndex() {
        return "contacto/index";
    }

    @GetMapping("/cuenta")
    public String vistaCuentaIndex() {
        return "cuenta/index";
    }

    @GetMapping("/terminos")
    public String vistaLegalTerminos() {
        return "legal/terminos";
    }

    @GetMapping("/envios")
    public String vistaLegalEnvios() {
        return "legal/envios";
    }

    @GetMapping("/privacidad")
    public String vistaLegalPrivacidad() {
        return "legal/privacidad";
    }

    @GetMapping("/carrito/vacio")
    public String vistaCarritoVacio() {
        return "carrito/vacio";
    }

    @GetMapping("/carrito")
    public String vistaCarritoIndex() {
        return "carrito/index";
    }

    @GetMapping("/producto")
    public String vistaProductoIndex() {
        return "producto/index";
    }

    @GetMapping("/promocion")
    public String vistaPromocionIndex() {
        return "promocion/index";
    }

    @GetMapping("/producto/new")
    public String vistaProductoCreate() {
        return "producto/create";
    }

    @GetMapping("/producto/edit")
    public String vistaProductoEdit() {
        return "producto/edit";
    }

    @GetMapping("/promocion/new")
    public String vistaPromocionCreate() {
        return "promocion/create";
    }

    @GetMapping("/promocion/edit")
    public String vistaPromocionEdit() {
        return "promocion/edit";
    }

    @GetMapping("/perfume/detalle")
    public String vistaPerfumeDetalle() {
        return "perfume/detalle";
    }

    @GetMapping("/vistas")
    public String vistaVistasIndex() {
        return "vistas/index";
    }

    @GetMapping("/pedidos")
    public String vistaPedidosIndex() { return "pedidos/index"; }
}
