package com.urbanglide.authservice.controller;

import com.urbanglide.authservice.model.User;
import com.urbanglide.authservice.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Value("${jwt.secret:urbanglide_secret_key_which_should_be_long_enough_for_hs256_algorithm!}")
    private String secretKey;

    @Autowired
    private UserRepository userRepository;

    private static final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private static final Set<String> ALLOWED_ROLES = Set.of("RIDER", "DRIVER");

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @RequestParam("username") String username,
            @RequestParam("password") String password,
            @RequestParam(value = "role", defaultValue = "RIDER") String role) {
        Map<String, String> response = new HashMap<>();

        if (username == null || username.trim().isEmpty()) {
            response.put("error", "Username is required");
            return ResponseEntity.badRequest().body(response);
        }
        if (password == null || password.trim().isEmpty()) {
            response.put("error", "Password is required");
            return ResponseEntity.badRequest().body(response);
        }

        String normalizedRole = role.toUpperCase().trim();
        if (!ALLOWED_ROLES.contains(normalizedRole)) {
            response.put("error", "Invalid role. Allowed roles: RIDER, DRIVER");
            return ResponseEntity.badRequest().body(response);
        }

        if (userRepository.findByUsername(username.trim()).isPresent()) {
            response.put("error", "Username already exists");
            return ResponseEntity.status(409).body(response);
        }

        String hashedPassword = passwordEncoder.encode(password);
        User user = new User(username.trim(), hashedPassword, normalizedRole);
        userRepository.save(user);

        response.put("message", "User registered successfully");
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Get all users", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        List<Map<String, Object>> sanitized = userRepository.findAll().stream()
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("username", u.getUsername());
                    m.put("role", u.getRole());
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(sanitized);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(
            @RequestParam("username") String username,
            @RequestParam("password") String password) {
        Map<String, String> response = new HashMap<>();

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            response.put("error", "Username and password are required");
            return ResponseEntity.badRequest().body(response);
        }

        Optional<User> optionalUser = userRepository.findByUsername(username.trim());

        if (optionalUser.isPresent()) {
            User user = optionalUser.get();
            boolean passwordMatch;

            // Support both BCrypt-hashed and legacy plaintext passwords for migration
            if (user.getPassword().startsWith("$2a$") || user.getPassword().startsWith("$2b$")
                    || user.getPassword().startsWith("$2y$")) {
                passwordMatch = passwordEncoder.matches(password, user.getPassword());
            } else {
                // Legacy plaintext comparison — migrate password to BCrypt on successful login
                passwordMatch = user.getPassword().equals(password);
                if (passwordMatch) {
                    user.setPassword(passwordEncoder.encode(password));
                    userRepository.save(user);
                }
            }

            if (passwordMatch) {
                String token = Jwts.builder()
                        .setSubject(user.getUsername())
                        .claim("role", user.getRole())
                        .claim("userId", user.getId())
                        .setIssuedAt(new Date(System.currentTimeMillis()))
                        .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 10))
                        .signWith(
                                Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8)),
                                SignatureAlgorithm.HS256)
                        .compact();

                response.put("token", token);
                response.put("role", user.getRole());
                response.put("username", user.getUsername());
                return ResponseEntity.ok(response);
            }
        }

        response.put("error", "Invalid credentials");
        return ResponseEntity.status(401).body(response);
    }
}