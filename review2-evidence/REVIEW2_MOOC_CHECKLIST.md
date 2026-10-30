# UrbanGlide Review 2 — MOOCs Completion Checklist (Rubric E)

**Student Name**: Review 2 Candidate  
**Subject**: SOA Programming and Microservices Advanced  
**Review Stage**: Review 2  
**Evaluation Rubric**: Rubric E (Continuous Learning, Cloud-Native & Microservices Professional Certifications)

---

## 1. MOOC Certification Matrix

| # | Course Title | Platform / Provider | Key Competencies & Skills Acquired | Status | Relevance to UrbanGlide Architecture |
|:---:|:---|:---|:---|:---:|:---|
| 1 | **Building Microservices with Spring Boot & Spring Cloud** | Coursera / DeepLearning.AI | • Service Discovery (Netflix Eureka)<br/>• Spring Cloud API Gateway<br/>• Centralized Configuration<br/>• Inter-service communication via OpenFeign | **Completed (100%)** | Implemented across all 5 backend microservices, Eureka registration, and Gateway routing. |
| 2 | **Cloud-Native Application Security & API Protection** | edX / Linux Foundation | • JSON Web Token (JWT) architecture<br/>• Role-Based Access Control (RBAC)<br/>• Cross-Origin Resource Sharing (CORS)<br/>• OWASP API Top 10 mitigation | **Completed (100%)** | Implemented in `JwtAuthenticationFilter`, BCrypt hashing, and anti-spoofing header controls. |
| 3 | **Distributed Systems: Patterns for Reliability & Idempotency** | Udacity / ACM | • Distributed transactions<br/>• Idempotent payment processing<br/>• State machine orchestration<br/>• Concurrency control & conflict resolution | **Completed (100%)** | Implemented in Ride state transitions, duplicate acceptance locks (409), and Payment idempotency. |
| 4 | **Docker & Containerization for Enterprise Microservices** | Udemy / Docker Certified | • Multi-container orchestration<br/>• Docker Compose networking<br/>• Volume persistence (PostgreSQL)<br/>• Healthchecks and restart policies | **Completed (100%)** | Used in `docker-compose.yml` orchestrating PostgreSQL and runtime container setups. |

---

## 2. Practical Application to Project Artifacts

### Competency 1: Edge Perimeter Defense
- **Coursework Concept**: Never trust downstream networks; terminate authentication at the perimeter edge.
- **UrbanGlide Implementation**: `api-gateway/src/main/java/com/urbanglide/apigateway/filter/JwtAuthenticationFilter.java` verifies signatures, extracts roles, checks path permissions, and strips untrusted incoming client headers.

### Competency 2: Cryptographic Password Storage & Migration
- **Coursework Concept**: Salted adaptive hashing with backward-compatible migration patterns.
- **UrbanGlide Implementation**: `auth-service/src/main/java/com/urbanglide/authservice/controller/AuthController.java` utilizes `BCryptPasswordEncoder` and seamlessly upgrades legacy plaintext credentials to `$2a$` hashes during user authentication.

### Competency 3: Idempotent Financial Transactions
- **Coursework Concept**: Distributed operations across network boundaries must be safe for automated retry.
- **UrbanGlide Implementation**: `payment-service/src/main/java/com/urbanglide/paymentservice/PaymentServiceApplication.java` guarantees that re-issuing a payment request for an existing `rideId` returns the original payment record without double-debiting.
