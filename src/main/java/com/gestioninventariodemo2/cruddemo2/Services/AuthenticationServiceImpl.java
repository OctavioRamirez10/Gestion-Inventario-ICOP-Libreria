package com.gestioninventariodemo2.cruddemo2.Services;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import com.gestioninventariodemo2.cruddemo2.DTO.UsuarioPerfilDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements AuthenticationService{

    private final AuthenticationManager authenticationManager;
    private final UsuarioDetailsService usuarioDetailsService;

    @Value("${jwt.secret}")
    private String secretKey;

    private final Long jwtExpiryMs = 86400000L;

    @Override
    public UserDetails authenticate(String email, String contrasena) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, contrasena));
        return usuarioDetailsService.loadUserByUsername(email);
    }

    @Override
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        String rol = userDetails.getAuthorities().stream()
                .findFirst()
                .map(auth -> auth.getAuthority())
                .orElse("USER");
        claims.put("rol", rol);

        return Jwts.builder()
        .setClaims(claims)
        .setSubject(userDetails.getUsername())
        .setIssuedAt(new Date(System.currentTimeMillis()))
        .setExpiration(new Date(System.currentTimeMillis() + jwtExpiryMs))
        .signWith(getSigningKey(), SignatureAlgorithm.HS256)
        .compact();
    }

    private Key getSigningKey(){
        byte[] keyBytes = secretKey.getBytes();
        return Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    public UserDetails validateToken(String token) {
        String username = extractUsername(token);
        return usuarioDetailsService.loadUserByUsername(username);

    }

    @Override
    public String getRol(UserDetails userDetails) {
        for(GrantedAuthority authority : userDetails.getAuthorities()){
            String rol = authority.getAuthority();
            if (rol.equals("ROL_ADMINISTRADOR")){
                return "ADMINISTRADOR";
            }else if (rol.equals("ROL_EMPLEADO")){
                return "EMPLEADO";
            }else if (rol.equals("ROL_CAJERO")){
                return "CAJERO";
            }
        }
        return "DESCONOCIDO";
    }

    private String extractUsername(String token){
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return  claims.getSubject();
    }

    @Override
    public UsuarioPerfilDTO getPerfilUsuario(UserDetails userDetails) {
        // 1. Convertimos UserDetails a tu entidad Usuario
        Usuario usuario = (Usuario) userDetails;
        
        // 2. Obtenemos el rol (usando la función que ya tenías)
        String rol = getRol(userDetails); // Esto devuelve "ADMINISTRADOR" o "EMPLEADO"
        
        // 3. Creamos el nombre completo
        String nombreCompleto = usuario.getNombre() + " " + usuario.getApellido();
        
        // 4. Devolvemos el DTO
        return UsuarioPerfilDTO.builder()
                .idUsuario(usuario.getIdUsuario())
                .nombreCompleto(nombreCompleto)
                .rol(rol)
                .build();
    }
}


