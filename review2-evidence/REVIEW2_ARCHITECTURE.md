# UrbanGlide Review 2 — System Architecture & Design Specification

This document provides a comprehensive technical breakdown of the UrbanGlide microservices architecture, including network topology, sequence diagrams, security flow, and entity relationships.

---

## 1. High-Level System Architecture

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer"]
        UI["React 18 SPA (Vite, TS) Port 5173"]
    end

    subgraph EdgePerimeter ["Edge & Security Perimeter"]
        GW["Spring Cloud API Gateway (Port 8080)<br/>• JwtAuthenticationFilter (HS256)<br/>• Header Sanitization<br/>• CORS Whitelist"]
    end

    subgraph ServiceRegistry ["Service Discovery & Registry"]
        EUR["Eureka Server (Port 8761)<br/>• Peer Registry<br/>• Dynamic Health Monitoring"]
    end

    subgraph CoreMicroservices ["Core Microservices Domain"]
        AUTH["Auth Service (Port 8081)<br/>• BCrypt Password Security<br/>• JWT Token Issuance"]
        DRV["Driver Service (Port 8082)<br/>• KYC Approval Workflow<br/>• Geospatial Queries (Haversine)"]
        RIDE["Ride Service (Port 8083)<br/>• Ride State Machine<br/>• Surge Pricing Calculator"]
        PAY["Payment Service (Port 8084)<br/>• Idempotent Payment Processor<br/>• Transaction Accounting"]
    end

    subgraph PersistenceLayer ["Persistence Layer"]
        DB[("PostgreSQL Database (urbanride_db)<br/>Port 5432")]
    end

    UI -->|HTTP / JSON| GW
    GW -.->|Heartbeat / Registry| EUR
    AUTH -.->|Heartbeat / Registry| EUR
    DRV -.->|Heartbeat / Registry| EUR
    RIDE -.->|Heartbeat / Registry| EUR
    PAY -.->|Heartbeat / Registry| EUR

    GW -->|lb://AUTH-SERVICE| AUTH
    GW -->|lb://DRIVER-SERVICE| DRV
    GW -->|lb://RIDE-SERVICE| RIDE
    GW -->|lb://PAYMENT-SERVICE| PAY

    RIDE -->|OpenFeign Client| DRV
    RIDE -->|OpenFeign Client| PAY

    AUTH --> DB
    DRV --> DB
    RIDE --> DB
    PAY --> DB
```

---

## 2. API Gateway Security & JWT Filter Sequence

The API Gateway acts as an impermeable perimeter. All requests pass through `JwtAuthenticationFilter` before routing to downstream services.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client / SPA
    participant GW as API Gateway (Port 8080)
    participant Filter as JwtAuthenticationFilter
    participant Downstream as Downstream Microservice

    Client->>GW: HTTP Request (Method, Path, Authorization Header)
    GW->>Filter: Intercept Request (GlobalFilter Order: -1)

    alt Path is Whitelisted (/api/auth/login, /api/auth/register, /actuator/**)
        Filter->>Filter: Strip any incoming X-User-Id / X-User-Role (Anti-spoofing)
        Filter->>Downstream: Forward sanitized request
    else Path is Protected (/api/rides/**, /api/drivers/**)
        alt Authorization Header Missing or Malformed
            Filter-->>Client: 401 Unauthorized {"error": "Missing or invalid JWT token"}
        else Token Present
            Filter->>Filter: Validate Signature (HS256) & Expiration
            alt Token Invalid or Expired
                Filter-->>Client: 401 Unauthorized {"error": "JWT token has expired / Malformed"}
            else Token Valid
                Filter->>Filter: Extract Claims (sub, role)
                alt Route Requires ADMIN & Role != ADMIN
                    Filter-->>Client: 403 Forbidden {"error": "Insufficient permissions"}
                else Route Requires DRIVER & Role not in (DRIVER, ADMIN)
                    Filter-->>Client: 403 Forbidden {"error": "Insufficient permissions"}
                else Role Check Passed
                    Filter->>Filter: Strip client headers & Inject trusted X-User-Id, X-User-Role
                    Filter->>Downstream: Forward with Authenticated Context
                    Downstream-->>Client: Response Data (200 OK)
                end
            end
        end
    end
```

