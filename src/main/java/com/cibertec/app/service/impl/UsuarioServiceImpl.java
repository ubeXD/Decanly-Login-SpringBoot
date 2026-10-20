
package com.cibertec.app.service.impl;

import java.util.Optional;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cibertec.app.entity.RolUsuario;
import com.cibertec.app.entity.Usuario;
import com.cibertec.app.repository.UsuarioRepository;
import com.cibertec.app.service.UsuarioService;

@Service
public class UsuarioServiceImpl
        implements UsuarioService, UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioServiceImpl(
            UsuarioRepository usuarioRepository) {

        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Usuario> buscarPorCorreo(String correo) {

        if (correo == null || correo.isBlank()) {
            return Optional.empty();
        }

        return usuarioRepository.findByCorreoIgnoreCase(
                correo.trim()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String correo)
            throws UsernameNotFoundException {

        // Buscar al usuario en MySQL.
        Usuario usuario = buscarPorCorreo(correo)
                .orElseThrow(() ->
                        new UsernameNotFoundException(
                                "Credenciales incorrectas"
                        )
                );

        // El inicio de sesión es exclusivo para ADMIN.
        if (usuario.getRol() != RolUsuario.ADMIN) {
            throw new UsernameNotFoundException(
                    "Credenciales incorrectas"
            );
        }

        // Spring Security validará la contraseña BCrypt.
        return User.withUsername(usuario.getCorreo())
                .password(usuario.getClaveHash())
                .roles("ADMIN")
                .disabled(!usuario.isActivo())
                .build();
    }
}
