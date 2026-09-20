package com.urbanglide.paymentservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;

@SpringBootApplication
@EnableDiscoveryClient
@RestController
@RequestMapping("/api/payments")
public class PaymentServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PaymentServiceApplication.class, args);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, String>> getStatus() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "Payment Service is Running!");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/process")
    public ResponseEntity<Map<String, Object>> processPayment(@RequestParam("rideId") String rideId,
            @RequestParam("amount") java.math.BigDecimal amount) {
        Map<String, Object> response = new HashMap<>();
        response.put("rideId", rideId);
        response.put("amount", amount);
        response.put("status", "COMPLETED");
        response.put("message", "Processed payment of $" + amount + " for ride " + rideId);
        return ResponseEntity.ok(response);
    }
}
