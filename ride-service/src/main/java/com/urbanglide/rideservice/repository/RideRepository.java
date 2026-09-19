package com.urbanglide.rideservice.repository;

import com.urbanglide.rideservice.model.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RideRepository extends JpaRepository<Ride, Long> {
    Optional<Ride> findByRideId(String rideId);

    List<Ride> findByUserId(String userId);

    List<Ride> findByDriverId(String driverId);

    List<Ride> findByStatus(String status);
}
