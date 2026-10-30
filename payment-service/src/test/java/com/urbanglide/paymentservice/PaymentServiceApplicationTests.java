package com.urbanglide.paymentservice;

import com.urbanglide.paymentservice.model.Payment;
import com.urbanglide.paymentservice.repository.PaymentRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PaymentServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PaymentRepository paymentRepository;

    @BeforeEach
    void setUp() {
        paymentRepository.deleteAll();
    }

    @Test
    @Order(1)
    void testGetStatus() throws Exception {
        mockMvc.perform(get("/api/payments/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("Payment Service is Running!"));
    }

    @Test
    @Order(2)
    void testProcessPayment_Success() throws Exception {
        mockMvc.perform(post("/api/payments/process")
                        .param("rideId", "RIDE-001")
                        .param("amount", "150.50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rideId").value("RIDE-001"))
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.amount").value(150.50));

        Payment saved = paymentRepository.findByRideId("RIDE-001").orElseThrow();
        assertEquals("PAID", saved.getStatus());
        assertEquals(new BigDecimal("150.50"), saved.getAmount());
    }

    @Test
    @Order(3)
    void testProcessPayment_Idempotent() throws Exception {
        // First payment
        mockMvc.perform(post("/api/payments/process")
                        .param("rideId", "RIDE-002")
                        .param("amount", "200.00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"));

        // Duplicate payment — should return existing record without double-charging
        mockMvc.perform(post("/api/payments/process")
                        .param("rideId", "RIDE-002")
                        .param("amount", "200.00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.message").value("Payment already processed"));

        // Only one payment record should exist
        assertEquals(1, paymentRepository.count());
    }

    @Test
    @Order(4)
    void testProcessPayment_PersistsCorrectly() throws Exception {
        mockMvc.perform(post("/api/payments/process")
                        .param("rideId", "RIDE-003")
                        .param("amount", "99.99"))
                .andExpect(status().isOk());

        Payment payment = paymentRepository.findByRideId("RIDE-003").orElseThrow();
        assertEquals("RIDE-003", payment.getRideId());
        assertEquals("PAID", payment.getStatus());
        assertNotNull(payment.getId());
    }
}
