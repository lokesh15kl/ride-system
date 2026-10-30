Set-Location $PSScriptRoot

Write-Host "Starting Eureka Server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\eureka-server'; java -jar target/eureka-server-1.0-SNAPSHOT.jar"

Start-Sleep -Seconds 10

Write-Host "Starting API Gateway..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\api-gateway'; java -jar target/api-gateway-1.0-SNAPSHOT.jar"

Start-Sleep -Seconds 5

Write-Host "Starting backend microservices..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\auth-service'; java -jar target/auth-service-1.0-SNAPSHOT.jar"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\driver-service'; java -jar target/driver-service-1.0-SNAPSHOT.jar"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\payment-service'; java -jar target/payment-service-1.0-SNAPSHOT.jar"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\ride-service'; java -jar target/ride-service-1.0-SNAPSHOT.jar"

Start-Sleep -Seconds 5

Write-Host "Starting frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend-app'; npm run dev"

Write-Host "All services and frontend started in separate windows."
