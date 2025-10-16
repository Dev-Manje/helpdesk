# PowerShell backup script for HelpDesk Docker deployment
param(
    [string]$BackupPath = ".\backups",
    [switch]$Restore,
    [string]$RestoreFile,
    [switch]$List,
    [switch]$Clean
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

function Get-Timestamp {
    return Get-Date -Format "yyyyMMdd_HHmmss"
}

function New-BackupDirectory {
    param([string]$Path)
    if (!(Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        Write-ColoredOutput "✓ Created backup directory: $Path" $Green
    }
}

function Backup-MongoDB {
    param([string]$BackupPath)

    Write-ColoredOutput "Backing up MongoDB data..." $Cyan

    $timestamp = Get-Timestamp
    $backupFile = Join-Path $BackupPath "mongodb_backup_$timestamp"

    try {
        # Create backup using mongodump
        docker exec helpdesk_mongodb mongodump --db helpdesk --out /tmp/backup

        # Copy backup from container to host
        docker cp helpdesk_mongodb:/tmp/backup $backupFile

        # Clean up temporary files in container
        docker exec helpdesk_mongodb rm -rf /tmp/backup

        # Compress the backup
        $zipFile = "$backupFile.zip"
        Compress-Archive -Path $backupFile -DestinationPath $zipFile -Force

        # Remove uncompressed backup
        Remove-Item $backupFile -Recurse -Force

        Write-ColoredOutput "✓ MongoDB backup completed: $zipFile" $Green
        return $zipFile
    } catch {
        Write-ColoredOutput "✗ MongoDB backup failed: $($_.Exception.Message)" $Red
        return $null
    }
}

function Backup-Uploads {
    param([string]$BackupPath)

    Write-ColoredOutput "Backing up uploaded files..." $Cyan

    $timestamp = Get-Timestamp
    $backupFile = Join-Path $BackupPath "uploads_backup_$timestamp.zip"

    try {
        # Compress uploads directory
        Compress-Archive -Path ".\backend\uploads\*" -DestinationPath $backupFile -Force
        Write-ColoredOutput "✓ Uploads backup completed: $backupFile" $Green
        return $backupFile
    } catch {
        Write-ColoredOutput "✗ Uploads backup failed: $($_.Exception.Message)" $Red
        return $null
    }
}

function Backup-Environment {
    param([string]$BackupPath)

    Write-ColoredOutput "Backing up environment configuration..." $Cyan

    $timestamp = Get-Timestamp
    $backupFile = Join-Path $BackupPath "env_backup_$timestamp.zip"

    try {
        # Backup environment and configuration files
        $filesToBackup = @(
            ".env",
            "docker-compose.yml",
            "docker-compose.prod.yml",
            "nginx\nginx.conf"
        )

        $tempDir = Join-Path $env:TEMP "helpdesk_env_backup_$timestamp"
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

        foreach ($file in $filesToBackup) {
            if (Test-Path $file) {
                Copy-Item $file $tempDir -Force
            }
        }

        Compress-Archive -Path $tempDir -DestinationPath $backupFile -Force
        Remove-Item $tempDir -Recurse -Force

        Write-ColoredOutput "✓ Environment backup completed: $backupFile" $Green
        return $backupFile
    } catch {
        Write-ColoredOutput "✗ Environment backup failed: $($_.Exception.Message)" $Red
        return $null
    }
}

function Restore-MongoDB {
    param([string]$BackupFile)

    Write-ColoredOutput "Restoring MongoDB data..." $Cyan

    try {
        # Extract backup if it's a zip file
        $extractPath = Join-Path $env:TEMP "mongodb_restore_$(Get-Timestamp)"
        if ($BackupFile -like "*.zip") {
            Expand-Archive -Path $BackupFile -DestinationPath $extractPath -Force
            $backupDir = Get-ChildItem $extractPath | Select-Object -First 1
            $backupSource = Join-Path $extractPath $backupDir.Name
        } else {
            $backupSource = $BackupFile
        }

        # Copy backup to container
        docker cp $backupSource helpdesk_mongodb:/tmp/backup

        # Restore database
        docker exec helpdesk_mongodb mongorestore --db helpdesk --drop /tmp/backup/helpdesk

        # Clean up
        docker exec helpdesk_mongodb rm -rf /tmp/backup
        if (Test-Path $extractPath) {
            Remove-Item $extractPath -Recurse -Force
        }

        Write-ColoredOutput "✓ MongoDB restore completed" $Green
    } catch {
        Write-ColoredOutput "✗ MongoDB restore failed: $($_.Exception.Message)" $Red
        exit 1
    }
}

function Restore-Uploads {
    param([string]$BackupFile)

    Write-ColoredOutput "Restoring uploaded files..." $Cyan

    try {
        # Extract backup to uploads directory
        Expand-Archive -Path $BackupFile -DestinationPath ".\backend\uploads" -Force
        Write-ColoredOutput "✓ Uploads restore completed" $Green
    } catch {
        Write-ColoredOutput "✗ Uploads restore failed: $($_.Exception.Message)" $Red
        exit 1
    }
}

function List-Backups {
    param([string]$BackupPath)

    Write-ColoredOutput "Available backups in $BackupPath :" $Cyan
    Write-ColoredOutput ("-" * 50) $Cyan

    if (!(Test-Path $BackupPath)) {
        Write-ColoredOutput "No backup directory found" $Yellow
        return
    }

    $backups = Get-ChildItem $BackupPath -File | Sort-Object LastWriteTime -Descending

    if ($backups.Count -eq 0) {
        Write-ColoredOutput "No backups found" $Yellow
        return
    }

    foreach ($backup in $backups) {
        $size = [math]::Round($backup.Length / 1MB, 2)
        Write-ColoredOutput ("{0,-40} {1,10}MB {2}" -f $backup.Name, $size, $backup.LastWriteTime.ToString("yyyy-MM-dd HH:mm")) $Green
    }
}

function Clean-OldBackups {
    param([string]$BackupPath, [int]$KeepDays = 30)

    Write-ColoredOutput "Cleaning backups older than $KeepDays days..." $Cyan

    if (!(Test-Path $BackupPath)) {
        Write-ColoredOutput "No backup directory found" $Yellow
        return
    }

    $cutoffDate = (Get-Date).AddDays(-$KeepDays)
    $oldBackups = Get-ChildItem $BackupPath -File | Where-Object { $_.LastWriteTime -lt $cutoffDate }

    if ($oldBackups.Count -eq 0) {
        Write-ColoredOutput "No old backups to clean" $Green
        return
    }

    $totalSize = ($oldBackups | Measure-Object -Property Length -Sum).Sum
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)

    foreach ($backup in $oldBackups) {
        Remove-Item $backup.FullName -Force
        Write-ColoredOutput "Removed: $($backup.Name)" $Yellow
    }

    Write-ColoredOutput "✓ Cleaned up $($oldBackups.Count) old backups, freed ${totalSizeMB}MB" $Green
}

# Main script logic
New-BackupDirectory $BackupPath

if ($List) {
    List-Backups $BackupPath
} elseif ($Clean) {
    Clean-OldBackups $BackupPath
} elseif ($Restore) {
    if (!$RestoreFile) {
        Write-ColoredOutput "✗ Restore file must be specified with -RestoreFile parameter" $Red
        exit 1
    }

    if (!(Test-Path $RestoreFile)) {
        Write-ColoredOutput "✗ Restore file not found: $RestoreFile" $Red
        exit 1
    }

    # Determine backup type and restore
    if ($RestoreFile -like "*mongodb*") {
        Restore-MongoDB $RestoreFile
    } elseif ($RestoreFile -like "*uploads*") {
        Restore-Uploads $RestoreFile
    } else {
        Write-ColoredOutput "✗ Unable to determine backup type from filename" $Red
        exit 1
    }
} else {
    # Create full backup
    Write-ColoredOutput "Starting full backup..." $Cyan
    Write-ColoredOutput ("=" * 50) $Cyan

    $backups = @()

    # Backup MongoDB
    $mongoBackup = Backup-MongoDB $BackupPath
    if ($mongoBackup) { $backups += $mongoBackup }

    # Backup uploads
    $uploadBackup = Backup-Uploads $BackupPath
    if ($uploadBackup) { $backups += $uploadBackup }

    # Backup environment
    $envBackup = Backup-Environment $BackupPath
    if ($envBackup) { $backups += $envBackup }

    Write-ColoredOutput ("=" * 50) $Cyan
    Write-ColoredOutput "Backup Summary:" $Cyan
    foreach ($backup in $backups) {
        Write-ColoredOutput "  ✓ $(Split-Path $backup -Leaf)" $Green
    }

    $totalSize = ($backups | ForEach-Object { Get-Item $_ } | Measure-Object -Property Length -Sum).Sum
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    Write-ColoredOutput "Total backup size: ${totalSizeMB}MB" $Green
    Write-ColoredOutput "✓ Full backup completed successfully!" $Green
}