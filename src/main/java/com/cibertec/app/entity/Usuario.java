
package com.cibertec.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "nombre_usuario", nullable = false, length = 100)
    private String nombre;

    @Column(name = "correo_usuario", nullable = false,
            unique = true, length = 150)
    private String correo;

    @Column(name = "clave_hash_usuario", nullable = false, length = 255)
    private String claveHash;

    @Enumerated(EnumType.STRING)
    @Column(
        name = "rol_usuario",
        nullable = false,
        columnDefinition = "ENUM('ADMIN','VENDEDOR')"
    )
    private RolUsuario rol = RolUsuario.ADMIN;

    @Column(name = "activo_usuario", nullable = false)
    private boolean activo = true;

    // Constructor vacío requerido por JPA
    public Usuario() {
    }

    // Constructor con parámetros
    public Usuario(
            String nombre,
            String correo,
            String claveHash,
            RolUsuario rol,
            boolean activo) {

        this.nombre = nombre;
        this.correo = correo;
        this.claveHash = claveHash;
        this.rol = rol;
        this.activo = activo;
    }

    // GETTERS Y SETTERS

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public String getClaveHash() {
        return claveHash;
    }

    public void setClaveHash(String claveHash) {
        this.claveHash = claveHash;
    }

    public RolUsuario getRol() {
        return rol;
    }

    public void setRol(RolUsuario rol) {
        this.rol = rol;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }
}

