
Write-Host "Starting IELTS AI Assistant" -ForegroundColor Cyan

docker-compose -f docker-compose.ai.yml up -d

Write-Host "Waiting for services to start" -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "Ensuring IELTS model is available" -ForegroundColor Blue
docker exec ollama-test ollama pull hf.co/Zkare/Chatbot_Ielts_Assistant:F16

Write-Host "IELTS AI Assistant is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Cyan
Write-Host "   - Chat API: http://localhost:8000/chat" -ForegroundColor White
Write-Host "   - API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "   - Health Check: http://localhost:8000/health" -ForegroundColor White
Write-Host ""
Write-Host "Test the API:" -ForegroundColor Yellow
Write-Host 'Invoke-RestMethod -Uri "http://localhost:8000/chat" -Method Post -Headers @{"Content-Type"="application/json"} -Body ''{"message": "What is IELTS?"}''' -ForegroundColor Gray
Write-Host ""
Write-Host "To stop: docker-compose down" -ForegroundColor Red
