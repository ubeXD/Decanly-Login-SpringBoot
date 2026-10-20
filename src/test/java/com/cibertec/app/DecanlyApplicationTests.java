package com.cibertec.app;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestExecutionListeners(listeners = DependencyInjectionTestExecutionListener.class, mergeMode = TestExecutionListeners.MergeMode.REPLACE_DEFAULTS)
class DecanlyApplicationTests {
    @Autowired MockMvc mvc;

    @Test void renderizaTodasLasVistasConElFrontendActivo() throws Exception {
        String[][] paginas = {
            {"/", "inicio-index"},
            {"/catalogo", "catalogo-index"},
            {"/promociones", "promociones-index"},
            {"/packs", "packs-index"},
            {"/contacto", "contacto-index"},
            {"/cuenta", "cuenta-index"},
            {"/terminos", "legal-terminos"},
            {"/envios", "legal-envios"},
            {"/privacidad", "legal-privacidad"},
            {"/carrito/vacio", "carrito-vacio"},
            {"/carrito", "carrito-index"},
            {"/producto", "producto-index"},
            {"/promocion", "promocion-index"},
            {"/pedidos", "pedidos-index"},
            {"/producto/new", "producto-create"},
            {"/producto/edit", "producto-edit"},
            {"/promocion/new", "promocion-create"},
            {"/promocion/edit", "promocion-edit"},
            {"/perfume/detalle", "perfume-detalle"},
            {"/vistas", "vistas-index"}
        };
        Path output = Path.of("target", "frontend-qa");
        Files.createDirectories(output);
        for (String[] pagina : paginas) {
            String html = mvc.perform(get(pagina[0])).andExpect(status().isOk())
                .andExpect(content().string(containsString("Decanly")))
                .andExpect(content().string(containsString("/js/frontend.js")))
                .andExpect(content().string(containsString("/css/frontend.css")))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
            Files.writeString(output.resolve(pagina[1] + ".html"), html, StandardCharsets.UTF_8);
        }
    }

    @Test void sirveLosRecursosDelFrontend() throws Exception {
        for (String ruta : new String[]{"/css/style.css", "/css/decanly.css", "/css/frontend.css", "/assets/yape.png", "/assets/plin.png", "/assets/perfume-1.svg", "/js/frontend-config.js", "/js/datos-iniciales.js", "/js/api.js", "/js/estado.js", "/js/visuals.js", "/js/carousel.js", "/js/componentes.js", "/js/frontend.js", "/js/pedido.js", "/css/header.css", "/css/fonts.css", "/assets/fonts/OpenSauceSans-Regular.ttf"}) {
            mvc.perform(get(ruta)).andExpect(status().isOk());
        }
    }

    @Test void elBackendDeNegocioQuedaPendiente() throws Exception {
        mvc.perform(get("/api/productos")).andExpect(status().isNotFound());
        mvc.perform(post("/producto")).andExpect(status().isMethodNotAllowed());
        mvc.perform(post("/promocion")).andExpect(status().isMethodNotAllowed());
        mvc.perform(post("/cuenta")).andExpect(status().isMethodNotAllowed());
    }

    @Test void admiteUnContextoDeAplicacionEnTomcat() throws Exception {
        String html = mvc.perform(get("/decanly/catalogo").contextPath("/decanly"))
            .andExpect(status().isOk())
            .andExpect(content().string(containsString("content=\"/decanly/\"")))
            .andExpect(content().string(containsString("src=\"/decanly/js/frontend.js\"")))
            .andExpect(content().string(containsString("href=\"/decanly/carrito\"")))
            .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        Files.createDirectories(Path.of("target", "frontend-qa"));
        Files.writeString(Path.of("target", "frontend-qa", "contexto.html"), html, StandardCharsets.UTF_8);
    }
}
