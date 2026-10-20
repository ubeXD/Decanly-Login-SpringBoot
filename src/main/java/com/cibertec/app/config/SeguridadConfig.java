package com.cibertec.app.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

import com.cibertec.app.service.impl.UsuarioServiceImpl;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
public class SeguridadConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(
            UsuarioServiceImpl usuarioService,
            PasswordEncoder passwordEncoder) {

        DaoAuthenticationProvider provider =
            new DaoAuthenticationProvider(usuarioService);

        provider.setPasswordEncoder(passwordEncoder);

        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            DaoAuthenticationProvider provider) {
        return new ProviderManager(provider);
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            DaoAuthenticationProvider provider,
            SecurityContextRepository repository) throws Exception {

        http
            .authenticationProvider(provider)

            .securityContext(context ->
                context.securityContextRepository(repository)
            )

            .authorizeHttpRequests(auth -> auth

            	    // Permite obtener el token CSRF para las solicitudes seguras.
            	    .requestMatchers(HttpMethod.GET, "/api/csrf").permitAll()

            	    // La API de sesión debe responder con JSON.
            	    .requestMatchers("/api/sesion").permitAll()

            	    // Consultas públicas de la tienda.
            	    .requestMatchers(
            	        HttpMethod.GET,
            	        "/api/productos",
            	        "/api/packs",
            	        "/api/configuracion"
            	    ).permitAll()

                // Consultas públicas de la tienda.
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/productos",
                    "/api/packs",
                    "/api/configuracion"
                ).permitAll()

                // Pedidos y reclamaciones de clientes invitados.
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/pedidos",
                    "/api/reclamaciones"
                ).permitAll()

                // Solo ADMIN puede modificar productos y packs.
                .requestMatchers(
                	    "/producto",
                	    "/producto/**",
                	    "/promocion",
                	    "/promocion/**",
                	    "/negocio",
                	    "/negocio/**",
                	    "/vistas",
                	    "/vistas/**"
                	).hasRole("ADMIN")

                .requestMatchers(
                    HttpMethod.PUT,
                    "/api/productos/**",
                    "/api/packs/**",
                    "/api/configuracion"
                ).hasRole("ADMIN")

                .requestMatchers(
                    HttpMethod.DELETE,
                    "/api/productos/**",
                    "/api/packs/**"
                ).hasRole("ADMIN")

                // Las demás operaciones de la API requieren sesión.
                .requestMatchers("/api/**").authenticated()

                .anyRequest().permitAll()
            )

            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, error) ->
                    escribirError(
                        response, 401, "Debes iniciar sesión."
                    )
                )
                .accessDeniedHandler((request, response, error) ->
                    escribirError(
                        response, 403,
                        "No tienes permisos para esta operación."
                    )
                )
            )


.formLogin(form -> form
    .loginPage("/cuenta")
    .loginProcessingUrl("/cuenta/login")
    .usernameParameter("correo")
    .passwordParameter("clave")
    .defaultSuccessUrl("/producto", true)
    .failureUrl("/cuenta?error")
    .permitAll()
)

.httpBasic(AbstractHttpConfigurer::disable)

.logout(logout -> logout
    .logoutUrl("/cuenta/logout")
    .logoutSuccessUrl("/cuenta?logout")
    .invalidateHttpSession(true)
    .deleteCookies("JSESSIONID")
)


            .sessionManagement(session -> session
                .sessionCreationPolicy(
                    SessionCreationPolicy.IF_REQUIRED
                )
                .sessionFixation(fixation ->
                    fixation.changeSessionId()
                )
            );

        return http.build();
    }

    private static void escribirError(
            HttpServletResponse response,
            int status,
            String mensaje) throws IOException {

        response.setStatus(status);
        response.setCharacterEncoding(
            StandardCharsets.UTF_8.name()
        );
        response.setContentType(
            MediaType.APPLICATION_JSON_VALUE
        );
        response.getWriter().write(
            "{\"message\":\"" + mensaje + "\"}"
        );
    }
}
