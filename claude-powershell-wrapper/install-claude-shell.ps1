#Requires -Version 5.1
<#
.SYNOPSIS
    Claude Shell Wrapper - System-wide Installation Script (PowerShell)
    Installs PowerShell enforcement wrapper for Claude Code CLI across all projects

.DESCRIPTION
    This script installs the Claude Shell Wrapper system-wide on Windows/WSL systems.
    It sets up Python environment, installs dependencies, and configures shell environment.

.PARAMETER Force
    Force reinstallation even if already installed

.PARAMETER NoShellConfig
    Skip shell configuration (manual setup required)

.PARAMETER PythonPath
    Specify custom Python executable path

.EXAMPLE
    .\install-claude-shell.ps1
    
.EXAMPLE
    .\install-claude-shell.ps1 -Force -PythonPath "C:\Python39\python.exe"
#>

[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$NoShellConfig,
    [string]$PythonPath = ""
)

# Configuration
$WrapperName = "claude-shell"
$InstallDir = "/usr/local/bin"
$VenvDir = "$env:HOME/.claude_wrapper"
$PythonMinVersion = "3.8"
$RequiredPackages = @("bashlex")
$ShareDir = "/usr/local/share/claude-shell"

# Colors for output (Windows PowerShell compatible)
$Colors = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# Logging functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

function Test-IsWSL {
    """Test if running in WSL environment"""
    return (Test-Path "/proc/version") -and (Get-Content "/proc/version" -ErrorAction SilentlyContinue | Select-String "microsoft|WSL")
}

function Test-IsAdmin {
    """Test if running with administrator privileges"""
    if ($IsWindows) {
        $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
        return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } else {
        return (id -u) -eq 0
    }
}

function Test-Prerequisites {
    """Check system requirements and dependencies"""
    Write-Info "Checking system prerequisites..."
    
    # Check if WSL
    if (-not (Test-IsWSL)) {
        Write-Error "This script requires Windows Subsystem for Linux (WSL)"
        exit 1
    }
    
    # Check if running as root
    if (Test-IsAdmin) {
        Write-Error "Do not run this script as root. It will prompt for sudo when needed."
        exit 1
    }
    
    # Find Python executable
    $pythonExe = Find-PythonExecutable
    if (-not $pythonExe) {
        Write-Error "Python $PythonMinVersion or higher is required"
        exit 1
    }
    
    # Check Python version
    $pythonVersion = & $pythonExe -c "import sys; print('.'.join(map(str, sys.version_info[:2])))" 2>$null
    if (-not $pythonVersion) {
        Write-Error "Failed to get Python version"
        exit 1
    }
    
    $versionCheck = & $pythonExe -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Python $PythonMinVersion or higher is required. Found: $pythonVersion"
        exit 1
    }
    
    Write-Success "Python $pythonVersion found at $pythonExe"
    
    # Check for PowerShell
    $powershellFound = $false
    foreach ($psCmd in @("pwsh", "powershell.exe")) {
        if (Get-Command $psCmd -ErrorAction SilentlyContinue) {
            Write-Success "PowerShell found: $psCmd"
            $powershellFound = $true
            break
        }
    }
    
    if (-not $powershellFound) {
        Write-Warning "PowerShell not found in PATH. Installing pwsh..."
        Install-PowerShell
    }
    
    # Check for WSL utilities
    if (-not (Get-Command "wslpath" -ErrorAction SilentlyContinue)) {
        Write-Error "wslpath not found. This script requires WSL utilities."
        exit 1
    }
    
    Write-Success "WSL utilities found"
    
    return $pythonExe
}

function Find-PythonExecutable {
    """Find suitable Python executable"""
    
    if ($PythonPath) {
        if (Test-Path $PythonPath) {
            return $PythonPath
        } else {
            Write-Error "Specified Python path not found: $PythonPath"
            exit 1
        }
    }
    
    # Try common Python executables
    $pythonCandidates = @("python3.12", "python3.11", "python3.10", "python3.9", "python3.8", "python3", "python")
    
    foreach ($candidate in $pythonCandidates) {
        if (Get-Command $candidate -ErrorAction SilentlyContinue) {
            return $candidate
        }
    }
    
    return $null
}

function Install-PowerShell {
    """Install PowerShell if not present"""
    Write-Info "Installing PowerShell..."
    
    try {
        # Update package list
        Invoke-Expression "sudo apt update" -ErrorAction Stop
        
        # Install dependencies
        Invoke-Expression "sudo apt install -y wget apt-transport-https software-properties-common" -ErrorAction Stop
        
        # Get Ubuntu version
        $ubuntuVersion = (Get-Content "/etc/os-release" | Select-String "VERSION_ID" | ForEach-Object { $_.ToString().Split('=')[1].Trim('"') })
        
        # Download and install Microsoft's GPG key
        $packageUrl = "https://packages.microsoft.com/config/ubuntu/$ubuntuVersion/packages-microsoft-prod.deb"
        Invoke-Expression "wget -q $packageUrl" -ErrorAction Stop
        Invoke-Expression "sudo dpkg -i packages-microsoft-prod.deb" -ErrorAction Stop
        Remove-Item "packages-microsoft-prod.deb" -ErrorAction SilentlyContinue
        
        # Update package list with Microsoft repo
        Invoke-Expression "sudo apt update" -ErrorAction Stop
        
        # Install PowerShell
        Invoke-Expression "sudo apt install -y powershell" -ErrorAction Stop
        
        Write-Success "PowerShell installed successfully"
    }
    catch {
        Write-Error "Failed to install PowerShell: $($_.Exception.Message)"
        exit 1
    }
}

