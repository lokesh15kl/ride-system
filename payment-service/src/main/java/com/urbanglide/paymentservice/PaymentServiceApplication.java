package com.urbanglide.paymentservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;

import com.urbanglide.paymentservice.model.Payment;
import com.urbanglide.paymentservice.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Optional;

@SpringBootApplication
@EnableDiscoveryClient
@RestController
@RequestMapping("/api/payments")
public class PaymentServiceApplication {

    @Autowired
    private PaymentRepository paymentRepository;

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
        
        Optional<Payment> existingOpt = paymentRepository.findByRideId(rideId);
        if (existingOpt.isPresent()) {
            Payment existing = existingOpt.get();
            if ("PAID".equals(existing.getStatus())) {
                Map<String, Object> response = new HashMap<>();
                response.put("rideId", rideId);
                response.put("amount", existing.getAmount());
                response.put("status", "PAID");
                response.put("message", "Payment already processed");
                return ResponseEntity.ok(response);
            }
        }

        Payment payment = existingOpt.orElse(new Payment());
        payment.setRideId(rideId);
        payment.setAmount(amount);
        payment.setStatus("PAID");
        paymentRepository.save(payment);

        Map<String, Object> response = new HashMap<>();
        response.put("rideId", rideId);
        response.put("amount", amount);
        response.put("status", "PAID");
        response.put("message", "Processed payment of $" + amount + " for ride " + rideId);
        return ResponseEntity.ok(response);
    }
}
