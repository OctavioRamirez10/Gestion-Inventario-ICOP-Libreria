package com.gestioninventariodemo2.cruddemo2.Model;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario implements UserDetails{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idUsuario;

    @Size(max = 70)
    @Column(name = "nombre", nullable = false, length = 70)
    private String nombre;

    @Size(max = 70)
    @Column(name = "apellido", nullable = false, length = 70)
    private String apellido;

    @Size(max = 255)
    @Column(name = "email", unique = true, nullable = false, length = 255)
    private String email;

    @Column(name = "contrasena", nullable = false, length = 255)
    private String contrasena;

    @Column(name = "estado")
    private String estado;

    @ManyToOne
    @JoinColumn(name = "idRol", nullable = false)
    private Rol rol;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROL_" + rol.getDescripcion().toUpperCase()));
    }

    @Override
    public String getPassword() {
        return contrasena;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
    return true;
    }
}

