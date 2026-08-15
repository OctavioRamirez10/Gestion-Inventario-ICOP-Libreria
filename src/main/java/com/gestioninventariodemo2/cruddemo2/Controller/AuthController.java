package com.gestioninventariodemo2.cruddemo2.Controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.AuthResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.LoginRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.UsuarioPerfilDTO;
import com.gestioninventariodemo2.cruddemo2.Services.AuthenticationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationService authenticationService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@RequestBody LoginRequestDTO loginRequestDTO, HttpServletResponse response){
        UserDetails userDetails = authenticationService.authenticate(
                loginRequestDTO.getEmail(),
                loginRequestDTO.getContrasena()
        );

        String tokenValue = authenticationService.generateToken(userDetails);


        // Crear cookie HTTP-only
        Cookie cookie = new Cookie("token", tokenValue);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // true si estás usando HTTPS
        cookie.setPath("/");     // cookie válida para toda la app
        cookie.setMaxAge(86400); // duración en segundos (1 día)
        response.addCookie(cookie);

        // 4. Obtener rol
        String rol = authenticationService.getRol(userDetails);


        // 5. Devolver solo el rol en el body
        AuthResponseDTO authResponseDTO = AuthResponseDTO.builder()
                .rol(rol)
                .build();

        return ResponseEntity.ok(authResponseDTO);
    }

    @GetMapping("/perfil")
    public ResponseEntity<UsuarioPerfilDTO> getPerfil(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        // Si no hay usuario logueado (Spring Security no lo encontró)
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        // Llamamos al servicio para que cree el DTO
        UsuarioPerfilDTO perfil = authenticationService.getPerfilUsuario(userDetails);
        return ResponseEntity.ok(perfil);
    }

}
