package com.urbanglide.driverservice.config;

import com.urbanglide.driverservice.model.Driver;
import com.urbanglide.driverservice.repository.DriverRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Optional;

@Configuration
public class DatabaseSeeder {

    @Bean
    public CommandLineRunner initDatabase(DriverRepository driverRepository) {
        return args -> {
            seedDriver(driverRepository, "bike1", "BIKE", "KA01BK1234");
            seedDriver(driverRepository, "auto1", "AUTO", "KA02AU1234");
            seedDriver(driverRepository, "car1", "CAR", "KA03CR1234");
            seedDriver(driverRepository, "erickshaw1", "E_RICKSHAW", "KA04ER1234");
        };
    }

    private void seedDriver(DriverRepository driverRepository, String username, String type, String vehicleNumber) {
        Optional<Driver> opt = driverRepository.findByDriverId(username);
        if (opt.isEmpty()) {
            Driver driver = new Driver(username, username, "AVAILABLE");
            driver.setVehicleType(type);
            driver.setVerificationStatus("APPROVED"); // explicitly approved for dev
            driver.setVehicleNumber(vehicleNumber);
            driver.setLatitude(16.5);
            driver.setLongitude(80.6);
            driverRepository.save(driver);
        }
    }
}
