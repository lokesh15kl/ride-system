# UrbanGlide Review 2 — Automated Test Execution Results

**Date of Execution**: October 30, 2026  
**Environment**: Windows 11, Java 21.0.9 LTS, Apache Maven 3.9.16  
**Test Framework**: JUnit 5 (Jupiter), Spring Boot Test, Spring MVC Test (MockMvc), Spring WebFlux Test, Mockito  
**Build Status**: **SUCCESS (All 55 Tests Passing, 0 Failures, 0 Errors, 0 Skipped)**

---

## Executive Test Summary

```
------------------------------------------------------------------------
Reactor Summary for UrbanRideSystem 1.0-SNAPSHOT:
------------------------------------------------------------------------
UrbanRideSystem .................................... SUCCESS [  0.003 s]
eureka-server ...................................... SUCCESS [ 10.950 s] (1 test)
api-gateway ........................................ SUCCESS [  8.841 s] (8 tests)
auth-service ....................................... SUCCESS [ 13.832 s] (12 tests)
driver-service ..................................... SUCCESS [ 13.072 s] (12 tests)
ride-service ....................................... SUCCESS [ 14.561 s] (18 tests)
payment-service .................................... SUCCESS [ 13.134 s] (4 tests)
------------------------------------------------------------------------
BUILD SUCCESS - 55 / 55 TESTS PASSED (100%)
------------------------------------------------------------------------
```

---

## Detailed Test Breakdown by Microservice

### 1. Eureka Server (`eureka-server`) — 1 Test

| # | Test Class | Test Method | Type | Description | Result |
|---|---|---|---|---|:---:|
| 1 | `EurekaServerApplicationTests` | `contextLoads` | Integration | Validates Eureka registry bootstrap, peer awareness, and actuator status. | **PASS** |

---

### 2. API Gateway (`api-gateway`) — 8 Tests

| # | Test Class | Test Method | Type | Description | Result |
|---|---|---|---|---|:---:|
| 2 | `ApiGatewayApplicationTests` | `contextLoads` | Integration | Gateway WebFlux context and route definitions load successfully. | **PASS** |
| 3 | `JwtAuthenticationFilterTest` | `testOpenEndpoint_BypassesAuth` | Security | Public endpoints (login, register) bypass JWT validation and strip spoofed headers. | **PASS** |
| 4 | `JwtAuthenticationFilterTest` | `testMissingToken_Returns401` | Security | Requests to protected endpoints without Authorization header receive HTTP 401. | **PASS** |
| 5 | `JwtAuthenticationFilterTest` | `testInvalidToken_Returns401` | Security | Malformed or tamper-corrupted JWT tokens return HTTP 401 Unauthorized. | **PASS** |
| 6 | `JwtAuthenticationFilterTest` | `testAdminEndpoint_NonAdminRole_Returns403` | Security | Non-admin user attempting `/api/drivers/approve` receives HTTP 403 Forbidden. | **PASS** |
| 7 | `JwtAuthenticationFilterTest` | `testAdminEndpoint_AdminRole_ProceedsAndInjectsHeaders` | Security | Admin user passes perimeter and gateway injects verified `X-User-Id` / `X-User-Role`. | **PASS** |
| 8 | `JwtAuthenticationFilterTest` | `testDriverEndpoint_RiderRole_Returns403` | Security | Rider attempting `/api/rides/accept` receives HTTP 403 Forbidden. | **PASS** |
| 9 | `JwtAuthenticationFilterTest` | `testDriverEndpoint_DriverRole_Proceeds` | Security | Authenticated driver successfully proceeds with downstream headers injected. | **PASS** |

---

### 3. Auth Service (`auth-service`) — 12 Tests