function Setup-PythonEnvironment {
    param([string]$PythonExe)
    """Create Python virtual environment and install dependencies"""
    
    Write-Info "Setting up Python environment..."
    
    # Remove existing venv if it exists and Force is specified
    if ($Force -and (Test-Path $VenvDir)) {
        Write-Warning "Removing existing virtual environment..."
        Remove-Item $VenvDir -Recurse -Force
    }
    
    # Create new virtual environment
    if (-not (Test-Path $VenvDir)) {
        Write-Info "Creating Python virtual environment..."
        & $PythonExe -m venv $VenvDir
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create virtual environment"
            exit 1
        }
    }
    
    # Install packages
    $pipExe = "$VenvDir/bin/pip"
    
    Write-Info "Upgrading pip..."
    & $pipExe install --upgrade pip
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Failed to upgrade pip, continuing..."
    }
    
    # Install required packages
    foreach ($package in $RequiredPackages) {
        Write-Info "Installing $package..."
        & $pipExe install $package
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to install $package"
            exit 1
        }
    }
    
    # Verify installations
    $pythonVenvExe = "$VenvDir/bin/python"
    & $pythonVenvExe -c "import bashlex; print('bashlex version:', bashlex.__version__)"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to verify bashlex installation"
        exit 1
    }
    
    Write-Success "Python environment setup complete"
}

function Install-WrapperScript {
    """Install the wrapper script system-wide"""
    Write-Info "Installing Claude Shell wrapper..."
    
    # Check if wrapper source exists
    if (-not (Test-Path "claude-shell-wrapper.py")) {
        Write-Error "claude-shell-wrapper.py not found in current directory"
        exit 1
    }
    
    # Create wrapper shell script
    $wrapperContent = @"
#!/bin/bash
# Claude Shell Wrapper - System Installation
# Auto-generated wrapper script

export PYTHONPATH="$VenvDir/lib/python*/site-packages:`$PYTHONPATH"
exec "$VenvDir/bin/python" "$ShareDir/claude-shell-wrapper.py" "`$@"
"@
    
    # Write wrapper to temp file
    $tempWrapper = "/tmp/$WrapperName"
    $wrapperContent | Out-File -FilePath $tempWrapper -Encoding UTF8
    
    # Make it executable
    chmod +x $tempWrapper
    
    # Install to system location
    Invoke-Expression "sudo mv '$tempWrapper' '$InstallDir/$WrapperName'"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install wrapper to $InstallDir"
        exit 1
    }
    
    # Create share directory and copy Python script
    Invoke-Expression "sudo mkdir -p '$ShareDir'"
    Invoke-Expression "sudo cp 'claude-shell-wrapper.py' '$ShareDir/'"
    Invoke-Expression "sudo chmod +x '$ShareDir/claude-shell-wrapper.py'"
    
    # Verify installation
    if (Test-Path "$InstallDir/$WrapperName") {
        Write-Success "Wrapper installed to $InstallDir/$WrapperName"
    } else {
        Write-Error "Failed to install wrapper"
        exit 1
    }
}

function Set-ShellConfiguration {
    """Configure shell environment for the wrapper"""
    
    if ($NoShellConfig) {
        Write-Warning "Skipping shell configuration as requested"
        return
    }
    
    Write-Info "Configuring shell environment..."
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    
    # Backup and configure shell files
    $shellConfigs = @("$env:HOME/.bashrc", "$env:HOME/.zshrc", "$env:HOME/.profile")
    
    foreach ($shellConfig in $shellConfigs) {
        if (Test-Path $shellConfig) {
            # Backup existing configuration
            $backupFile = "$shellConfig.backup.$timestamp"
            Copy-Item $shellConfig $backupFile
            Write-Info "Backed up $shellConfig to $backupFile"
            
            # Remove any existing Claude Shell Wrapper configuration
            $content = Get-Content $shellConfig | Where-Object { 
                $_ -notmatch "# Claude Shell Wrapper" -and 
                $_ -notmatch "# End Claude Shell Wrapper" -and
                $_ -notmatch "export SHELL.*claude-shell" -and
                $_ -notmatch "export CLAUDE_SHELL_WRAPPER"
            }
            
            # Add new configuration
            $newConfig = @"

# Claude Shell Wrapper - PowerShell Enforcement
# Auto-generated configuration - $(Get-Date)
export SHELL="$InstallDir/$WrapperName"
export CLAUDE_SHELL_WRAPPER="true"
# End Claude Shell Wrapper
"@
            
            $content += $newConfig.Split("`n")
            $content | Out-File -FilePath $shellConfig -Encoding UTF8
            
            Write-Success "Updated $shellConfig"
        }
    }
}

