# Urban Pulse Database Structure

## 1. Database Technology
PostgreSQL is used as the primary database for the microservices in this architecture.

## 2. Database Name
Database Name: `urbanride_db`

## 3. Host / Port
Host: `localhost` (or the internal docker network host)
Port: `5432`

## 4. How to Start Database
If using the provided `docker-compose.yml`, run the database using:
```bash
docker-compose up -d
```
This automatically initiates the PostgreSQL container with persistence mapped.

## 5. How to Connect
Using psql CLI:
```bash
psql -h localhost -p 5432 -U postgres -d urbanride_db
```
*(Default password inside the docker-compose environment is: `postgres`)*

## 6. How to Inspect Tables
Once connected via `psql`:
```sql
\dt              -- Lists all tables
```

## 7. Driver Demo Accounts
The system is automatically seeded with development accounts for testing driver dispatching functionality by `driver-service`/`auth-service` CommandLineRunners.
- Username: `bike1`, Password: `1234`, Type: `BIKE`
- Username: `auto1`, Password: `1234`, Type: `AUTO`
- Username: `car1`, Password: `1234`, Type: `CAR`
- Username: `erickshaw1`, Password: `1234`, Type: `E_RICKSHAW`
All drivers are automatically updated to `APPROVED` verification status during development seed.

## 8. Admin Account Mechanism
A default admin profile is available to moderate drivers.
- Username: `admin`, Password: `1234`, Role: `ADMIN`
The admin dashboard fetches lists of pending and approved drivers directly from the database and uses HTTP POST REST calls to change `verificationStatus`.

## 9. Ride Lifecycle
The `rides` table enforces standard state machine workflows:
1. `REQUESTED`
2. `ACCEPTED`
3. `DRIVER_APPROACHING`
4. `DRIVER_ARRIVED`
5. `IN_PROGRESS`
6. `COMPLETED` (or `COMPLETED_PAID`)

## 10. Feedback Table
The `ride_feedback` table exists to persist passenger driver reviews.
Includes: `id`, `ride_id`, `passenger_id`, `driver_id`, `rating`, `comment`, `created_at`.

## 11. Payment Table
The `payments` table tracks payments idempotently to prevent double charging completions.
Includes: `id`, `ride_id`, `amount`, `status` (`SUCCESS`), `transaction_date`.

## 12. Useful SQL Queries
```sql
-- View all registered identities
SELECT * FROM users;

-- View all approved driver fleet details
SELECT * FROM drivers;

-- View all rides
SELECT * FROM rides;

-- View feedback records
SELECT * FROM ride_feedback;

-- View processed payments mapped to rides
SELECT * FROM payments;
```
