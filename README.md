# UrbanGlide - Real-Time Urban Ride Dispatch & Mobility Orchestration System
**(Project: PS018)**

## 1. Project Description
UrbanGlide is a modern, high-performance distributed ride-sharing architecture. It autonomously handles concurrent passenger requests, orchestrates driver tracking pipelines, processes dynamic surge pricing based on hyper-local geodata mappings, and performs JWT-based API authentication and role-based authorization bridging a suite of 6 robust Spring Boot microservices. 

## 2. Problem Statement & Objectives
**Problem:** Monolithic applications crash or scale poorly under intense geographic load spikes in ride-hailing environments as geospatial logic clashes against heavy payment and authentication I/O.
**Objective:** Decouple responsibilities into scalable, autonomous Spring Boot microservices (Eureka Service Discovery + Spring Cloud Gateway). Provide a visually engaging real-time frontend bridging leaf-level hardware nodes (Drivers) with network demand (Passengers) securely.

## 3. Security Architecture Diagram
```
                React Frontend
                      |
                      | JWT
                      ↓
               API Gateway (:8080)
                      |
              JWT Validation
                      |
             Role Authorization
                      |
                      ↓
                  Eureka (:8761)
                      |
       ┌──────────────┼──────────────┐
       ↓              ↓              ↓
 Auth Service   Ride Service   Driver Service
     (:8081)        (:8083)        (:8082)
                      |
                      ↓
                Payment Service (:8084)
```

## 4. PS018 Requirement Mapping

| Requirement | Implementation |
|---|---|
| **JWT Authentication** | Auth Service (Generation) + API Gateway Global Filter (Validation) |
| **Ride Booking** | Ride Service |
| **Driver Management** | Driver Service |
| **Payment** | Payment Service |
| **Service Discovery** | Eureka (`eureka-server`) |
| **API Gateway** | Spring Cloud Gateway (`api-gateway`) |
| **Inter-service Communication** | OpenFeign (`PaymentClient`, `DriverClient`) |
| **Nearby Driver Matching** | Haversine + radius + vehicle type (Native SQL in `DriverRepository`) |
| **Ride Tracking** | Near-real-time location tracking using REST polling |
| **Load Balancing** | Eureka + `lb://` multiple instances |
| **Performance Testing** | JMeter test plan (`tests/ps018-load-test.jmx`) |
| **Deployment** | Docker/PostgreSQL + Spring Boot Jars |

## 5. JWT Authentication & Role Authorization
1. User logs in.
2. **Auth Service** generates JWT using `HS256`.
3. **Frontend** stores token in `localStorage`.
4. Axios automatically sends Bearer token in the `Authorization` header.
5. **API Gateway** intercepts request and validates JWT signature and expiration against the secure key.
6. **API Gateway** extracts the role and user identity.
7. Unauthorized or missing token requests are rejected (`401 Unauthorized`).
8. Valid JWTs with insufficient roles (e.g., Rider trying to Approve KYC) are rejected (`403 Forbidden`).
9. Authorized requests are routed to internal microservices with stripped identity headers.

## 6. How to Demonstrate Load Balancing
Load balancing can be demonstrated by running multiple instances of Ride Service registered with Eureka.

**Terminal 1:** Start Ride Service on 8083.
```bash
cd ride-service
mvn spring-boot:run
```
**Terminal 2:** Start another Ride Service instance on 8093.
```bash
cd ride-service
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8093"
```
Both register dynamically as `RIDE-SERVICE`.
**Test:**
Hit `http://localhost:8080/api/rides/instance` repeatedly. You will observe the response alternating between port `8083` and `8093` dynamically!

## 7. JMeter Performance Testing Setup
A JMeter test plan is available in `tests/ps018-load-test.jmx`.
To run:
```bash
jmeter -n -t tests/ps018-load-test.jmx -l tests/results.jtl
```

### Performance Test Results (Run locally to fill out)
| Metric | Result |
|---|---|
| Concurrent Users | |
| Total Requests | |
| Average Response Time | |
| 95th Percentile | |
| Throughput | |
| Error Rate | |

## 8. Local Setup & Docker Deployment
1. **Ensure PostgreSQL is running.**
   ```bash
   docker-compose up -d
   ```
2. Set up the backend services. In your IDE or Terminal, compile and start in the following strict order:
   - `eureka-server` (Must be strictly first)
   - `api-gateway`
   - `auth-service`, `driver-service`, `ride-service`, `payment-service` 
3. Boot the Frontend Interface:
   ```bash
   cd frontend-app
   npm install
   npm run dev
   ```
4. **Access the application** at `http://localhost:5173`.
