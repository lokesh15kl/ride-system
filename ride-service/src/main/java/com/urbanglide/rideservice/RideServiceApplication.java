package com.urbanglide.rideservice;

import com.urbanglide.rideservice.model.Ride;
import com.urbanglide.rideservice.repository.RideRepository;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.env.Environment;

@SpringBootApplication
@EnableDiscoveryClient
@EnableFeignClients
@RestController
@RequestMapping("/api/rides")
public class RideServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(RideServiceApplication.class, args);
    }

    @Autowired
    private RideRepository rideRepository;

    @Autowired
    private PaymentClient paymentClient;

    @Autowired
    private DriverClient driverClient;

    @Autowired
    private Environment env;

    @GetMapping("/instance")
    public ResponseEntity<?> getInstanceInfo() {
        String port = env.getProperty("local.server.port");
        if (port == null) port = env.getProperty("server.port");
        return ResponseEntity.ok(Map.of("service", "RIDE-SERVICE", "port", port != null ? port : "unknown"));
    }

    @PostMapping("/book")
    public ResponseEntity<?> bookRide(@RequestParam("userId") String userId,
            @RequestParam("source") String source,
            @RequestParam("destination") String destination,
            @RequestParam(value = "sourceLatitude", required = false) Double sourceLatitude,
            @RequestParam(value = "sourceLongitude", required = false) Double sourceLongitude,
            @RequestParam(value = "destinationLatitude", required = false) Double destinationLatitude,
            @RequestParam(value = "destinationLongitude", required = false) Double destinationLongitude,
            @RequestParam(value = "vehicleType", defaultValue = "CAR") String vehicleType) {
        Ride ride = new Ride();
        ride.setRideId("RIDE-" + System.currentTimeMillis());
        ride.setUserId(userId);
        ride.setSource(source);
        ride.setDestination(destination);
        ride.setSourceLatitude(sourceLatitude);
        ride.setSourceLongitude(sourceLongitude);
        ride.setDestinationLatitude(destinationLatitude);
        ride.setDestinationLongitude(destinationLongitude);
        ride.setVehicleType(vehicleType);
        ride.setStatus("REQUESTED");

        // Random amount logic based on vehicleType
        double baseFare = 10;
        double typeMultiplier = 1.0;
        if ("PREMIUM_CAR".equalsIgnoreCase(vehicleType))
            typeMultiplier = 2.0;
        else if ("BIKE".equalsIgnoreCase(vehicleType))
            typeMultiplier = 0.5;
        else if ("E_RIKSHAW".equalsIgnoreCase(vehicleType))
            typeMultiplier = 0.4;
        else if ("AUTO".equalsIgnoreCase(vehicleType))
            typeMultiplier = 0.7;

        // Dynamic Surge Pricing Engine
        int activeRequests = rideRepository.findByStatus("REQUESTED").size();
        int activeDrivers = 1; // Default to 1 to avoid division by zero
        try {
            List<Map<String, Object>> nearby = driverClient.getNearbyDrivers(
                sourceLatitude != null ? sourceLatitude : 16.5, 
                sourceLongitude != null ? sourceLongitude : 80.6, 
                15.0, vehicleType);
            if (nearby != null && !nearby.isEmpty()) {
                activeDrivers = nearby.size();
            }
        } catch (Exception e) {}

        double surgeMultiplier = 1.0;
        double ratio = (double) activeRequests / activeDrivers;
        if (ratio > 1.5) surgeMultiplier = 1.5;
        if (ratio > 3.0) surgeMultiplier = 2.0;
        if (activeDrivers == 1 && activeRequests > 5) surgeMultiplier = 2.5;

        BigDecimal finalFare = BigDecimal.valueOf(Math.round((baseFare + Math.random() * 40) * typeMultiplier * surgeMultiplier * 100.0) / 100.0)
                .setScale(2, java.math.RoundingMode.HALF_UP);
        ride.setAmount(finalFare);

        rideRepository.save(ride);
        return ResponseEntity.ok(Map.of("ride", ride, "surgeApplied", surgeMultiplier > 1.0, "surgeMultiplier", surgeMultiplier));
    }

    @GetMapping("/all")
    public ResponseEntity<List<Ride>> getAllRides() {
        return ResponseEntity.ok(rideRepository.findAll());
    }

    @GetMapping("/requested")
    public ResponseEntity<List<Ride>> getRequestedRides() {
        return ResponseEntity.ok(rideRepository.findByStatus("REQUESTED"));
    }

    @GetMapping("/user")
    public ResponseEntity<List<Ride>> getUserRides(@RequestParam("userId") String userId) {
        return ResponseEntity.ok(rideRepository.findByUserId(userId));
    }

    @GetMapping("/driver")
    public ResponseEntity<List<Ride>> getDriverRides(@RequestParam("driverId") String driverId) {
        return ResponseEntity.ok(rideRepository.findByDriverId(driverId));
    }

    @PostMapping("/accept")
    public ResponseEntity<?> acceptRide(@RequestParam("rideId") String rideId,
            @RequestParam("driverId") String driverId) {
        Optional<Ride> optionalRide = rideRepository.findByRideId(rideId);
        if (optionalRide.isPresent()) {
            Ride ride = optionalRide.get();
            if (!"REQUESTED".equals(ride.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ride is not in REQUESTED state"));
            }

            // Mark driver as Busy
            driverClient.updateDriverStatus(driverId, "ON_RIDE");

            ride.setStatus("ACCEPTED");
            ride.setDriverId(driverId);
            rideRepository.save(ride);
            return ResponseEntity.ok(ride);
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Ride not found"));
    }

    @PostMapping("/approach")
    public ResponseEntity<?> approachRide(@RequestParam("rideId") String rideId) {
        Optional<Ride> optionalRide = rideRepository.findByRideId(rideId);
        if (optionalRide.isPresent()) {
            Ride ride = optionalRide.get();
            if (!"ACCEPTED".equals(ride.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ride is not in ACCEPTED state"));
            }
            ride.setStatus("DRIVER_APPROACHING");
            rideRepository.save(ride);
            return ResponseEntity.ok(ride);
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Ride not found"));
    }

    @PostMapping("/arrive")
    public ResponseEntity<?> arriveRide(@RequestParam("rideId") String rideId) {
        Optional<Ride> optionalRide = rideRepository.findByRideId(rideId);
        if (optionalRide.isPresent()) {
            Ride ride = optionalRide.get();
            if (!"DRIVER_APPROACHING".equals(ride.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ride is not in DRIVER_APPROACHING state"));
            }
            ride.setStatus("DRIVER_ARRIVED");
            rideRepository.save(ride);
            return ResponseEntity.ok(ride);
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Ride not found"));
    }

    @PostMapping("/start")
    public ResponseEntity<?> startRide(@RequestParam("rideId") String rideId) {
        Optional<Ride> optionalRide = rideRepository.findByRideId(rideId);
        if (optionalRide.isPresent()) {
            Ride ride = optionalRide.get();
            if (!"DRIVER_ARRIVED".equals(ride.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ride is not in DRIVER_ARRIVED state"));
            }
            ride.setStatus("IN_PROGRESS");
            rideRepository.save(ride);
            return ResponseEntity.ok(ride);
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Ride not found"));
    }

    @PostMapping("/complete")
    public ResponseEntity<?> completeRide(@RequestParam("rideId") String rideId) {
        Optional<Ride> optionalRide = rideRepository.findByRideId(rideId);
        if (optionalRide.isPresent()) {
            Ride ride = optionalRide.get();
            if (!"IN_PROGRESS".equals(ride.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ride is not in IN_PROGRESS state"));
            }

            // Auto process payment
            Map<String, Object> paymentStatus = paymentClient.processPayment(rideId, ride.getAmount());
            ride.setStatus("COMPLETED");
            rideRepository.save(ride);

            // Free the driver
            driverClient.updateDriverStatus(ride.getDriverId(), "AVAILABLE");

            return ResponseEntity.ok(Map.of("message", "Ride completed and payment processed automatically.", "ride", ride, "payment", paymentStatus));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Ride not found"));
    }

    @PostMapping("/pay")
    public ResponseEntity<?> payForRide(@RequestParam("rideId") String rideId) {
        Optional<Ride> optionalRide = rideRepository.findByRideId(rideId);
        if (optionalRide.isPresent()) {
            Ride ride = optionalRide.get();
            if (!"PENDING_PAYMENT".equals(ride.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ride is not in PENDING_PAYMENT state"));
            }

            Map<String, Object> paymentStatus = paymentClient.processPayment(rideId, ride.getAmount());
            ride.setStatus("COMPLETED_PAID");
            rideRepository.save(ride);

            Map<String, Object> response = new HashMap<>();
            response.put("ride", ride);
            response.put("paymentDetails", paymentStatus);
            response.put("message", "Payment processed successfully.");

            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Ride not found"));
    }

    @GetMapping("/nearby-drivers")
    public ResponseEntity<?> findNearbyDrivers(@RequestParam("latitude") Double latitude,
            @RequestParam("longitude") Double longitude,
            @RequestParam(value = "radius", defaultValue = "5.0") Double radius,
            @RequestParam(value = "vehicleType", required = false) String vehicleType) {
        List<Map<String, Object>> nearbyDrivers = driverClient.getNearbyDrivers(latitude, longitude, radius,
                vehicleType);
        return ResponseEntity.ok(nearbyDrivers);
    }

    @GetMapping("/track/{rideId}")
    public ResponseEntity<?> shareableTrackLive(@PathVariable("rideId") String rideId) {
        Optional<Ride> optionalRide = rideRepository.findByRideId(rideId);
        if (optionalRide.isPresent()) {
            Ride ride = optionalRide.get();
            Map<String, Object> trackingData = new HashMap<>();
            trackingData.put("ride", ride);

            // If driver assigned, fetch their live location for tracking
            if (ride.getDriverId() != null && !ride.getDriverId().isEmpty()) {
                try {
                    Map<String, Object> driverData = driverClient.getDriverStatus(ride.getDriverId());
                    trackingData.put("driverLocation", driverData);
                } catch (Exception e) {
                    trackingData.put("driverLocation", "Unavailable");
                }
            }
            return ResponseEntity.ok(trackingData);
        }
        return ResponseEntity.notFound().build();
    }
}

@FeignClient(name = "payment-service")
interface PaymentClient {
    @PostMapping("/api/payments/process")
    Map<String, Object> processPayment(@RequestParam("rideId") String rideId, @RequestParam("amount") java.math.BigDecimal amount);
}

@FeignClient(name = "driver-service")
interface DriverClient {
    @PostMapping("/api/drivers/status")
    void updateDriverStatus(@RequestParam("driverId") String driverId, @RequestParam("status") String status);

    @GetMapping("/api/drivers/status")
    Map<String, Object> getDriverStatus(@RequestParam("driverId") String driverId);

    @GetMapping("/api/drivers/nearby")
    List<Map<String, Object>> getNearbyDrivers(@RequestParam("latitude") Double latitude,
            @RequestParam("longitude") Double longitude,
            @RequestParam(value = "radius", required = false) Double radius,
            @RequestParam(value = "vehicleType", required = false) String vehicleType);
}
