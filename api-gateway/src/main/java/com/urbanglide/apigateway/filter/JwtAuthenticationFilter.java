package com.urbanglide.apigateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Value("${jwt.secret:urbanglide_secret_key_which_should_be_long_enough_for_hs256_algorithm!}")
    private String secret;

    /**
     * Determines whether a given request path is publicly accessible without JWT authentication.
     * Uses strict exact matches and segment-aware path prefixes (e.g. "/v3/api-docs/" rather than
     * loose substring matches) to prevent unintended access to sensitive or similarly named routes.
     */
    public boolean isPublicEndpoint(String path) {
        if (path == null) {
            return false;
        }

        // 1. Exact matches for public authentication and UI entrypoints
        if (path.equals("/api/auth/register")
                || path.equals("/api/auth/login")
                || path.equals("/api/drivers/register")
                || path.equals("/swagger-ui.html")
                || path.equals("/swagger-ui")
                || path.equals("/favicon.ico")) {
            return true;
        }

        // 2. Segment-aware matching for OpenAPI specs (supports root and all aggregated sub-paths)
        if (path.equals("/v3/api-docs") || path.startsWith("/v3/api-docs/")) {
            return true;
        }

        // 3. Segment-aware matching for Swagger UI resources and Webjars assets
        if (path.startsWith("/swagger-ui/")) {
            return true;
        }
        if (path.equals("/webjars") || path.startsWith("/webjars/")) {
            return true;
        }

        // 4. Actuator health: allow ONLY the health endpoint (and health sub-checks like /liveness, /readiness)
        // All sensitive endpoints (/actuator/env, /actuator/beans, /actuator, etc.) require authentication.
        if (path.equals("/actuator/health") || path.startsWith("/actuator/health/")) {
            return true;
        }

        // Note: Sensitive Eureka endpoints (/eureka/**) and other Actuator endpoints are strictly protected.
        return false;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        // Always allow OPTIONS (CORS preflight)
        if ("OPTIONS".equalsIgnoreCase(request.getMethod().name())) {
            return chain.filter(exchange);
        }

        // Check if path is public using hardened, segment-aware matching
        if (isPublicEndpoint(path)) {
            // Public endpoint — strip any client-supplied identity headers to prevent spoofing
            ServerHttpRequest sanitized = exchange.getRequest().mutate()
                    .headers(h -> {
                        h.remove("X-User-Id");
                        h.remove("X-User-Role");
                    })
                    .build();
            return chain.filter(exchange.mutate().request(sanitized).build());
        }

        // --- Protected endpoint ---
        if (!request.getHeaders().containsKey("Authorization")) {
            return onError(exchange, "Missing or invalid JWT token", HttpStatus.UNAUTHORIZED);
        }

        String token = request.getHeaders().getOrEmpty("Authorization").get(0);
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        } else {
            return onError(exchange, "Missing or invalid JWT token", HttpStatus.UNAUTHORIZED);
        }

        try {
            SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));

            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            String role = claims.get("role", String.class);
            String subject = claims.getSubject();

            if (subject == null || subject.isBlank()) {
                return onError(exchange, "Invalid JWT: missing subject", HttpStatus.UNAUTHORIZED);
            }

            // Role-Based Authorization Enforcement
            if (path.startsWith("/api/drivers/approve") && !"ADMIN".equalsIgnoreCase(role)) {
                return onError(exchange, "Insufficient permissions", HttpStatus.FORBIDDEN);
            }
            if (path.startsWith("/api/drivers/reject") && !"ADMIN".equalsIgnoreCase(role)) {
                return onError(exchange, "Insufficient permissions", HttpStatus.FORBIDDEN);
            }
            if (path.startsWith("/api/rides/accept") && !"DRIVER".equalsIgnoreCase(role)
                    && !"ADMIN".equalsIgnoreCase(role)) {
                return onError(exchange, "Insufficient permissions", HttpStatus.FORBIDDEN);
            }
            if (path.startsWith("/api/auth/users") && !"ADMIN".equalsIgnoreCase(role)) {
                return onError(exchange, "Insufficient permissions", HttpStatus.FORBIDDEN);
            }

            // Strip any client-supplied identity headers and push trusted JWT-derived headers downstream
            ServerHttpRequest modifiedRequest = exchange.getRequest().mutate()
                    .headers(h -> {
                        h.remove("X-User-Id");
                        h.remove("X-User-Role");
                    })
                    .header("X-User-Id", subject)
                    .header("X-User-Role", role)
                    .build();

            return chain.filter(exchange.mutate().request(modifiedRequest).build());

        } catch (ExpiredJwtException e) {
            log.warn("JWT token expired for path: {}", path);
            return onError(exchange, "JWT token has expired", HttpStatus.UNAUTHORIZED);
        } catch (MalformedJwtException e) {
            log.warn("Malformed JWT token for path: {}", path);
            return onError(exchange, "Malformed JWT token", HttpStatus.UNAUTHORIZED);
        } catch (SignatureException e) {
            log.warn("Invalid JWT signature for path: {}", path);
            return onError(exchange, "Invalid JWT signature", HttpStatus.UNAUTHORIZED);
        } catch (Exception e) {
            log.warn("JWT validation error for path: {}", path);
            return onError(exchange, "Missing or invalid JWT token", HttpStatus.UNAUTHORIZED);
        }
    }

    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus httpStatus) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(httpStatus);
        response.getHeaders().add("Content-Type", "application/json");
        String body = String.format("{\"error\": \"%s\", \"message\": \"%s\"}", httpStatus.getReasonPhrase(), err);
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