| # | Test Class | Test Method | Type | Description | Result |
|---|---|---|---|---|:---:|
| 10 | `AuthServiceApplicationTests` | `testRegisterRider_Success` | Functional | Rider registration persists user entity with role RIDER. | **PASS** |
| 11 | `AuthServiceApplicationTests` | `testRegisterDriver_Success` | Functional | Driver registration creates account with BCrypt-hashed password. | **PASS** |
| 12 | `AuthServiceApplicationTests` | `testRegisterDuplicate_Returns409` | Validation | Duplicate username registration returns HTTP 409 Conflict. | **PASS** |
| 13 | `AuthServiceApplicationTests` | `testRegisterAdmin_Rejected` | Security | Attempting to self-register as ADMIN returns HTTP 400 Bad Request. | **PASS** |
| 14 | `AuthServiceApplicationTests` | `testRegisterMissingUsername_Returns400` | Validation | Blank or missing username returns HTTP 400 Bad Request. | **PASS** |
| 15 | `AuthServiceApplicationTests` | `testLogin_Success_ReturnsJWT` | Security | Valid credentials issue signed HS256 JWT token with role claims. | **PASS** |
| 16 | `AuthServiceApplicationTests` | `testLogin_InvalidPassword_Returns401` | Security | Incorrect password returns HTTP 401 Unauthorized. | **PASS** |
| 17 | `AuthServiceApplicationTests` | `testLogin_NonexistentUser_Returns401` | Security | Non-existent user login attempt returns HTTP 401 Unauthorized. | **PASS** |
| 18 | `AuthServiceApplicationTests` | `testLogin_JWT_ContainsCorrectClaims` | Security | Verifies JWT contains `sub`, `role`, `issuedAt`, and valid expiration. | **PASS** |
| 19 | `AuthServiceApplicationTests` | `testPasswordsAreBCryptHashed` | Security | Confirms passwords in repository start with `$2a$` and differ from raw input. | **PASS** |
| 20 | `AuthServiceApplicationTests` | `testLegacyPlaintextPasswordMigration` | Security | Legacy plaintext passwords transparently upgrade to BCrypt on first successful login. | **PASS** |
| 21 | `AuthServiceApplicationTests` | `testGetUsers_DoesNotExposePasswords` | Security | `/api/auth/users` excludes password hashes and fields from JSON serialization. | **PASS** |

---

### 4. Driver Service (`driver-service`) — 12 Tests

| # | Test Class | Test Method | Type | Description | Result |
|---|---|---|---|---|:---:|
| 22 | `DriverServiceApplicationTests` | `testRegisterDriver_Success` | Functional | New driver registration defaults to `PENDING` verification status. | **PASS** |
| 23 | `DriverServiceApplicationTests` | `testRegisterDuplicateDriver_Returns400` | Validation | Duplicate driver registration returns HTTP 400 Bad Request. | **PASS** |
| 24 | `DriverServiceApplicationTests` | `testApproveDriver_Success` | Workflow | Admin approval sets status to `APPROVED` and records vehicle number. | **PASS** |
| 25 | `DriverServiceApplicationTests` | `testApproveDriver_MissingVehicleNumber_Returns400` | Validation | Admin approval without vehicle number returns HTTP 400. | **PASS** |
| 26 | `DriverServiceApplicationTests` | `testApproveDriver_AlreadyApproved_Returns400` | State Check | Re-approving an already verified driver returns HTTP 400. | **PASS** |
| 27 | `DriverServiceApplicationTests` | `testApproveDriver_NotFound_Returns404` | Validation | Approving non-existent driver returns HTTP 404 Not Found. | **PASS** |
| 28 | `DriverServiceApplicationTests` | `testRejectDriver` | Workflow | Admin rejection transitions driver status to `REJECTED`. | **PASS** |
| 29 | `DriverServiceApplicationTests` | `testGetStatus` | Functional | Queries driver current status and returns valid state. | **PASS** |
| 30 | `DriverServiceApplicationTests` | `testGetStatus_NotFound_Returns404` | Validation | Querying status of unknown driver returns HTTP 404. | **PASS** |
| 31 | `DriverServiceApplicationTests` | `testGetAllDrivers` | Functional | Fetches full directory of registered drivers. | **PASS** |
| 32 | `DriverServiceApplicationTests` | `testUpdateDriverStatus` | State Check | Updates driver availability state (AVAILABLE ↔ ON_RIDE ↔ OFFLINE). | **PASS** |
| 33 | `DriverServiceApplicationTests` | `testUpdateLocation` | Geospatial | Updates driver GPS coordinates (latitude, longitude). | **PASS** |

---

### 5. Ride Service (`ride-service`) — 18 Tests

