package com.cibertec.app.service;

import java.util.Optional;

import com.cibertec.app.entity.Usuario;

public interface UsuarioService {

    Optional<Usuario> buscarPorCorreo(String correo);
}
