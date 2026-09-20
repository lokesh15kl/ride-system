package com.urbanglide.rideservice.repository;

import com.urbanglide.rideservice.model.RideFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RideFeedbackRepository extends JpaRepository<RideFeedback, Long> {
    Optional<RideFeedback> findByRideId(String rideId);
}
