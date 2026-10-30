package com.urbanglide.rideservice;

import com.urbanglide.rideservice.model.Ride;
import com.urbanglide.rideservice.repository.RideFeedbackRepository;
import com.urbanglide.rideservice.repository.RideRepository;
import org.junit.jupiter.api.*;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class RideServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RideRepository rideRepository;

    @Autowired
    private RideFeedbackRepository feedbackRepository;

    @MockBean
    private PaymentClient paymentClient;

    @MockBean
    private DriverClient driverClient;

    @BeforeEach
    void setUp() {
        feedbackRepository.deleteAll();
        rideRepository.deleteAll();

        // Default mock behaviors
        Map<String, Object> paymentResult = new HashMap<>();
        paymentResult.put("status", "PAID");
        paymentResult.put("message", "Payment processed");
        Mockito.when(paymentClient.processPayment(anyString(), any(BigDecimal.class)))
                .thenReturn(paymentResult);

        Map<String, Object> driverStatus = new HashMap<>();
        driverStatus.put("driverId", "driver1");
        driverStatus.put("status", "AVAILABLE");
        driverStatus.put("latitude", 16.5);
        driverStatus.put("longitude", 80.6);
        Mockito.when(driverClient.getDriverStatus(anyString()))
                .thenReturn(driverStatus);

        Map<String, Object> nearbyDriver = new HashMap<>();
        nearbyDriver.put("driverId", "driver1");
        nearbyDriver.put("status", "AVAILABLE");
        Mockito.when(driverClient.getNearbyDrivers(any(), any(), any(), any()))
                .thenReturn(List.of(nearbyDriver));
    }

    // ======= BOOKING TESTS =======

    @Test
    @Order(1)
    void testBookRide_Success() throws Exception {
        mockMvc.perform(post("/api/rides/book")
                        .param("userId", "rider1")
                        .param("source", "Point A")
                        .param("destination", "Point B")
                        .param("vehicleType", "CAR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ride.rideId").exists())
                .andExpect(jsonPath("$.ride.status").value("REQUESTED"))
                .andExpect(jsonPath("$.ride.userId").value("rider1"))
                .andExpect(jsonPath("$.ride.amount").isNumber());

        assertEquals(1, rideRepository.count());
    }

    @Test
    @Order(2)
    void testBookRide_WithCoordinates() throws Exception {
        mockMvc.perform(post("/api/rides/book")
                        .param("userId", "rider2")
                        .param("source", "Home")
                        .param("destination", "Office")
                        .param("sourceLatitude", "16.5")
                        .param("sourceLongitude", "80.6")
                        .param("destinationLatitude", "16.55")
                        .param("destinationLongitude", "80.65")
                        .param("vehicleType", "BIKE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ride.vehicleType").value("BIKE"))
                .andExpect(jsonPath("$.ride.sourceLatitude").value(16.5));
    }

    // ======= RIDE LIFECYCLE TESTS =======

    private Ride createRide(String status, String driverId) {
        Ride ride = new Ride();
        ride.setRideId("RIDE-TEST-" + System.nanoTime());
        ride.setUserId("rider1");
        ride.setSource("A");
        ride.setDestination("B");
        ride.setStatus(status);
        ride.setAmount(BigDecimal.valueOf(100.00));
        ride.setVehicleType("CAR");
        if (driverId != null) ride.setDriverId(driverId);
        return rideRepository.save(ride);
    }

    @Test
    @Order(10)
    void testAcceptRide_Success() throws Exception {
        Ride ride = createRide("REQUESTED", null);

        mockMvc.perform(post("/api/rides/accept")
                        .param("rideId", ride.getRideId())
                        .param("driverId", "driver1")
                        .header("X-User-Id", "driver1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.driverId").value("driver1"));
    }

    @Test
    @Order(11)
    void testAcceptRide_AlreadyAccepted_Returns409() throws Exception {
        Ride ride = createRide("ACCEPTED", "driver1");

        mockMvc.perform(post("/api/rides/accept")
                        .param("rideId", ride.getRideId())
                        .param("driverId", "driver2")
                        .header("X-User-Id", "driver2"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Ride has already been accepted by another driver."));
    }

    @Test
    @Order(12)
    void testApproachRide_Success() throws Exception {
        Ride ride = createRide("ACCEPTED", "driver1");

        mockMvc.perform(post("/api/rides/approach")
                        .param("rideId", ride.getRideId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRIVER_APPROACHING"));
    }

    @Test
    @Order(13)
    void testApproachRide_InvalidState() throws Exception {
        Ride ride = createRide("REQUESTED", null);

        mockMvc.perform(post("/api/rides/approach")
                        .param("rideId", ride.getRideId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Ride is not in ACCEPTED state"));
    }

    @Test
    @Order(14)
    void testArriveRide_Success() throws Exception {
        Ride ride = createRide("DRIVER_APPROACHING", "driver1");

        mockMvc.perform(post("/api/rides/arrive")
                        .param("rideId", ride.getRideId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRIVER_ARRIVED"));
    }

    @Test
    @Order(15)
    void testStartRide_Success() throws Exception {
        Ride ride = createRide("DRIVER_ARRIVED", "driver1");

        mockMvc.perform(post("/api/rides/start")
                        .param("rideId", ride.getRideId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    @Order(16)
    void testStartRide_InvalidState() throws Exception {
        Ride ride = createRide("ACCEPTED", "driver1");

        mockMvc.perform(post("/api/rides/start")
                        .param("rideId", ride.getRideId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Ride is not in DRIVER_ARRIVED state"));
    }

    @Test
    @Order(17)
    void testCompleteRide_FullLifecycle() throws Exception {
        Ride ride = createRide("IN_PROGRESS", "driver1");

        mockMvc.perform(post("/api/rides/complete")
                        .param("rideId", ride.getRideId())
                        .param("driverId", "driver1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ride.status").value("COMPLETED"))
                .andExpect(jsonPath("$.payment.status").value("PAID"))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @Order(18)
    void testCompleteRide_DuplicateCompletion_Returns409() throws Exception {
        Ride ride = createRide("COMPLETED", "driver1");

        mockMvc.perform(post("/api/rides/complete")
                        .param("rideId", ride.getRideId())
                        .param("driverId", "driver1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Ride already completed"));
    }

    @Test
    @Order(19)
    void testCompleteRide_WrongDriver_Returns403() throws Exception {
        Ride ride = createRide("IN_PROGRESS", "driver1");

        mockMvc.perform(post("/api/rides/complete")
                        .param("rideId", ride.getRideId())
                        .param("driverId", "driver2"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Driver does not own this ride"));
    }

    @Test
    @Order(20)
    void testCompleteRide_InvalidState_Returns400() throws Exception {
        Ride ride = createRide("ACCEPTED", "driver1");

        mockMvc.perform(post("/api/rides/complete")
                        .param("rideId", ride.getRideId())
                        .param("driverId", "driver1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Ride is not in IN_PROGRESS state"));
    }

    // ======= FULL RIDE LIFECYCLE (REQUESTED -> COMPLETED) =======

    @Test
    @Order(30)
    void testFullRideLifecycle() throws Exception {
        // 1. Book a ride
        var bookResult = mockMvc.perform(post("/api/rides/book")
                        .param("userId", "lifecycle_rider")
                        .param("source", "Start")
                        .param("destination", "End")
                        .param("vehicleType", "CAR"))
                .andExpect(status().isOk())
                .andReturn();

        String rideId = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(bookResult.getResponse().getContentAsString())
                .get("ride").get("rideId").asText();

        // 2. Accept
        mockMvc.perform(post("/api/rides/accept")
                        .param("rideId", rideId)
                        .param("driverId", "lc_driver")
                        .header("X-User-Id", "lc_driver"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        // 3. Approach
        mockMvc.perform(post("/api/rides/approach")
                        .param("rideId", rideId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRIVER_APPROACHING"));

        // 4. Arrive
        mockMvc.perform(post("/api/rides/arrive")
                        .param("rideId", rideId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRIVER_ARRIVED"));

        // 5. Start
        mockMvc.perform(post("/api/rides/start")
                        .param("rideId", rideId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        // 6. Complete + Payment
        mockMvc.perform(post("/api/rides/complete")
                        .param("rideId", rideId)
                        .param("driverId", "lc_driver"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ride.status").value("COMPLETED"))
                .andExpect(jsonPath("$.payment.status").value("PAID"));

        // 7. Verify final state
        Ride finalRide = rideRepository.findByRideId(rideId).orElseThrow();
        assertEquals("COMPLETED", finalRide.getStatus());
        assertEquals("lc_driver", finalRide.getDriverId());
    }

    // ======= QUERY TESTS =======

    @Test
    @Order(40)
    void testGetUserRides() throws Exception {
        createRide("REQUESTED", null);

        mockMvc.perform(get("/api/rides/user")
                        .param("userId", "rider1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    @Order(41)
    void testGetDriverRides() throws Exception {
        createRide("IN_PROGRESS", "testdriver");

        mockMvc.perform(get("/api/rides/driver")
                        .param("driverId", "testdriver"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    // ======= TRACKING TESTS =======

    @Test
    @Order(50)
    void testTrackRide() throws Exception {
        Ride ride = createRide("IN_PROGRESS", "trackdriver");

        mockMvc.perform(get("/api/rides/track/{rideId}", ride.getRideId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ride.rideId").value(ride.getRideId()));
    }

    @Test
    @Order(51)
    void testTrackRide_NotFound() throws Exception {
        mockMvc.perform(get("/api/rides/track/NONEXISTENT"))
                .andExpect(status().isNotFound());
    }
}
