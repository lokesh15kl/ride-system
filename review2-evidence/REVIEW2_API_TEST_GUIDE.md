# UrbanGlide Review 2 — API Testing & Verification Guide

This guide provides faculty evaluators with ready-to-run commands to test and verify every microservice endpoint exclusively through the **API Gateway** (`http://localhost:8080`).

---

## 1. Prerequisites & Base URL

All requests must be directed to the API Gateway:
- **API Gateway Base URL**: `http://localhost:8080`
- **Swagger Documentation**: `http://localhost:8080/webjars/swagger-ui/index.html`

Ensure all microservices and PostgreSQL are running before executing live requests (see `REVIEW2_STARTUP_GUIDE.md`).

---

## 2. Authentication & JWT Acquisition

### 2.1 Register a Rider Account
```bash
curl -X POST "http://localhost:8080/api/auth/register" \
  -d "username=eval_rider" \
  -d "password=Password123!" \
  -d "role=RIDER"
```
**Expected Response (200 OK)**:
```json
{
  "message": "User registered successfully"
}
```

### 2.2 Register a Driver Account
```bash
curl -X POST "http://localhost:8080/api/auth/register" \
  -d "username=eval_driver" \
  -d "password=Password123!" \
  -d "role=DRIVER"
```
**Expected Response (200 OK)**:
```json
{
  "message": "User registered successfully"
}
```

### 2.3 Attempt to Register as Admin (Security Check — Must Fail)
```bash
curl -X POST "http://localhost:8080/api/auth/register" \
  -d "username=eval_hacker" \
  -d "password=Password123!" \
  -d "role=ADMIN"
```
**Expected Response (400 Bad Request)**:
```json
{
  "error": "Invalid role. Allowed roles: RIDER, DRIVER"
}
```

### 2.4 Login as Rider and Extract JWT
```bash
curl -X POST "http://localhost:8080/api/auth/login" \
  -d "username=eval_rider" \
  -d "password=Password123!"
```
**Expected Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "role": "RIDER",
  "username": "eval_rider"
}
```
> Save this token as `RIDER_TOKEN`.

### 2.5 Login as Driver and Extract JWT
```bash
curl -X POST "http://localhost:8080/api/auth/login" \
  -d "username=eval_driver" \
  -d "password=Password123!"
```
**Expected Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "role": "DRIVER",
  "username": "eval_driver"
}
```
> Save this token as `DRIVER_TOKEN`.

### 2.6 Login as Admin (Pre-seeded Account)
```bash
curl -X POST "http://localhost:8080/api/auth/login" \
  -d "username=admin" \
  -d "password=admin123"
```
**Expected Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "role": "ADMIN",
  "username": "admin"
}
```
> Save this token as `ADMIN_TOKEN`.

---

## 3. Security Perimeter & Role-Based Access Control (RBAC) Scenarios

### Scenario 3.1: Missing JWT Token (HTTP 401 Unauthorized)
```bash
curl -i -X GET "http://localhost:8080/api/rides/all"
```
**Expected Response**:
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error": "Unauthorized", "message": "Missing or invalid JWT token"}
```

### Scenario 3.2: Malformed / Invalid JWT Token (HTTP 401 Unauthorized)
```bash
curl -i -X GET "http://localhost:8080/api/rides/all" \
  -H "Authorization: Bearer invalid_or_forged_token_string"
```
**Expected Response**:
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error": "Unauthorized", "message": "Malformed JWT token"}
```

### Scenario 3.3: Rider Attempting Admin Action (HTTP 403 Forbidden)
```bash
curl -i -X POST "http://localhost:8080/api/drivers/approve?driverId=eval_driver&vehicleNumber=DL01AB1234" \
  -H "Authorization: Bearer <RIDER_TOKEN>"
```
**Expected Response**:
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": "Forbidden", "message": "Insufficient permissions"}
```

### Scenario 3.4: Rider Attempting Driver Action (HTTP 403 Forbidden)
```bash
curl -i -X POST "http://localhost:8080/api/rides/accept?rideId=RIDE-123&driverId=eval_rider" \
  -H "Authorization: Bearer <RIDER_TOKEN>"
```
**Expected Response**:
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"error": "Forbidden", "message": "Insufficient permissions"}
```

---

## 4. Driver Onboarding & Admin KYC Approval Workflow

### 4.1 Driver Profile Registration
```bash
curl -X POST "http://localhost:8080/api/drivers/register" \
  -d "driverId=eval_driver" \
  -d "name=Evaluation Driver" \
  -d "vehicleType=CAR"
```
**Expected Response (200 OK)**:
```json
{
  "driverId": "eval_driver",
  "name": "Evaluation Driver",
  "vehicleType": "CAR",
  "status": "AVAILABLE",
  "verificationStatus": "PENDING"
}
```

### 4.2 Admin Approves Driver with Vehicle Number
```bash
curl -X POST "http://localhost:8080/api/drivers/approve?driverId=eval_driver&vehicleNumber=KA05MJ4321" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
**Expected Response (200 OK)**:
```json
{
  "driverId": "eval_driver",
  "verificationStatus": "APPROVED",
  "vehicleNumber": "KA05MJ4321"
}
```

