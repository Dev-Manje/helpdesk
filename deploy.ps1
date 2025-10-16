# PowerShell deployment script for HelpDesk on Windows
param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Logs,
    [switch]$Build,
    [switch]$Clean,
    [string]$Service
)

$ErrorActionPreference = "Stop"

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"

function Write-ColoredOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Show-Usage {
    Write-ColoredOutput "HelpDesk Docker Deployment Script" $Cyan
    Write-ColoredOutput "Usage: .\deploy.ps1 [options]" $Yellow
    Write-ColoredOutput ""
    Write-ColoredOutput "Options:" $Yellow
    Write-ColoredOutput "  -Start     Start all services"
    Write-ColoredOutput "  -Stop      Stop all services"
    Write-ColoredOutput "  -Restart   Restart all services"
    Write-ColoredOutput "  -Logs      Show logs from all services"
    Write-ColoredOutput "  -Build     Build all Docker images"
    Write-ColoredOutput "  -Clean     Remove all containers and volumes"
    Write-ColoredOutput "  -Service   Specify service name for logs (with -Logs)"
    Write-ColoredOutput ""
    Write-ColoredOutput "Examples:" $Yellow
    Write-ColoredOutput "  .\deploy.ps1 -Start"
    Write-ColoredOutput "  .\deploy.ps1 -Logs -Service backend"
    Write-ColoredOutput "  .\deploy.ps1 -Build"
}

function Check-Docker {
    try {
        $dockerVersion = docker --version 2>$null
        Write-ColoredOutput "✓ Docker is installed: $dockerVersion" $Green
    } catch {
        Write-ColoredOutput "✗ Docker is not installed or not running. Please install Docker Desktop for Windows." $Red
        exit 1
    }

    try {
        $composeVersion = docker-compose --version 2>$null
        Write-ColoredOutput "✓ Docker Compose is available: $composeVersion" $Green
    } catch {
        Write-ColoredOutput "✗ Docker Compose is not available" $Red
        exit 1
    }
}

function Check-EnvironmentFile {
    if (!(Test-Path ".env")) {
        Write-ColoredOutput "⚠ .env file not found. Creating from .env.example..." $Yellow
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-ColoredOutput "✓ Created .env file from .env.example" $Green
            Write-ColoredOutput "⚠ Please edit .env file with your actual configuration values!" $Yellow
        } else {
            Write-ColoredOutput "✗ .env.example file not found!" $Red
            exit 1
        }
    } else {
        Write-ColoredOutput "✓ .env file exists" $Green
    }
}

function Start-Services {
    Write-ColoredOutput "Starting HelpDesk services..." $Cyan

    Check-EnvironmentFile

    try {
        docker-compose up -d
        Write-ColoredOutput "✓ Services started successfully!" $Green
        Write-ColoredOutput ""
        Write-ColoredOutput "Service URLs:" $Cyan
        Write-ColoredOutput "  Frontend: http://localhost:3000" $Green
        Write-ColoredOutput "  Backend API: http://localhost:8000" $Green
        Write-ColoredOutput "  API Docs: http://localhost:8000/docs" $Green
        Write-ColoredOutput ""
        Write-ColoredOutput "To view logs: .\deploy.ps1 -Logs" $Yellow
        Write-ColoredOutput "To stop services: .\deploy.ps1 -Stop" $Yellow
    } catch {
        Write-ColoredOutput "✗ Failed to start services: $($_.Exception.Message)" $Red
        exit 1
    }
}

function Stop-Services {
    Write-ColoredOutput "Stopping HelpDesk services..." $Cyan

    try {
        docker-compose down
        Write-ColoredOutput "✓ Services stopped successfully!" $Green
    } catch {
        Write-ColoredOutput "✗ Failed to stop services: $($_.Exception.Message)" $Red
        exit 1
    }
}

function Restart-Services {
    Write-ColoredOutput "Restarting HelpDesk services..." $Cyan

    Stop-Services
    Start-Services
}

function Show-Logs {
    if ($Service) {
        Write-ColoredOutput "Showing logs for service: $Service" $Cyan
        docker-compose logs -f $Service
    } else {
        Write-ColoredOutput "Showing logs for all services (Ctrl+C to exit)" $Cyan
        docker-compose logs -f
    }
}

function Build-Images {
    Write-ColoredOutput "Building Docker images..." $Cyan

    try {
        docker-compose build --no-cache
        Write-ColoredOutput "✓ Images built successfully!" $Green
    } catch {
        Write-ColoredOutput "✗ Failed to build images: $($_.Exception.Message)" $Red
        exit 1
    }
}

function Clean-Environment {
    Write-ColoredOutput "Cleaning Docker environment..." $Cyan

    try {
        # Stop and remove containers
        docker-compose down -v --remove-orphans

        # Remove images
        docker-compose rm -f

        # Remove dangling images and volumes
        docker image prune -f
        docker volume prune -f

        Write-ColoredOutput "✓ Environment cleaned successfully!" $Green
        Write-ColoredOutput "Note: MongoDB data volume preserved. Use 'docker volume rm helpdesk_mongodb_data' to remove it." $Yellow
    } catch {
        Write-ColoredOutput "✗ Failed to clean environment: $($_.Exception.Message)" $Red
        exit 1
    }
}

# Main script logic
if ($Start) {
    Check-Docker
    Start-Services
} elseif ($Stop) {
    Stop-Services
} elseif ($Restart) {
    Check-Docker
    Restart-Services
} elseif ($Logs) {
    Show-Logs
} elseif ($Build) {
    Check-Docker
    Build-Images
} elseif ($Clean) {
    Clean-Environment
} else {
    Show-Usage
}