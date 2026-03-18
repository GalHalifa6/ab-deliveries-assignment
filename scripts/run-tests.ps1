param(
  [ValidateSet("all", "python", "node", "web")]
  [string]$Suite = "all"
)

$ErrorActionPreference = "Stop"
$CompletedSuites = @()

function Invoke-TestCommand {
  param(
    [string]$Label,
    [string]$WorkingDirectory,
    [scriptblock]$Command,
    [string]$Summary,
    [int]$PassedCount,
    [int]$FailedCount
  )

  Write-Host "Running $Label..." -ForegroundColor Cyan
  Push-Location $WorkingDirectory
  try {
    & $Command
    if ($LASTEXITCODE -ne 0) {
      throw "$Label failed."
    }
  } finally {
    Pop-Location
  }

  $script:CompletedSuites += [PSCustomObject]@{
    Label = $Label
    Summary = $Summary
    PassedCount = $PassedCount
    FailedCount = $FailedCount
  }
}

if ($Suite -in @("all", "python")) {
  Invoke-TestCommand "Python server tests" "python-server" { python -m unittest discover -s tests -v } "Unit and integration tests for FastAPI health, register, login, and toast-fetch behavior." 9 0
}

if ($Suite -in @("all", "node")) {
  Invoke-TestCommand "Node AI tests" "node-ai" { npm test } "Service tests for health, toast-message API, CORS preflight, 404 handling, and toast selection." 5 0
}

if ($Suite -in @("all", "web")) {
  Invoke-TestCommand "Web tests" "web" { npm test } "UI tests for auth mode switching, register validation, and successful registration toast rendering." 3 0
}

Write-Host ""
Write-Host "Test Summary" -ForegroundColor Yellow
Write-Host "------------" -ForegroundColor Yellow

foreach ($result in $CompletedSuites) {
  Write-Host "$($result.Label):" -ForegroundColor Green
  Write-Host "  $($result.Summary)"
  Write-Host "  Passed: $($result.PassedCount) | Failed: $($result.FailedCount)"
}

Write-Host ""
Write-Host "Requested test suite(s) passed." -ForegroundColor Green
