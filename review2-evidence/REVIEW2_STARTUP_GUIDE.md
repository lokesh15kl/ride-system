# UrbanGlide Review 2 — Startup & Operational Guide

This document provides clear, deterministic instructions to boot the UrbanGlide microservices infrastructure, verify operational status, and troubleshoot runtime environments.

---

## 1. System Requirements & Ports

### Prerequisites
- **JDK**: Java 17 or Java 21 LTS installed (`java -version`)
- **Maven**: 3.8+ or 3.9+ (`mvn -version`)
- **Node.js & npm**: Node 18+ and npm 9+ (`node -v`, `npm -v`)
- **Docker Desktop**: Running with WSL2 or Hyper-V backend (`docker compose version`)

### Network & Port Allocation Table

| Service / Component | Port | Health / Status Endpoint | Swagger UI / Web Interface |
|---|:---:|---|---|
| **PostgreSQL Database** | `5432` | Container status: `docker ps` | Database: `urbanride_db` |
| **Eureka Discovery Server** | `8761` | `http://localhost:8761/actuator/health` | `http://localhost:8761` |
| **API Gateway** | `8080` | `http://localhost:8080/actuator/health` | `http://localhost:8080/webjars/swagger-ui/index.html` |
| **Auth Service** | `8081` | `http://localhost:8081/actuator/health` | `http://localhost:8081/swagger-ui/index.html` |
| **Driver Service** | `8082` | `http://localhost:8082/actuator/health` | `http://localhost:8082/swagger-ui/index.html` |
| **Ride Service** | `8083` | `http://localhost:8083/actuator/health` | `http://localhost:8083/swagger-ui/index.html` |
| **Payment Service** | `8084` | `http://localhost:8084/actuator/health` | `http://localhost:8084/swagger-ui/index.html` |
| **Frontend SPA (Vite)** | `5173` | Browser load | `http://localhost:5173` |

---

## 2. Option A: Native Startup (Recommended for Review Evaluation)

### Step 1: Start PostgreSQL Database
```powershell
cd C:\Users\bhaga\Desktop\UrbanRideSystem
docker compose up -d
```
Verify container is healthy:
```powershell
docker ps --filter "name=urbanride_postgres"
```

### Step 2: Launch All Microservices and Frontend
Run the automated bootstrap script:
```powershell
cd C:\Users\bhaga\Desktop\UrbanRideSystem
.\run.ps1
```
The script performs the following sequence:
1. Spawns Eureka Server on port `8761`.
2. Waits 15 seconds for registry warm-up.
3. Spawns API Gateway, Auth, Driver, Payment, and Ride services concurrently.
4. Spawns the Vite React Frontend on port `5173`.

---

## 3. Option B: Manual Step-by-Step Launch

If starting individual services in separate PowerShell windows:

```powershell
# Window 1: Eureka Server
cd C:\Users\bhaga\Desktop\UrbanRideSystem\eureka-server
mvn spring-boot:run

# Window 2: API Gateway
cd C:\Users\bhaga\Desktop\UrbanRideSystem\api-gateway
mvn spring-boot:run

# Window 3: Auth Service
cd C:\Users\bhaga\Desktop\UrbanRideSystem\auth-service
mvn spring-boot:run

# Window 4: Driver Service
cd C:\Users\bhaga\Desktop\UrbanRideSystem\driver-service
mvn spring-boot:run

# Window 5: Payment Service
cd C:\Users\bhaga\Desktop\UrbanRideSystem\payment-service
mvn spring-boot:run

# Window 6: Ride Service
cd C:\Users\bhaga\Desktop\UrbanRideSystem\ride-service
mvn spring-boot:run

# Window 7: Frontend Application
cd C:\Users\bhaga\Desktop\UrbanRideSystem\frontend-app
npm install
npm run dev
```

---

## 4. Operational Verification Checklist

Execute the following commands to confirm all components are operational:

1. **Verify Eureka Dashboard**: Open `http://localhost:8761`.  
   *Expected*: Applications list displays `API-GATEWAY`, `AUTH-SERVICE`, `DRIVER-SERVICE`, `RIDE-SERVICE`, `PAYMENT-SERVICE` with status `UP (1)`.
2. **Verify API Gateway Route Health**:
   ```powershell
   curl http://localhost:8080/actuator/health
   # Returns: {"status":"UP"}
   ```
3. **Verify Database Connectivity**:
   ```powershell
   docker exec -it urbanride_postgres psql -U admin -d urbanride_db -c "\dt"
   # Lists tables: users, drivers, rides, payments, ride_feedback
   ```

---

## 5. Default Credentials & Test Personas

| Role | Username | Password | Purpose |
|---|---|---|---|
| **ADMIN** | `admin` | `admin123` | System oversight, driver KYC approvals |
| **DRIVER** | `driver1` | `driver123` | Driver acceptance, location updates, ride completion |
| **DRIVER** | `driver2` | `driver123` | Second driver for concurrency & nearby testing |
| **RIDER** | `rider1` | `rider123` | Booking rides, tracking, rating submission |

---

## 6. Troubleshooting Common Issues

### Issue 1: Port Conflict (e.g. Port 8080 or 5432 in use)
```powershell
# Identify process using port 8080
Get-NetTCPConnection -LocalPort 8080 | Select-Object OwningProcess
# Terminate conflicting process
Stop-Process -Id <ProcessID> -Force
```

### Issue 2: PostgreSQL Connection Refused
Ensure Docker Desktop is running, then recreate the container:
```powershell
docker compose down
docker compose up -d
```

### Issue 3: Microservice Not Registered in Eureka
Eureka services heartbeat every 30 seconds. Allow up to 45 seconds after service startup for full registry synchronization.
