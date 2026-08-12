package com.insurflow.assurance.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CORS configuration.
 *
 * Exposes a CorsConfigurationSource bean (NOT CorsFilter) so that
 * SecurityConfig.cors(Customizer.withDefaults()) can wire it automatically.
 *
 * Equivalent of app.use(cors({ origin, credentials: true })) in server.js.
 */
@Configuration
public class CorsConfig {

    @Value("${app.cors-origins}")
    private String corsOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Allow configured origins plus local dev origins (e.g. localhost:3000, 3001, 127.0.0.1:3000, etc.)
        List<String> origins = new java.util.ArrayList<>(
            java.util.Arrays.stream(corsOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList()
        );
        origins.add("http://localhost:*");
        origins.add("http://127.0.0.1:*");
        origins.add("https://localhost:*");
        origins.add("https://127.0.0.1:*");
        config.setAllowedOriginPatterns(origins);

        // Allow all standard HTTP methods + OPTIONS for preflight
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // Allow all headers (Authorization, Content-Type, etc.)
        config.setAllowedHeaders(List.of("*"));

        // Allow cookies / Authorization header to be sent
        config.setAllowCredentials(true);

        // Cache preflight result for 1 hour
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
