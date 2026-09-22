package com.urbanglide.driverservice;

import com.urbanglide.driverservice.model.Driver;
import com.urbanglide.driverservice.repository.DriverRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@SpringBootApplication
@EnableDiscoveryClient
@RestController
@RequestMapping("/api/drivers")
public class DriverServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(DriverServiceApplication.class, args);
    }

    @Autowired
    private DriverRepository driverRepository;

    @PostMapping("/register")
    public ResponseEntity<?> registerDriver(@RequestParam("driverId") String driverId,
            @RequestParam("name") String name,
            @RequestParam(value = "vehicleType", defaultValue = "CAR") String vehicleType) {
        if (driverRepository.findByDriverId(driverId).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Driver already exists"));
        }
        Driver driver = new Driver(driverId, name, "AVAILABLE");
        driver.setVehicleType(vehicleType);
        driver.setVerificationStatus("PENDING"); // Dynamic KYC flow addition
        driverRepository.save(driver);
        return ResponseEntity.ok(driver);
    }

    @PostMapping("/approve")
    public ResponseEntity<?> approveDriver(@RequestParam("driverId") String driverId, @RequestParam(value = "vehicleNumber", required = false) String vehicleNumber) {
        if (vehicleNumber == null || vehicleNumber.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vehicle number is required"));
        }
        Optional<Driver> opt = driverRepository.findByDriverId(driverId);
        if (opt.isPresent()) {
            Driver driver = opt.get();
            if (!"PENDING".equalsIgnoreCase(driver.getVerificationStatus())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Driver verification status is not PENDING"));
            }
            
            driver.setVerificationStatus("APPROVED");
            driver.setVehicleNumber(vehicleNumber.trim().toUpperCase());
            driverRepository.save(driver);
            
            return ResponseEntity.ok(Map.of(
                "message", "Driver KYC approved successfully",
                "driverId", driver.getDriverId(),
                "vehicleNumber", driver.getVehicleNumber(),
                "verificationStatus", "APPROVED"
            ));
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/reject")
    public ResponseEntity<?> rejectDriver(@RequestParam("driverId") String driverId) {
        Optional<Driver> opt = driverRepository.findByDriverId(driverId);
        if (opt.isPresent()) {
            Driver driver = opt.get();
            driver.setVerificationStatus("REJECTED");
            driverRepository.save(driver);
            return ResponseEntity.ok(driver);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus(@RequestParam("driverId") String driverId) {
        Optional<Driver> driver = driverRepository.findByDriverId(driverId);
        if (driver.isPresent()) {
            return ResponseEntity.ok(driver.get());
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllDrivers() {
        return ResponseEntity.ok(driverRepository.findAll());
    }

    @PostMapping("/status")
    public ResponseEntity<?> updateStatus(@RequestParam("driverId") String driverId,
            @RequestParam("status") String status) {
        Optional<Driver> optionalDriver = driverRepository.findByDriverId(driverId);
        if (optionalDriver.isPresent()) {
            Driver driver = optionalDriver.get();
            driver.setStatus(status);
            driverRepository.save(driver);
            return ResponseEntity.ok(driver);
        } else {
            // Lazy initialization just in case
            Driver driver = new Driver(driverId, driverId, status);
            driverRepository.save(driver);
            return ResponseEntity.ok(driver);
        }
    }

    @PostMapping("/location")
    public ResponseEntity<?> updateLocation(@RequestParam("driverId") String driverId,
            @RequestParam("latitude") Double latitude,
            @RequestParam("longitude") Double longitude) {
        Optional<Driver> optionalDriver = driverRepository.findByDriverId(driverId);
        if (optionalDriver.isPresent()) {
            Driver driver = optionalDriver.get();
            driver.setLatitude(latitude);
            driver.setLongitude(longitude);
            driverRepository.save(driver);
            return ResponseEntity.ok(driver);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/nearby")
    public ResponseEntity<?> getNearbyDrivers(@RequestParam("latitude") Double latitude,
            @RequestParam("longitude") Double longitude,
            @RequestParam(value = "radius", defaultValue = "5.0") Double radius,
            @RequestParam(value = "vehicleType", required = false) String vehicleType) {
        java.util.List<Driver> drivers;
        if (vehicleType != null && !vehicleType.isEmpty()) {
            drivers = driverRepository.findNearbyAvailableDriversByVehicleType(latitude, longitude, radius,
                    vehicleType);
        } else {
            drivers = driverRepository.findNearbyAvailableDrivers(latitude, longitude, radius);
        }

        // Ensure only APPROVED drivers are dispatched
        drivers = drivers.stream()
                .filter(d -> "APPROVED".equals(d.getVerificationStatus()))
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(drivers);
    }
}
