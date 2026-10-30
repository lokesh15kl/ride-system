package com.urbanglide.apigateway;

import com.urbanglide.apigateway.filter.JwtAuthenticationFilter;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;

class JwtAuthenticationFilterTest {

    private JwtAuthenticationFilter filter;
    private final String secret = "urbanglide_secret_key_which_should_be_long_enough_for_hs256_algorithm!";

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter();
        ReflectionTestUtils.setField(filter, "secret", secret);
    }

    private String generateToken(String subject, String role) {
        return Jwts.builder()
                .setSubject(subject)
                .claim("role", role)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256)
                .compact();
    }

    @Test
    void testOpenEndpoint_BypassesAuth() {
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/auth/login")
                .header("X-User-Id", "spoofed")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicBoolean chainCalled = new AtomicBoolean(false);
        GatewayFilterChain chain = ex -> {
            chainCalled.set(true);
            // Verify client-supplied headers are stripped
            assertNull(ex.getRequest().getHeaders().getFirst("X-User-Id"));
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();
        assertTrue(chainCalled.get());
    }

    @Test
    void testMissingToken_Returns401() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/rides/all").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        filter.filter(exchange, ex -> Mono.empty()).block();
        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
    }

    @Test
    void testInvalidToken_Returns401() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/rides/all")
                .header("Authorization", "Bearer invalid-token-data")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        filter.filter(exchange, ex -> Mono.empty()).block();
        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
    }

    @Test
    void testAdminEndpoint_NonAdminRole_Returns403() {
        String token = generateToken("rider1", "RIDER");
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/drivers/approve")
                .header("Authorization", "Bearer " + token)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        filter.filter(exchange, ex -> Mono.empty()).block();
        assertEquals(HttpStatus.FORBIDDEN, exchange.getResponse().getStatusCode());
    }

    @Test
    void testAdminEndpoint_AdminRole_ProceedsAndInjectsHeaders() {
        String token = generateToken("adminUser", "ADMIN");
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/drivers/approve")
                .header("Authorization", "Bearer " + token)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicBoolean chainCalled = new AtomicBoolean(false);
        GatewayFilterChain chain = ex -> {
            chainCalled.set(true);
            assertEquals("adminUser", ex.getRequest().getHeaders().getFirst("X-User-Id"));
            assertEquals("ADMIN", ex.getRequest().getHeaders().getFirst("X-User-Role"));
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();
        assertTrue(chainCalled.get());
    }

    @Test
    void testDriverEndpoint_RiderRole_Returns403() {
        String token = generateToken("rider1", "RIDER");
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/rides/accept")
                .header("Authorization", "Bearer " + token)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        filter.filter(exchange, ex -> Mono.empty()).block();
        assertEquals(HttpStatus.FORBIDDEN, exchange.getResponse().getStatusCode());
    }

    @Test
    void testDriverEndpoint_DriverRole_Proceeds() {
        String token = generateToken("driver1", "DRIVER");
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/rides/accept")
                .header("Authorization", "Bearer " + token)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicBoolean chainCalled = new AtomicBoolean(false);
        GatewayFilterChain chain = ex -> {
            chainCalled.set(true);
            assertEquals("driver1", ex.getRequest().getHeaders().getFirst("X-User-Id"));
            assertEquals("DRIVER", ex.getRequest().getHeaders().getFirst("X-User-Role"));
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();
        assertTrue(chainCalled.get());
    }

    @Test
    void testActuatorHealth_IsPublic() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/actuator/health").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicBoolean chainCalled = new AtomicBoolean(false);
        filter.filter(exchange, ex -> {
            chainCalled.set(true);
            return Mono.empty();
        }).block();

        assertTrue(chainCalled.get());
    }

    @Test
    void testActuatorHealthSubPath_IsPublic() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/actuator/health/readiness").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicBoolean chainCalled = new AtomicBoolean(false);
        filter.filter(exchange, ex -> {
            chainCalled.set(true);
            return Mono.empty();
        }).block();

        assertTrue(chainCalled.get());
    }

    @Test
    void testSensitiveActuator_RequiresAuth() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/actuator/env").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        filter.filter(exchange, ex -> Mono.empty()).block();
        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
    }

    @Test
    void testSensitiveActuatorRoot_RequiresAuth() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/actuator").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        filter.filter(exchange, ex -> Mono.empty()).block();
        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
    }

    @Test
    void testSensitiveEureka_RequiresAuth() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/eureka/apps").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        filter.filter(exchange, ex -> Mono.empty()).block();
        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
    }

    @Test
    void testOpenApiDocSubPath_IsPublic() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/v3/api-docs/auth").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicBoolean chainCalled = new AtomicBoolean(false);
        filter.filter(exchange, ex -> {
            chainCalled.set(true);
            return Mono.empty();
        }).block();

        assertTrue(chainCalled.get());
    }

    @Test
    void testOpenApiDocSpoofedPrefix_RequiresAuth() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/v3/api-docs-spoofed").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        filter.filter(exchange, ex -> Mono.empty()).block();
        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
    }

    @Test
    void testClientSuppliedRoleHeader_CannotElevatePrivileges() {
        // Rider sends token with role=RIDER but attempts privilege escalation via header X-User-Role: ADMIN
        String token = generateToken("rider1", "RIDER");
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/drivers/approve")
                .header("Authorization", "Bearer " + token)
                .header("X-User-Role", "ADMIN")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        filter.filter(exchange, ex -> Mono.empty()).block();
        // Must return 403 FORBIDDEN because the JWT role is RIDER, ignoring header
        assertEquals(HttpStatus.FORBIDDEN, exchange.getResponse().getStatusCode());
    }
}
