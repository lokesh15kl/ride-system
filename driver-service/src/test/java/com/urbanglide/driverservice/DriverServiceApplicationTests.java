package com.urbanglide.driverservice;

import com.urbanglide.driverservice.model.Driver;
import com.urbanglide.driverservice.repository.DriverRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class DriverServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DriverRepository driverRepository;

    @BeforeEach
    void setUp() {
        driverRepository.deleteAll();
    }

    // ======= REGISTRATION TESTS =======

    @Test
    @Order(1)
    void testRegisterDriver_Success() throws Exception {
        mockMvc.perform(post("/api/drivers/register")
                .param("driverId", "drv001")
                .param("name", "John Doe")
                .param("vehicleType", "CAR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.driverId").value("drv001"))
                .andExpect(jsonPath("$.verificationStatus").value("PENDING"))
                .andExpect(jsonPath("$.vehicleType").value("CAR"));

        Driver saved = driverRepository.findByDriverId("drv001").orElseThrow();
        assertEquals("PENDING", saved.getVerificationStatus());
    }

    @Test
    @Order(2)
    void testRegisterDuplicateDriver_Returns400() throws Exception {
        driverRepository.save(new Driver("drv002", "Jane", "AVAILABLE"));

        mockMvc.perform(post("/api/drivers/register")
                .param("driverId", "drv002")
                .param("name", "Jane Dup"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Driver already exists"));
    }

    // ======= KYC APPROVAL TESTS =======

    @Test
    @Order(10)
    void testApproveDriver_Success() throws Exception {
        Driver d = new Driver("drv003", "ApproveMe", "AVAILABLE");
        d.setVerificationStatus("PENDING");
        d.setVehicleType("BIKE");
        driverRepository.save(d);

        mockMvc.perform(post("/api/drivers/approve")
                .param("driverId", "drv003")
                .param("vehicleNumber", "KA01AB1234"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("APPROVED"))
                .andExpect(jsonPath("$.vehicleNumber").value("KA01AB1234"));

        Driver approved = driverRepository.findByDriverId("drv003").orElseThrow();
        assertEquals("APPROVED", approved.getVerificationStatus());
        assertEquals("KA01AB1234", approved.getVehicleNumber());
    }

    @Test
    @Order(11)
    void testApproveDriver_MissingVehicleNumber_Returns400() throws Exception {
        Driver d = new Driver("drv004", "MissingVN", "AVAILABLE");
        d.setVerificationStatus("PENDING");
        driverRepository.save(d);

        mockMvc.perform(post("/api/drivers/approve")
                .param("driverId", "drv004"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Vehicle number is required"));
    }

    @Test
    @Order(12)
    void testApproveDriver_AlreadyApproved_Returns400() throws Exception {
        Driver d = new Driver("drv005", "AlreadyDone", "AVAILABLE");
        d.setVerificationStatus("APPROVED");
        d.setVehicleNumber("KA02XY5678");
        driverRepository.save(d);

        mockMvc.perform(post("/api/drivers/approve")
                .param("driverId", "drv005")
                .param("vehicleNumber", "KA02XY9999"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Driver verification status is not PENDING"));
    }

    @Test
    @Order(13)
    void testApproveDriver_NotFound_Returns404() throws Exception {
        mockMvc.perform(post("/api/drivers/approve")
                .param("driverId", "nonexistent")
                .param("vehicleNumber", "KA01ZZ0000"))
                .andExpect(status().isNotFound());
    }

    // ======= REJECT TESTS =======

    @Test
    @Order(20)
    void testRejectDriver() throws Exception {
        Driver d = new Driver("drv006", "RejectMe", "AVAILABLE");
        d.setVerificationStatus("PENDING");
        driverRepository.save(d);

        mockMvc.perform(post("/api/drivers/reject")
                .param("driverId", "drv006"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("REJECTED"));
    }

    // ======= STATUS TESTS =======

    @Test
    @Order(30)
    void testGetStatus() throws Exception {
        driverRepository.save(new Driver("drv007", "StatusTest", "AVAILABLE"));

        mockMvc.perform(get("/api/drivers/status")
                .param("driverId", "drv007"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.driverId").value("drv007"))
                .andExpect(jsonPath("$.status").value("AVAILABLE"));
    }

    @Test
    @Order(31)
    void testGetStatus_NotFound_Returns404() throws Exception {
        mockMvc.perform(get("/api/drivers/status")
                .param("driverId", "ghost"))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(32)
    void testGetAllDrivers() throws Exception {
        driverRepository.save(new Driver("drv010", "D1", "AVAILABLE"));
        driverRepository.save(new Driver("drv011", "D2", "ON_RIDE"));

        mockMvc.perform(get("/api/drivers/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    // ======= UPDATE STATUS TESTS =======

    @Test
    @Order(40)
    void testUpdateDriverStatus() throws Exception {
        driverRepository.save(new Driver("drv012", "Busy", "AVAILABLE"));

        mockMvc.perform(post("/api/drivers/status")
                .param("driverId", "drv012")
                .param("status", "ON_RIDE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ON_RIDE"));
    }

    // ======= LOCATION TESTS =======

    @Test
    @Order(50)
    void testUpdateLocation() throws Exception {
        driverRepository.save(new Driver("drv013", "LocTest", "AVAILABLE"));

        mockMvc.perform(post("/api/drivers/location")
                .param("driverId", "drv013")
                .param("latitude", "17.3850")
                .param("longitude", "78.4867"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(17.385))
                .andExpect(jsonPath("$.longitude").value(78.4867));
    }
}
