package com.gestioninventariodemo2.cruddemo2.Services;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UsuarioDetailsService implements UserDetailsService{

    private final UsuarioRepository usuarioRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByEmail(email).orElseThrow(() -> new UsernameNotFoundException("Email o contraseña incorrectos"));

        return usuario;

        

    }
    

}
