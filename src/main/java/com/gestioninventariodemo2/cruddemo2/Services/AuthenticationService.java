package com.gestioninventariodemo2.cruddemo2.Services;

import org.springframework.security.core.userdetails.UserDetails;

import com.gestioninventariodemo2.cruddemo2.DTO.UsuarioPerfilDTO;

public interface AuthenticationService {
    UserDetails authenticate(String email, String contrasena);
    String generateToken(UserDetails userDetails);
    UserDetails validateToken(String token);
    String getRol(UserDetails userDetails);

    UsuarioPerfilDTO getPerfilUsuario(UserDetails userDetails);


}