---

## 3. End-to-End Ride Lifecycle State Machine

The Ride Service implements an authoritative state transition machine preventing concurrent races or invalid sequence bypass:

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: Passenger books ride (/api/rides/book)
    
    REQUESTED --> ACCEPTED: Driver accepts ride (/api/rides/accept)
    note right of REQUESTED: Prevents race condition via optimistic lock / state validation
    
    ACCEPTED --> DRIVER_APPROACHING: Driver starts driving to pickup (/api/rides/approach)
    
    DRIVER_APPROACHING --> DRIVER_ARRIVED: Driver arrives at pickup spot (/api/rides/arrive)
    
    DRIVER_ARRIVED --> IN_PROGRESS: Trip starts (/api/rides/start)
    
    IN_PROGRESS --> COMPLETED: Trip ends (/api/rides/complete)
    note right of COMPLETED: 1. Triggers OpenFeign call to Payment Service<br/>2. Releases Driver back to AVAILABLE<br/>3. Rejects duplicate completion attempts (409)

    COMPLETED --> [*]
```

---

## 4. Inter-Service Communication (OpenFeign Synchronous Integration)

Upon trip completion, `RideService` communicates with `PaymentService` and `DriverService` via OpenFeign declarative REST clients:

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Driver App
    participant GW as API Gateway
    participant RS as Ride Service
    participant PS as Payment Service
    participant DS as Driver Service
    participant DB as PostgreSQL

    Driver->>GW: POST /api/rides/complete?rideId=R-100&driverId=D-1
    GW->>RS: Forward Request (X-User-Id: D-1, X-User-Role: DRIVER)
    
    RS->>DB: Verify Ride status is IN_PROGRESS and driverId == D-1
    alt State Invalid or Driver Mismatch
        RS-->>Driver: 400 Bad Request or 403 Forbidden
    else Verification Success
        RS->>PS: FeignClient.processPayment(rideId, fareAmount)
        PS->>DB: Check existing payment (Idempotency)
        PS->>DB: Persist Payment (status: PAID)
        PS-->>RS: Return PaymentDTO {"status": "PAID", "amount": fareAmount}
        
        RS->>DS: FeignClient.updateDriverStatus(driverId, "AVAILABLE")
        DS->>DB: Update Driver status = AVAILABLE
        DS-->>RS: Status Updated OK
        
        RS->>DB: Update Ride status = COMPLETED
        RS-->>Driver: 200 OK {"ride": COMPLETED, "payment": PAID}
    end
```

---

## 5. Database Entity-Relationship Diagram

```mermaid
erDiagram
    USERS {
        bigint id PK
        varchar username UK
        varchar password "BCrypt hashed"
        varchar role "RIDER | DRIVER | ADMIN"
    }

    DRIVERS {
        bigint id PK
        varchar driver_id UK
        varchar name
        varchar vehicle_type
        varchar vehicle_number
        varchar status "AVAILABLE | ON_RIDE | OFFLINE"
        varchar verification_status "PENDING | APPROVED | REJECTED"
        double_precision latitude
        double_precision longitude
    }

    RIDES {
        bigint id PK
        varchar ride_id UK
        varchar user_id
        varchar driver_id
        varchar source
        varchar destination
        double_precision source_latitude
        double_precision source_longitude
        double_precision destination_latitude
        double_precision destination_longitude
        numeric amount "Authoritative persisted fare"
        varchar vehicle_type
        varchar status "REQUESTED | ACCEPTED | DRIVER_APPROACHING | DRIVER_ARRIVED | IN_PROGRESS | COMPLETED"
        timestamp created_at
    }

    PAYMENTS {
        bigint id PK
        varchar ride_id UK
        numeric amount
        varchar status "PAID"
    }

    RIDE_FEEDBACK {
        bigint id PK
        varchar ride_id UK
        integer rating
        varchar feedback
        timestamp created_at
    }

    USERS ||--o{ RIDES : "books"
    DRIVERS ||--o{ RIDES : "executes"
    RIDES ||--|| PAYMENTS : "settles"
    RIDES ||--o| RIDE_FEEDBACK : "rated by"
```