| # | Test Class | Test Method | Type | Description | Result |
|---|---|---|---|---|:---:|
| 34 | `RideServiceApplicationTests` | `testBookRide_Success` | Functional | Creates ride in `REQUESTED` state with calculated fare. | **PASS** |
| 35 | `RideServiceApplicationTests` | `testBookRide_WithCoordinates` | Functional | Persists source and destination coordinates for mapping. | **PASS** |
| 36 | `RideServiceApplicationTests` | `testAcceptRide_Success` | Lifecycle | Driver accepts `REQUESTED` ride; transitions to `ACCEPTED`. | **PASS** |
| 37 | `RideServiceApplicationTests` | `testAcceptRide_AlreadyAccepted_Returns409` | Concurrency | Second driver attempting to accept already accepted ride gets HTTP 409 Conflict. | **PASS** |
| 38 | `RideServiceApplicationTests` | `testApproachRide_Success` | Lifecycle | Transitions state from `ACCEPTED` to `DRIVER_APPROACHING`. | **PASS** |
| 39 | `RideServiceApplicationTests` | `testApproachRide_InvalidState` | State Machine | Calling approach on non-accepted ride returns HTTP 400 Bad Request. | **PASS** |
| 40 | `RideServiceApplicationTests` | `testArriveRide_Success` | Lifecycle | Transitions state from `DRIVER_APPROACHING` to `DRIVER_ARRIVED`. | **PASS** |
| 41 | `RideServiceApplicationTests` | `testStartRide_Success` | Lifecycle | Transitions state from `DRIVER_ARRIVED` to `IN_PROGRESS`. | **PASS** |
| 42 | `RideServiceApplicationTests` | `testStartRide_InvalidState` | State Machine | Starting ride before driver arrives returns HTTP 400 Bad Request. | **PASS** |
| 43 | `RideServiceApplicationTests` | `testCompleteRide_FullLifecycle` | Lifecycle | Completes ride, triggers OpenFeign payment, and releases driver. | **PASS** |
| 44 | `RideServiceApplicationTests` | `testCompleteRide_DuplicateCompletion_Returns409` | Idempotency | Completing an already completed ride returns HTTP 409 Conflict. | **PASS** |
| 45 | `RideServiceApplicationTests` | `testCompleteRide_WrongDriver_Returns403` | Security | Driver who does not own the ride cannot complete it (HTTP 403 Forbidden). | **PASS** |
| 46 | `RideServiceApplicationTests` | `testCompleteRide_InvalidState_Returns400` | State Machine | Attempting completion when ride is not `IN_PROGRESS` returns HTTP 400. | **PASS** |
| 47 | `RideServiceApplicationTests` | `testFullRideLifecycle` | End-to-End | Executes complete sequential lifecycle: Book → Accept → Approach → Arrive → Start → Complete. | **PASS** |
| 48 | `RideServiceApplicationTests` | `testGetUserRides` | Query | Returns history of rides booked by a specific user. | **PASS** |
| 49 | `RideServiceApplicationTests` | `testGetDriverRides` | Query | Returns history of rides assigned to a specific driver. | **PASS** |
| 50 | `RideServiceApplicationTests` | `testTrackRide` | Telemetry | Fetches live ride status and location for real-time tracking. | **PASS** |
| 51 | `RideServiceApplicationTests` | `testTrackRide_NotFound` | Validation | Tracking non-existent rideId returns HTTP 404 Not Found. | **PASS** |

---

### 6. Payment Service (`payment-service`) — 4 Tests

| # | Test Class | Test Method | Type | Description | Result |
|---|---|---|---|---|:---:|
| 52 | `PaymentServiceApplicationTests` | `testGetStatus` | Integration | Verifies service health and status endpoint. | **PASS** |
| 53 | `PaymentServiceApplicationTests` | `testProcessPayment_Success` | Functional | Processes payment for rideId and records `PAID` status with exact amount. | **PASS** |
| 54 | `PaymentServiceApplicationTests` | `testProcessPayment_Idempotent` | Idempotency | Repeated payment requests return original receipt without duplicate debit. | **PASS** |
| 55 | `PaymentServiceApplicationTests` | `testProcessPayment_PersistsCorrectly` | Persistence | Verifies database entity fields and JPA entity constraints. | **PASS** |

---

## How to Re-Run the Automated Test Suite

```powershell
# From project root:
cd C:\Users\bhaga\Desktop\UrbanRideSystem
mvn test
```
All tests use an embedded in-memory H2 database with the `@ActiveProfiles("test")` configuration, ensuring tests run completely decoupled from the production PostgreSQL database.
