package com.urbanglide.authservice.controller;

import com.urbanglide.authservice.model.User;
import com.urbanglide.authservice.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @org.springframework.beans.factory.annotation.Value("${jwt.secret:urbanglide_secret_key_which_should_be_long_enough_for_hs256_algorithm!}")
    private String secretKey;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@RequestParam("username") String username,
            @RequestParam("password") String password,
            @RequestParam(value = "role", defaultValue = "RIDER") String role) {
        Map<String, String> response = new HashMap<>();

        if (userRepository.findByUsername(username).isPresent()) {
            response.put("error", "Username already exists");
            return ResponseEntity.badRequest().body(response);
        }

        User user = new User(username, password, role);
        userRepository.save(user);

        response.put("message", "User registered successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestParam("username") String username,
            @RequestParam("password") String password) {
        Map<String, String> response = new HashMap<>();

        Optional<User> optionalUser = userRepository.findByUsername(username);

        if (optionalUser.isPresent() && optionalUser.get().getPassword().equals(password)) {
            User user = optionalUser.get();
            String token = Jwts.builder()
                    .setSubject(username)
                    .claim("role", user.getRole())
                    .claim("userId", user.getId())
                    .setIssuedAt(new Date(System.currentTimeMillis()))
                    .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 10))
                    .signWith(
                            io.jsonwebtoken.security.Keys
                                    .hmacShaKeyFor(secretKey.getBytes(java.nio.charset.StandardCharsets.UTF_8)),
                            SignatureAlgorithm.HS256)
                    .compact();

            response.put("token", token);
            response.put("role", user.getRole());
            return ResponseEntity.ok(response);
        } else {
            response.put("error", "Invalid credentials");
            return ResponseEntity.status(401).body(response);
        }
    }
}
