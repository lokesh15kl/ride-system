# UrbanGlide Mobility - Real-Time Urban Ride Dispatch & Mobility Orchestration System

## Overview
UrbanGlide Mobility is a robust real-time ride-hailing backend platform using an autonomous microservices architecture. It handles concurrent driver and passenger interactions via client-side load balancing, API Gateway routing, Eureka service discovery, and JWT security.

## Microservices Architecture

- **Eureka Server** (`eureka-server`): Service registry where all microservices register themselves.
- **API Gateway** (`api-gateway`): Spring Cloud Gateway acting as the single entry point. It performs client-side load-balancing routing to the underlying services.
- **Auth Service** (`auth-service`): Handles User login. Issues JWT tokens to authenticate and authorize requests.
- **Ride Service** (`ride-service`): Handles ride bookings. Communicates with both Driver and Payment services using OpenFeign clients.
- **Driver Service** (`driver-service`): Manages the driver fleet and rapid driver acceptance workflows.
- **Payment Service** (`payment-service`): Securely processes digital fares upon trip completion.

## Ports Used
- Eureka Server: `8761`
- API Gateway: `8080`
- Auth Service: `8081`
- Driver Service: `8082`
- Ride Service: `8083`
- Payment Service: `8084`

## How To Run

1. Open your terminal in the root project directory `UrbanRideSystem`.
2. Clean and Install the parent pom to download all dependencies:
   ```bash
   mvn clean install -DskipTests
   ```
3. Run each microservice individually either using your IDE (Eclipse/IntelliJ) or via Maven:
   ```bash
   cd eureka-server && mvn spring-boot:run
   cd api-gateway && mvn spring-boot:run
   # (Do the same for auth, driver, ride, and payment)
   ```
   *Note: Ensure you start `eureka-server` first.*

## API Examples

**Login to get JWT Token:**
```bash
curl -X POST "http://localhost:8080/api/auth/login?username=admin&password=admin"
```

**Book a Ride (Ride Service uses OpenFeign to call Driver and Payment Service):**
```bash
curl -X POST "http://localhost:8080/api/rides/book?userId=user123"
```
