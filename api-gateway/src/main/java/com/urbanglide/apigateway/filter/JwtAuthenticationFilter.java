package com.urbanglide.apigateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
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

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.function.Predicate;

@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    @Value("${jwt.secret:urbanglide_secret_key_which_should_be_long_enough_for_hs256_algorithm!}")
    private String secret;

    private static final List<String> OPEN_API_ENDPOINTS = List.of(
            "/api/auth/register",
            "/api/auth/login",
            "/eureka",
            "/v3/api-docs",
            "/swagger-ui",
            "/actuator");

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        Predicate<ServerHttpRequest> isApiSecured = r -> OPEN_API_ENDPOINTS.stream()
                .noneMatch(uri -> r.getURI().getPath().contains(uri));

        if (request.getMethod().name().equalsIgnoreCase("OPTIONS")) {
            return chain.filter(exchange);
        }

        if (isApiSecured.test(request)) {
            if (!request.getHeaders().containsKey("Authorization")) {
                return onError(exchange, "Missing or invalid JWT token", HttpStatus.UNAUTHORIZED);
            }

            String token = request.getHeaders().getOrEmpty("Authorization").get(0);
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7); // "Bearer ".length()
            } else {
                return onError(exchange, "Missing or invalid JWT token", HttpStatus.UNAUTHORIZED);
            }

            try {
                Claims claims = Jwts.parserBuilder()
                        .setSigningKey(secret.getBytes(StandardCharsets.UTF_8))
                        .build()
                        .parseClaimsJws(token)
                        .getBody();

                String role = claims.get("role", String.class);
                String path = request.getURI().getPath();

                // Role Based Authorization Enforcement
                if (path.startsWith("/api/drivers/approve") && !"ADMIN".equalsIgnoreCase(role)) {
                    return onError(exchange, "Insufficient permissions", HttpStatus.FORBIDDEN);
                }
                if (path.startsWith("/api/rides/accept") && !"DRIVER".equalsIgnoreCase(role)
                        && !"ADMIN".equalsIgnoreCase(role)) {
                    return onError(exchange, "Insufficient permissions", HttpStatus.FORBIDDEN);
                }

                // Strip any client-supplied headers and push trusted JWT headers downstream
                ServerHttpRequest modifiedRequest = exchange.getRequest().mutate()
                        .header("X-User-Id", claims.getSubject()) // Crucial: use subject (username defaults to driverId)
                        .header("X-User-Role", role)
                        .build();

                return chain.filter(exchange.mutate().request(modifiedRequest).build());
            } catch (Exception e) {
                System.err.println("JWT Validation Error: " + e.getMessage());
                return onError(exchange, "Missing or invalid JWT token", HttpStatus.UNAUTHORIZED);
            }
        }
        return chain.filter(exchange);
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
