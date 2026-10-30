# UrbanGlide Review 2 — Faculty Evaluation Demo Script

**Estimated Presentation Duration**: 10 – 12 minutes  
**Target Audience**: Review 2 Evaluation Panel (SOA & Microservices Advanced)  
**Roles & Personas**:
- **Admin**: Evaluator observing regulatory compliance, driver KYC, and user administration.
- **Rider (Passenger)**: Books rides, inspects dynamic fares, tracks vehicle GPS, rates trip.
- **Driver**: Registers with vehicle details, gets KYC approved, accepts rides, drives state machine, settles payment.

---

## Demo Schedule & Step-by-Step Flow

```
[00:00 - 02:00] Part 1: Service Discovery & Infrastructure Health (Eureka + Actuator)
[02:00 - 04:30] Part 2: Security Perimeter & RBAC Verification (Gateway + Auth)
[04:30 - 07:00] Part 3: Driver KYC Approval Workflow (Admin Action)
[07:00 - 09:30] Part 4: End-to-End Ride Lifecycle & Feign Settlement (Rider + Driver)
[09:30 - 11:00] Part 5: Automated Test Suite & Regression Proof (55 Tests)
```

---

### Part 1: Service Discovery & Infrastructure Health (00:00 – 02:00)

**Goal**: Prove all microservices are dynamically registered with Eureka and reporting healthy.

1. **Open Eureka Dashboard**: Navigate to `http://localhost:8761`.
   - **Talking Point**: *"UrbanGlide leverages Netflix Eureka for dynamic service registry. As seen here, 5 distinct microservices are running with automated heartbeats: API-GATEWAY, AUTH-SERVICE, DRIVER-SERVICE, RIDE-SERVICE, and PAYMENT-SERVICE."*
2. **Demonstrate Actuator Health**:
   - Query Gateway health: `curl http://localhost:8080/actuator/health` → `{"status":"UP"}`.
   - Query Ride Service health: `curl http://localhost:8083/actuator/health` → `{"status":"UP"}`.
   - **Talking Point**: *"All services expose Spring Boot Actuator health indicators enabling production monitoring."*

---

### Part 2: Edge Security Perimeter & RBAC (02:00 – 04:30)

**Goal**: Demonstrate that unauthorized access is blocked at the gateway perimeter and role escalation is impossible.

1. **Attempt Unauthenticated Request (401 Unauthorized)**:
   ```bash
   curl -i http://localhost:8080/api/rides/all
   ```
   - **Result**: `HTTP/1.1 401 Unauthorized` (`{"error": "Unauthorized", "message": "Missing or invalid JWT token"}`).
   - **Talking Point**: *"The API Gateway acts as our zero-trust perimeter shield. No request reaches internal services without a valid cryptographically signed JWT."*

2. **Attempt Role Escalation (403 Forbidden)**:
   - Login as a standard `RIDER`:
     ```bash
     curl -X POST "http://localhost:8080/api/auth/login" -d "username=rider1" -d "password=rider123"
     ```
   - Attempt to call the Admin KYC approval endpoint using the Rider's token:
     ```bash
     curl -i -X POST "http://localhost:8080/api/drivers/approve?driverId=drv99&vehicleNumber=KA01AB1234" \
       -H "Authorization: Bearer <RIDER_TOKEN>"
     ```
   - **Result**: `HTTP/1.1 403 Forbidden` (`{"error": "Forbidden", "message": "Insufficient permissions"}`).
   - **Talking Point**: *"Role-based access control (RBAC) is enforced at the Gateway before any microservice execution. Even with a valid token, riders cannot access administrative or driver-specific routes."*

3. **Demonstrate Password Security & Sanitization**:
   - Log in as Admin and fetch user list:
     ```bash
     curl -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:8080/api/auth/users
     ```
   - **Observation**: Show that user records contain `id`, `username`, `role` — but **no passwords or password hashes** are exposed in the JSON response.
   - **Talking Point**: *"Passwords are encrypted using BCrypt ($2a$) and protected with @JsonIgnore to prevent data leakage."*

