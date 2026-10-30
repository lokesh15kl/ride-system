package com.urbanglide.authservice;

import com.urbanglide.authservice.model.User;
import com.urbanglide.authservice.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    private static final String TEST_SECRET = "test_secret_key_which_should_be_long_enough_for_hs256_algorithm_testing!";

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    // ======= REGISTRATION TESTS =======

    @Test
    @Order(1)
    void testRegisterRider_Success() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .param("username", "testuser")
                .param("password", "pass123")
                .param("role", "RIDER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User registered successfully"));

        assertTrue(userRepository.findByUsername("testuser").isPresent());
    }

    @Test
    @Order(2)
    void testRegisterDriver_Success() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .param("username", "driver1")
                .param("password", "pass123")
                .param("role", "DRIVER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User registered successfully"));

        User saved = userRepository.findByUsername("driver1").orElseThrow();
        assertEquals("DRIVER", saved.getRole());
        // Password should be BCrypt-hashed (starts with $2a$)
        assertTrue(saved.getPassword().startsWith("$2a$"));
    }

    @Test
    @Order(3)
    void testRegisterDuplicate_Returns409() throws Exception {
        userRepository.save(new User("existing", "hashed", "RIDER"));

        mockMvc.perform(post("/api/auth/register")
                .param("username", "existing")
                .param("password", "pass123")
                .param("role", "RIDER"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Username already exists"));
    }

    @Test
    @Order(4)
    void testRegisterAdmin_Rejected() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .param("username", "hacker")
                .param("password", "pass123")
                .param("role", "ADMIN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid role. Allowed roles: RIDER, DRIVER"));
    }

    @Test
    @Order(5)
    void testRegisterMissingUsername_Returns400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .param("username", "")
                .param("password", "pass123"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Username is required"));
    }

    // ======= LOGIN TESTS =======

    @Test
    @Order(10)
    void testLogin_Success_ReturnsJWT() throws Exception {
        // Register first
        mockMvc.perform(post("/api/auth/register")
                .param("username", "loginuser")
                .param("password", "secret")
                .param("role", "RIDER"));

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .param("username", "loginuser")
                .param("password", "secret"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.role").value("RIDER"))
                .andExpect(jsonPath("$.username").value("loginuser"))
                .andReturn();

        // Verify token structure
        String responseBody = result.getResponse().getContentAsString();
        assertTrue(responseBody.contains("token"));
        assertFalse(responseBody.contains("password"));
    }

    @Test
    @Order(11)
    void testLogin_InvalidPassword_Returns401() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .param("username", "user2")
                .param("password", "correct")
                .param("role", "RIDER"));

        mockMvc.perform(post("/api/auth/login")
                .param("username", "user2")
                .param("password", "wrong"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid credentials"));
    }

    @Test
    @Order(12)
    void testLogin_NonexistentUser_Returns401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .param("username", "ghost")
                .param("password", "pass"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid credentials"));
    }

    @Test
    @Order(13)
    void testLogin_JWT_ContainsCorrectClaims() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .param("username", "claimuser")
                .param("password", "pass123")
                .param("role", "DRIVER"));

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .param("username", "claimuser")
                .param("password", "pass123"))
                .andExpect(status().isOk())
                .andReturn();

        String token = com.fasterxml.jackson.databind.ObjectMapper.class
                .getDeclaredConstructor().newInstance()
                .readTree(result.getResponse().getContentAsString())
                .get("token").asText();

        Claims claims = Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8)))
                .build()
                .parseClaimsJws(token)
                .getBody();

        assertEquals("claimuser", claims.getSubject());
        assertEquals("DRIVER", claims.get("role", String.class));
        assertNotNull(claims.getIssuedAt());
        assertNotNull(claims.getExpiration());
        assertTrue(claims.getExpiration().after(claims.getIssuedAt()));
    }

    // ======= PASSWORD SECURITY TESTS =======

    @Test
    @Order(20)
    void testPasswordsAreBCryptHashed() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .param("username", "hashtest")
                .param("password", "mypassword")
                .param("role", "RIDER"));

        User user = userRepository.findByUsername("hashtest").orElseThrow();
        assertNotEquals("mypassword", user.getPassword());
        assertTrue(user.getPassword().startsWith("$2a$"));
    }

    @Test
    @Order(21)
    void testLegacyPlaintextPasswordMigration() throws Exception {
        // Simulate legacy plaintext record
        userRepository.save(new User("legacy", "plaintext123", "RIDER"));

        // Login should succeed with plaintext
        mockMvc.perform(post("/api/auth/login")
                .param("username", "legacy")
                .param("password", "plaintext123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());

        // Password should now be BCrypt-hashed
        User migrated = userRepository.findByUsername("legacy").orElseThrow();
        assertTrue(migrated.getPassword().startsWith("$2a$"));

        // Login should still work with same password
        mockMvc.perform(post("/api/auth/login")
                .param("username", "legacy")
                .param("password", "plaintext123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }

    // ======= API RESPONSE SECURITY TESTS =======

    @Test
    @Order(30)
    void testGetUsers_DoesNotExposePasswords() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .param("username", "safeuser")
                .param("password", "secret")
                .param("role", "RIDER"));

        MvcResult result = mockMvc.perform(get("/api/auth/users"))
                .andExpect(status().isOk())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertFalse(body.contains("$2a$"), "BCrypt hash should not appear in API response");
        assertFalse(body.contains("\"password\""), "Password field should not appear in API response");
        assertTrue(body.contains("safeuser"));
    }
}
