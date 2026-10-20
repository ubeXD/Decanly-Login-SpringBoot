package com.cibertec.app.controller;

import java.util.Map;

import com.cibertec.app.entity.RolUsuario;
import com.cibertec.app.entity.Usuario;
import com.cibertec.app.service.UsuarioService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.security.web.context.SecurityContextRepository;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sesion")
public class SesionController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contextRepository;
    private final UsuarioService usuarioService;

    public SesionController(
            AuthenticationManager authenticationManager,
            SecurityContextRepository contextRepository,
            UsuarioService usuarioService) {

        this.authenticationManager = authenticationManager;
        this.contextRepository = contextRepository;
        this.usuarioService = usuarioService;
    }

    public record LoginRequest(
            String email,
            String password
    ) {}

    public record UsuarioPublico(
            String name,
            String email,
            String role
    ) {}

    public record SesionResponse(
            UsuarioPublico user
    ) {}

    @GetMapping
    public ResponseEntity<SesionResponse> obtenerSesion() {

        Authentication auth =
                SecurityContextHolder.getContext()
                        .getAuthentication();

        if (auth == null
                || !auth.isAuthenticated()
                || auth instanceof AnonymousAuthenticationToken) {

            return ResponseEntity.ok(
                    new SesionResponse(null)
            );
        }

        UsuarioPublico usuario = usuarioService
                .buscarPorCorreo(auth.getName())
                .filter(Usuario::isActivo)
                .filter(u -> u.getRol() == RolUsuario.ADMIN)
                .map(this::convertirUsuario)
                .orElse(null);

        return ResponseEntity.ok(
                new SesionResponse(usuario)
        );
    }

    @PostMapping
    public ResponseEntity<?> iniciarSesion(
            @RequestBody(required = false) LoginRequest datos,
            HttpServletRequest request,
            HttpServletResponse response) {

        if (datos == null
                || datos.email() == null
                || datos.email().isBlank()
                || datos.password() == null
                || datos.password().isBlank()) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "message",
                            "Ingresa tu correo y contraseña."
                    )
            );
        }

        try {

            Authentication autenticacion =
                    authenticationManager.authenticate(
                            UsernamePasswordAuthenticationToken
                                    .unauthenticated(
                                            datos.email().trim(),
                                            datos.password()
                                    )
                    );

            Usuario usuario = usuarioService
                    .buscarPorCorreo(autenticacion.getName())
                    .filter(Usuario::isActivo)
                    .filter(u -> u.getRol() == RolUsuario.ADMIN)
                    .orElseThrow(() ->
                            new BadCredentialsException(
                                    "Credenciales incorrectas"
                            )
                    );

            request.getSession(true);
            request.changeSessionId();

            SecurityContext contexto =
                    SecurityContextHolder.createEmptyContext();

            contexto.setAuthentication(autenticacion);

            SecurityContextHolder.setContext(contexto);

            contextRepository.saveContext(
                    contexto,
                    request,
                    response
            );

            return ResponseEntity.ok(
                    new SesionResponse(
                            convertirUsuario(usuario)
                    )
            );

        } catch (AuthenticationException ex) {

            SecurityContextHolder.clearContext();

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(
                            Map.of(
                                    "message",
                                    "Correo o contraseña incorrectos, "
                                    + "o cuenta desactivada."
                            )
                    );
        }
    }

    @DeleteMapping
    public ResponseEntity<Void> cerrarSesion(
            HttpServletRequest request,
            HttpServletResponse response) {

        SecurityContextHolder.clearContext();

        HttpSession sesion =
                request.getSession(false);

        if (sesion != null) {
            sesion.invalidate();
        }

        Cookie cookie = new Cookie(
                "JSESSIONID", ""
        );

        String contextPath = request.getContextPath();

        cookie.setPath(
                contextPath.isEmpty()
                        ? "/"
                        : contextPath
        );

        cookie.setMaxAge(0);
        cookie.setHttpOnly(true);
        cookie.setSecure(request.isSecure());

        response.addCookie(cookie);

        return ResponseEntity.noContent().build();
    }

    private UsuarioPublico convertirUsuario(
            Usuario usuario) {

        return new UsuarioPublico(
                usuario.getNombre(),
                usuario.getCorreo(),
                usuario.getRol().name()
        );
    }
}