---

### Part 3: Driver KYC Approval Workflow (04:30 – 07:00)

**Goal**: Walk through the driver registration and admin verification requirement.

1. **Driver Self-Registration**:
   ```bash
   curl -X POST "http://localhost:8080/api/drivers/register" \
     -d "driverId=demo_driver" \
     -d "name=Rajesh Kumar" \
     -d "vehicleType=CAR"
   ```
   - **Result**: Driver is created with `verificationStatus: "PENDING"`.
2. **Admin Approves Driver**:
   ```bash
   curl -X POST "http://localhost:8080/api/drivers/approve?driverId=demo_driver&vehicleNumber=TS09UB2026" \
     -H "Authorization: Bearer <ADMIN_TOKEN>"
   ```
   - **Result**: `verificationStatus` is updated to `APPROVED` and vehicle license number is registered.
   - **Talking Point**: *"Unverified drivers cannot accept rides. Only an Administrator can review and transition a driver to APPROVED status."*

---

### Part 4: End-to-End Ride Lifecycle & Feign Settlement (07:00 – 09:30)

**Goal**: Demonstrate the complete 6-state ride progression and synchronous payment settlement via OpenFeign.

1. **Step 1 — Book Ride (`REQUESTED`)**:
   ```bash
   curl -X POST "http://localhost:8080/api/rides/book" \
     -H "Authorization: Bearer <RIDER_TOKEN>" \
     -d "userId=rider1" \
     -d "source=Banjara Hills" \
     -d "destination=Financial District" \
     -d "vehicleType=CAR"
   ```
   - **Result**: Generates unique `rideId` with authoritative fare amount (e.g. `380.00`). Status is `REQUESTED`.

2. **Step 2 — Driver Accepts Ride (`ACCEPTED`)**:
   ```bash
   curl -X POST "http://localhost:8080/api/rides/accept?rideId=<RIDE_ID>&driverId=demo_driver" \
     -H "Authorization: Bearer <DRIVER_TOKEN>"
   ```
   - Show concurrency protection: If a second driver tries to accept the same ride, they immediately receive `409 Conflict`.

3. **Steps 3, 4, 5 — State Progression**:
   - `POST /api/rides/approach` → status `DRIVER_APPROACHING`.
   - `POST /api/rides/arrive` → status `DRIVER_ARRIVED`.
   - `POST /api/rides/start` → status `IN_PROGRESS`.

4. **Step 6 — Ride Completion & Automatic Payment (`COMPLETED`)**:
   ```bash
   curl -X POST "http://localhost:8080/api/rides/complete?rideId=<RIDE_ID>&driverId=demo_driver" \
     -H "Authorization: Bearer <DRIVER_TOKEN>"
   ```
   - **Talking Point**: *"When the driver ends the trip, Ride Service makes an internal synchronous OpenFeign call to the Payment Service, which processes the transaction idempotently, marks the payment as PAID, updates Driver status back to AVAILABLE, and marks the ride COMPLETED."*
   - Show idempotency: Executing the same completion again returns `409 Conflict` ("Ride already completed"), preventing double-billing.

---

### Part 5: Automated Test Suite & Regression Proof (09:30 – 11:00)

**Goal**: Provide concrete, verifiable proof of engineering excellence.

1. **Run Full Test Suite in Terminal**:
   ```powershell
   cd C:\Users\bhaga\Desktop\UrbanRideSystem
   mvn test
   ```
2. **Review Terminal Output**:
   - Show the Maven Reactor Summary:
     - 7 modules built.
     - **55 total automated tests** executed.
     - **0 failures, 0 errors, 0 skipped**.
   - **Closing Statement**: *"UrbanGlide has undergone rigorous security hardening, comprehensive unit testing, and architectural validation, fully fulfilling all criteria for Review 2."*
