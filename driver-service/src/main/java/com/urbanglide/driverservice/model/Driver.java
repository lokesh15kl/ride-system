package com.urbanglide.driverservice.model;

import jakarta.persistence.*;

@Entity
@Table(name = "drivers")
public class Driver {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String driverId;

    private String name;
    private String status; // AVAILABLE, ON_RIDE, OFFLINE

    private Double latitude;
    private Double longitude;

    private String vehicleType; // BIKE, CAR, PREMIUM_CAR, AUTO, E_RIKSHAW

    private String verificationStatus; // PENDING, APPROVED

    public Driver() {
    }

    public Driver(String driverId, String name, String status) {
        this.driverId = driverId;
        this.name = name;
        this.status = status;
    }

    public Driver(String driverId, String name, String status, Double latitude, Double longitude) {
        this.driverId = driverId;
        this.name = name;
        this.status = status;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDriverId() {
        return driverId;
    }

    public void setDriverId(String driverId) {
        this.driverId = driverId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public String getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(String verificationStatus) {
        this.verificationStatus = verificationStatus;
    }
}
