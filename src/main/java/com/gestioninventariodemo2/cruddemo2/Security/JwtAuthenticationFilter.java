package com.gestioninventariodemo2.cruddemo2.Security;

import com.gestioninventariodemo2.cruddemo2.Services.AuthenticationService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie; // <-- ¡IMPORTA LA CLASE COOKIE!
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull; // <-- (Asegurate de tener este import)
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final AuthenticationService authenticationService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
    @NonNull HttpServletResponse response,
    @NonNull FilterChain filterChain) throws ServletException, IOException {
        // --- ¡CAMBIO 1: IGNORAR LA RUTA DE LOGIN! ---
        // Si es la ruta de login, no buscamos token, solo dejamos pasar.
        if (request.getServletPath().equals("/api/auth/login")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // --- ¡CAMBIO 2: USAR EL NUEVO MÉTODO extractToken! ---
             String token = extractToken(request); // Ahora busca en las Cookies

            if (token != null) {
                UserDetails userDetails = authenticationService.validateToken(token);

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userDetails,
                    null,
                    userDetails.getAuthorities()
                    );

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }catch (Exception ex){
                log.warn("Token invalido o expirado: " + ex.getMessage());
            }

            filterChain.doFilter(request,response);
        }

        // --- ¡CAMBIO 3: MÉTODO extractToken COMPLETAMENTE NUEVO! ---
        /**
         * * Extrae el token JWT desde la Cookie HttpOnly llamada "token".
         * */
        private String extractToken(HttpServletRequest request){
             // 1. Obtener todas las cookies
            Cookie[] cookies = request.getCookies();

             // 2. Si no hay cookies, no hay token
            if (cookies == null) {
                return null;
            }

            // 3. Buscar la cookie que se llama "token"
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals("token")) {
                    return cookie.getValue();
                }
            }// 4. Si no se encontró la cookie "token"
            return null;
        }
}