package com.insurflow.assurance.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * RequestLoggingFilter — logs all incoming HTTP requests, response status codes,
 * and request durations to the backend console.
 *
 * Replaces the console logging of Express (e.g., Morgan logging middleware).
 */
@Component
@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // Skip static resources / uploads logging to keep the console clean
        String uri = request.getRequestURI();
        if (uri.startsWith("/api/uploads") || uri.contains(".")) {
            filterChain.doFilter(request, response);
            return;
        }

        long startTime = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            log.info("→ {} {} - {} ({}ms)",
                    request.getMethod(),
                    uri,
                    response.getStatus(),
                    duration
            );
        }
    }
}
