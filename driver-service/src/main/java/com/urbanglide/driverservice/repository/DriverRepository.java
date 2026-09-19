package com.urbanglide.driverservice.repository;

import com.urbanglide.driverservice.model.Driver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Long> {
        Optional<Driver> findByDriverId(String driverId);

        @Query(value = "SELECT * FROM drivers d WHERE d.status = 'AVAILABLE' AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL AND "
                        +
                        "(6371 * acos(cos(radians(:lat)) * cos(radians(d.latitude)) * cos(radians(d.longitude) - radians(:lon)) + "
                        +
                        "sin(radians(:lat)) * sin(radians(d.latitude)))) <= :radius", nativeQuery = true)
        List<Driver> findNearbyAvailableDrivers(@Param("lat") double lat, @Param("lon") double lon,
                        @Param("radius") double radius);

        @Query(value = "SELECT * FROM drivers d WHERE d.status = 'AVAILABLE' AND d.vehicle_type = :vehicleType AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL AND "
                        +
                        "(6371 * acos(cos(radians(:lat)) * cos(radians(d.latitude)) * cos(radians(d.longitude) - radians(:lon)) + "
                        +
                        "sin(radians(:lat)) * sin(radians(d.latitude)))) <= :radius", nativeQuery = true)
        List<Driver> findNearbyAvailableDriversByVehicleType(@Param("lat") double lat, @Param("lon") double lon,
                        @Param("radius") double radius, @Param("vehicleType") String vehicleType);
}