### 4.3 Update Driver GPS Location
```bash
curl -X POST "http://localhost:8080/api/drivers/location?driverId=eval_driver&latitude=17.3850&longitude=78.4867" \
  -H "Authorization: Bearer <DRIVER_TOKEN>"
```
**Expected Response (200 OK)**:
```json
{
  "driverId": "eval_driver",
  "latitude": 17.385,
  "longitude": 78.4867,
  "status": "AVAILABLE"
}
```

---

## 5. End-to-End Ride Lifecycle & Payment Orchestration

### Step 5.1: Passenger Books Ride (`REQUESTED`)
```bash
curl -X POST "http://localhost:8080/api/rides/book" \
  -H "Authorization: Bearer <RIDER_TOKEN>" \
  -d "userId=eval_rider" \
  -d "source=HITEC City, Hyderabad" \
  -d "destination=Rajiv Gandhi International Airport" \
  -d "vehicleType=CAR"
```
**Expected Response (200 OK)**:
```json
{
  "ride": {
    "rideId": "RIDE-1730245000000",
    "userId": "eval_rider",
    "source": "HITEC City, Hyderabad",
    "destination": "Rajiv Gandhi International Airport",
    "status": "REQUESTED",
    "amount": 450.00,
    "vehicleType": "CAR"
  }
}
```
> Save the `rideId` from the response (e.g. `RIDE-1730245000000`).

### Step 5.2: Driver Accepts Ride (`ACCEPTED`)
```bash
curl -X POST "http://localhost:8080/api/rides/accept?rideId=<RIDE_ID>&driverId=eval_driver" \
  -H "Authorization: Bearer <DRIVER_TOKEN>"
```
**Expected Response (200 OK)**:
```json
{
  "rideId": "<RIDE_ID>",
  "driverId": "eval_driver",
  "status": "ACCEPTED"
}
```

### Step 5.3: Driver Marks Approaching (`DRIVER_APPROACHING`)
```bash
curl -X POST "http://localhost:8080/api/rides/approach?rideId=<RIDE_ID>" \
  -H "Authorization: Bearer <DRIVER_TOKEN>"
```
**Expected Response (200 OK)**:
```json
{
  "rideId": "<RIDE_ID>",
  "status": "DRIVER_APPROACHING"
}
```

### Step 5.4: Driver Marks Arrived at Pickup (`DRIVER_ARRIVED`)
```bash
curl -X POST "http://localhost:8080/api/rides/arrive?rideId=<RIDE_ID>" \
  -H "Authorization: Bearer <DRIVER_TOKEN>"
```
**Expected Response (200 OK)**:
```json
{
  "rideId": "<RIDE_ID>",
  "status": "DRIVER_ARRIVED"
}
```

### Step 5.5: Driver Starts the Trip (`IN_PROGRESS`)
```bash
curl -X POST "http://localhost:8080/api/rides/start?rideId=<RIDE_ID>" \
  -H "Authorization: Bearer <DRIVER_TOKEN>"
```
**Expected Response (200 OK)**:
```json
{
  "rideId": "<RIDE_ID>",
  "status": "IN_PROGRESS"
}
```

### Step 5.6: Driver Completes Trip & Triggers Automated Payment (`COMPLETED`)
```bash
curl -X POST "http://localhost:8080/api/rides/complete?rideId=<RIDE_ID>&driverId=eval_driver" \
  -H "Authorization: Bearer <DRIVER_TOKEN>"
```
**Expected Response (200 OK)**:
```json
{
  "message": "Ride completed and payment processed successfully.",
  "ride": {
    "rideId": "<RIDE_ID>",
    "status": "COMPLETED",
    "driverId": "eval_driver"
  },
  "payment": {
    "rideId": "<RIDE_ID>",
    "amount": 450.00,
    "status": "PAID",
    "message": "Processed payment of $450.00 for ride <RIDE_ID>"
  }
}
```

### Step 5.7: Passenger Submits Rating & Feedback
```bash
curl -X POST "http://localhost:8080/api/rides/feedback" \
  -H "Authorization: Bearer <RIDER_TOKEN>" \
  -d "rideId=<RIDE_ID>" \
  -d "rating=5" \
  -d "feedback=Smooth ride, very polite driver!"
```
**Expected Response (200 OK)**:
```json
{
  "message": "Feedback submitted successfully"
}
```

---

## 6. Actuator Health Endpoints

Each microservice exposes standardized `/actuator/health` endpoints routable via API Gateway:

```bash
# Eureka Server Health
curl http://localhost:8761/actuator/health

# API Gateway Health
curl http://localhost:8080/actuator/health

# Auth Service Health
curl http://localhost:8081/actuator/health

# Driver Service Health
curl http://localhost:8082/actuator/health

# Ride Service Health
curl http://localhost:8083/actuator/health

# Payment Service Health
curl http://localhost:8084/actuator/health
```
**Expected Output for All**:
```json
{"status":"UP"}
```
