$ErrorActionPreference = "Stop"

$confirmation = Read-Host "Type I_CONFIRM_THIS_IS_A_TEST_DATABASE only for a test-only target"
if ($confirmation -ne "I_CONFIRM_THIS_IS_A_TEST_DATABASE") {
  throw "Seed cancelled; test-target confirmation did not match."
}

$env:DEMO_SEED_CONFIRM_TEST_TARGET = $confirmation
$env:DEMO_SEED_EXPECTED_HOST = Read-Host "Confirmed PostgreSQL hostname"
$env:DEMO_SEED_EXPECTED_DATABASE = Read-Host "Confirmed database name"
$env:DEMO_SEED_DOCTOR_USER_ID = Read-Host "Authorized test doctor user UUID"
$env:DEMO_SEED_PHONE = Read-Host "Controlled test phone (+91XXXXXXXXXX)"

$secureConnection = Read-Host "Test-only PostgreSQL connection URI (input hidden)" -AsSecureString
$connectionPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureConnection)
try {
  $env:DEMO_SEED_DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($connectionPointer)
  Push-Location (Join-Path $PSScriptRoot "..")
  try {
    npm run seed:demo-ledger
    if ($LASTEXITCODE -ne 0) {
      throw "Demo seed failed with exit code $LASTEXITCODE."
    }
  }
  finally {
    Pop-Location
  }
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($connectionPointer)
  $secureConnection.Dispose()
  Remove-Item Env:\DEMO_SEED_DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:\DEMO_SEED_CONFIRM_TEST_TARGET -ErrorAction SilentlyContinue
  Remove-Item Env:\DEMO_SEED_EXPECTED_HOST -ErrorAction SilentlyContinue
  Remove-Item Env:\DEMO_SEED_EXPECTED_DATABASE -ErrorAction SilentlyContinue
  Remove-Item Env:\DEMO_SEED_DOCTOR_USER_ID -ErrorAction SilentlyContinue
  Remove-Item Env:\DEMO_SEED_PHONE -ErrorAction SilentlyContinue
}
