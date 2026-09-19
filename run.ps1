Write-Host "Starting Eureka Server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd eureka-server; mvn spring-boot:run"

Start-Sleep -Seconds 15

Write-Host "Starting other services..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd api-gateway; mvn spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd auth-service; mvn spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd driver-service; mvn spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd payment-service; mvn spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ride-service; mvn spring-boot:run"

Write-Host "Starting frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend-app; npm run dev"

Write-Host "All services and frontend started in separate windows."