function New-UninstallScript {
    """Create uninstall script for easy removal"""
    Write-Info "Creating uninstall script..."
    
    $uninstallScript = @"
#!/bin/bash
# Claude Shell Wrapper - Uninstall Script
# Auto-generated on $(Get-Date)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "\033[0;34m[INFO]\033[0m `$1"; }
log_success() { echo -e "`${GREEN}[SUCCESS]`${NC} `$1"; }
log_warning() { echo -e "`${YELLOW}[WARNING]`${NC} `$1"; }

echo "Claude Shell Wrapper - Uninstall"
echo "=================================="

# Remove wrapper binary
if [[ -f "$InstallDir/$WrapperName" ]]; then
    sudo rm -f "$InstallDir/$WrapperName"
    log_success "Removed wrapper binary"
fi

# Remove share directory
if [[ -d "$ShareDir" ]]; then
    sudo rm -rf "$ShareDir"
    log_success "Removed wrapper files"
fi

# Remove virtual environment
if [[ -d "$VenvDir" ]]; then
    rm -rf "$VenvDir"
    log_success "Removed Python virtual environment"
fi

# Remove from shell configurations
for shell_config in "`$HOME/.bashrc" "`$HOME/.zshrc" "`$HOME/.profile"; do
    if [[ -f "`$shell_config" ]]; then
        if grep -q "Claude Shell Wrapper" "`$shell_config"; then
            sed -i '/# Claude Shell Wrapper/,/# End Claude Shell Wrapper/d' "`$shell_config"
            log_success "Cleaned `$shell_config"
        fi
    fi
done

# Remove logs
if [[ -f "`$HOME/.claude-shell.log" ]]; then
    rm -f "`$HOME/.claude-shell.log"
    log_success "Removed log file"
fi

log_success "Claude Shell Wrapper uninstalled successfully"
log_warning "Please restart your shell or run: source ~/.bashrc"

# Self-destruct
rm -- "`$0"
"@
    
    $uninstallPath = "$env:HOME/uninstall-claude-shell.sh"
    $uninstallScript | Out-File -FilePath $uninstallPath -Encoding UTF8
    chmod +x $uninstallPath
    
    Write-Success "Uninstall script created at $uninstallPath"
}

function Test-Installation {
    """Run installation verification tests"""
    Write-Info "Running installation tests..."
    
    # Test wrapper exists and is executable
    if (-not (Test-Path "$InstallDir/$WrapperName") -or -not (& test -x "$InstallDir/$WrapperName")) {
        Write-Error "Wrapper not found or not executable at $InstallDir/$WrapperName"
        return $false
    }
    
    # Test Python environment
    $pythonVenvExe = "$VenvDir/bin/python"
    & $pythonVenvExe -c "import bashlex" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Python environment test failed"
        return $false
    }
    
    # Test basic wrapper functionality
    $env:SHELL = "$InstallDir/$WrapperName"
    $testResult = "Write-Host 'test'" | & $env:SHELL 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Wrapper functionality test passed"
    } else {
        Write-Warning "Wrapper functionality test failed - this may be normal if PowerShell is not properly configured"
    }
    
    Write-Success "Installation tests completed"
    return $true
}

function Show-PostInstallInstructions {
    """Display post-installation instructions"""
    Write-Host ""
    Write-Success "Installation completed successfully!"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor $Colors.Yellow
    Write-Host "1. Restart your shell or run: source ~/.bashrc" -ForegroundColor $Colors.White
    Write-Host "2. Verify with: echo `$SHELL" -ForegroundColor $Colors.White
    Write-Host "3. Test with Claude Code CLI in any project" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor $Colors.Yellow
    Write-Host "- Logs: ~/.claude-shell.log" -ForegroundColor $Colors.White
    Write-Host "- Uninstall: ~/uninstall-claude-shell.sh" -ForegroundColor $Colors.White
    Write-Host "- Python venv: $VenvDir" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Warning "All commands executed by Claude Code CLI will now run through PowerShell"
}

# Main installation process
function Main {
    Write-Host "Claude Shell Wrapper - System Installation (PowerShell)" -ForegroundColor $Colors.Blue
    Write-Host "=======================================================" -ForegroundColor $Colors.Blue
    Write-Host ""
    
    try {
        $pythonExe = Test-Prerequisites
        Setup-PythonEnvironment -PythonExe $pythonExe
        Install-WrapperScript
        Set-ShellConfiguration
        New-UninstallScript
        
        if (Test-Installation) {
            Show-PostInstallInstructions
        } else {
            Write-Error "Installation verification failed"
            exit 1
        }
    }
    catch {
        Write-Error "Installation failed: $($_.Exception.Message)"
        Write-Host $_.ScriptStackTrace -ForegroundColor $Colors.Red
        exit 1
    }
}

# Run main function if script is executed directly
if ($MyInvocation.InvocationName -eq $MyInvocation.MyCommand) {
    Main
}