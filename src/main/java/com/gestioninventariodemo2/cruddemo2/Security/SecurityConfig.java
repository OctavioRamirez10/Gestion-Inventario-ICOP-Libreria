package com.gestioninventariodemo2.cruddemo2.Security;


import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;
import com.gestioninventariodemo2.cruddemo2.Services.AuthenticationService;
import com.gestioninventariodemo2.cruddemo2.Services.UsuarioDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;


@Configuration
public class SecurityConfig {

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter(AuthenticationService authenticationService){
        return new JwtAuthenticationFilter(authenticationService);
    }

    @Bean
    public UsuarioDetailsService usuarioDetailsService(UsuarioRepository usuarioRepository){
        return new UsuarioDetailsService(usuarioRepository);
    }
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/", "/index.html", "/css/**", "/js/**", "/images/**").permitAll()
                    .requestMatchers("/api/auth/login").permitAll()
                    
                    // Vistas HTML protegidas
                    .requestMatchers("/admin.html").hasAuthority("ROL_ADMINISTRADOR")
                    .requestMatchers("/empleado.html").hasAnyAuthority("ROL_ADMINISTRADOR", "ROL_EMPLEADO")
                    .requestMatchers("/cajero.html").hasAnyAuthority("ROL_ADMINISTRADOR", "ROL_CAJERO")

                    // Endpoints API protegidos por roles
                    .requestMatchers("/api/usuarios/**").hasAuthority("ROL_ADMINISTRADOR")
                    .requestMatchers("/api/compras/**").hasAnyAuthority("ROL_ADMINISTRADOR", "ROL_EMPLEADO")
                    .requestMatchers("/api/proveedores/**").hasAnyAuthority("ROL_ADMINISTRADOR", "ROL_EMPLEADO")
                    .requestMatchers("/api/informes/**").hasAnyAuthority("ROL_ADMINISTRADOR", "ROL_EMPLEADO")
                    .requestMatchers("/api/caja/estado/**", "/api/caja/sesion-activa/**").hasAnyAuthority("ROL_ADMINISTRADOR", "ROL_CAJERO", "ROL_EMPLEADO")
                    .requestMatchers("/api/caja/**").hasAnyAuthority("ROL_ADMINISTRADOR", "ROL_CAJERO")
                    
                    // Endpoints API para operaciones diarias (ventas, stock, clientes, etc)
                    .requestMatchers("/api/ventas/**", "/api/productos/**", "/api/clientes/**", 
                                     "/api/categorias/**", "/api/metodos-pago/**", "/api/stock/**").hasAnyAuthority("ROL_ADMINISTRADOR", "ROL_EMPLEADO", "ROL_CAJERO")
                    
                    .requestMatchers("/api/auth/perfil").authenticated()
                    .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    if (request.getRequestURI().startsWith("/api/")) {
                        response.sendError(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED, "No autorizado");
                    } else {
                        response.sendRedirect("/index.html");
                    }
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    if (request.getRequestURI().startsWith("/api/")) {
                        response.sendError(jakarta.servlet.http.HttpServletResponse.SC_FORBIDDEN, "Acceso denegado");
                    } else {
                        response.sendRedirect("/index.html");
                    }
                })
            )
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            ).addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }




    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

}