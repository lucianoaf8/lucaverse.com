#!/usr/bin/env python3
"""
claude-shell: PowerShell enforcement wrapper for Claude Code CLI
Intercepts every Claude Code CLI command, rewrites & runs it in PowerShell.
Version: 1.1.0 - Enhanced with security fixes and robustness improvements
"""

import os
import sys
import re
import shlex
import subprocess
import signal
import logging
import json
import pathlib
import hashlib
import shutil
import time
from typing import Tuple, List, Optional
import threading
import queue

try:
    import bashlex  # pip install bashlex
except ImportError:
    print("ERROR: bashlex not installed. Run: pip install bashlex", file=sys.stderr)
    sys.exit(1)

# ---------- CONFIG ----------------------------------------------------------
DENY_REGEX = re.compile(
    r'''([\r\n]|;|\|\||&&|<\(|<<|[<>]{1,2}|[`$]\(|\{.*\}|[*?]|[^\\]"[^"]*[*?]|\.\./)|
        \b(bash|zsh|sh|awk|sed|grep|ls|cat|chmod|find|rm|dd|su|sudo|passwd)\b''',
    re.X | re.IGNORECASE)

ENV_MAP = {
    "HOME": "USERPROFILE", 
    "USER": "USERNAME", 
    "PWD": "PWD",
    "PATH": "PATH",
    "TMPDIR": "TEMP",
    "TMP": "TEMP"
}

LOGFILE = os.path.expanduser("~/.claude-shell.log")
USE_LONG_PS = True  # persistent PowerShell session
MAX_COMMAND_RATE = 100  # commands per minute
PROCESS_HEALTH_CHECK_INTERVAL = 30  # seconds
# ---------------------------------------------------------------------------

# Setup logging with rotation
logging.basicConfig(
    filename=LOGFILE,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    filemode='a'
)

# Rate limiting
_command_times = queue.Queue()
_rate_lock = threading.Lock()

def redact(cmd: str) -> str:
    """Redact sensitive information from commands before logging."""
    patterns = [
        r'(?i)(password|token|secret|api_key|auth|credential)[\s=:]+\S+',
        r'(?i)-p\s+\S+',  # -p password
        r'(?i)--password[\s=]\S+',
    ]
    result = cmd
    for pattern in patterns:
        result = re.sub(pattern, r'\1=***', result)
    return result

def check_rate_limit() -> bool:
    """Check if command rate limit is exceeded."""
    with _rate_lock:
        now = time.time()
        # Remove old entries
        while not _command_times.empty():
            if now - _command_times.queue[0] > 60:  # 1 minute window
                _command_times.get()
            else:
                break
        
        if _command_times.qsize() >= MAX_COMMAND_RATE:
            return False
        
        _command_times.put(now)
        return True

# ---------- PATH & VAR CONVERSION ------------------------------------------
def validate_path(path: str) -> bool:
    """Validate path for security (no traversal, etc.)."""
    if '..' in path or path.startswith('//'):
        return False
    return True

def to_windows_path(p: str) -> str:
    """Best-effort WSL → Windows path conversion with validation."""
    if not validate_path(p):
        raise ValueError(f"Invalid path detected: {p}")
    
    try:
        out = subprocess.check_output(
            ["wslpath", "-w", p], 
            text=True, 
            stderr=subprocess.DEVNULL,
            timeout=5
        ).strip()
        
        if len(out) >= 240:  # long path guard
            out = r"\\?\{}".format(out.replace('/', '\\'))
        return out
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        logging.warning(f"Path conversion failed for: {p}")
        return p

def translate_tokens(tokens: List[str]) -> List[str]:
    """Convert WSL paths in command tokens to Windows paths."""
    converted = []
    for tok in tokens:
        try:
            if tok.startswith("/mnt/") or (tok.startswith("/") and "/" in tok[1:]):
                converted.append(to_windows_path(tok))
            else:
                converted.append(tok)
        except ValueError as e:
            logging.error(f"Path validation failed: {e}")
            raise
    return converted

def map_env_vars(cmd: str) -> str:
    """Map Linux environment variables to Windows equivalents."""
    def repl(m):
        key = m.group(1) or m.group(2)
        mapped_key = ENV_MAP.get(key, key)
        return f"$env:{mapped_key}"
    
    return re.sub(r'\$(\w+)|\${(\w+)}', repl, cmd)

# ---------- SECURITY / VALIDATION ------------------------------------------
def risky(cmd: str) -> bool:
    """Check if command contains risky patterns or syntax."""
    # Check deny patterns
    if DENY_REGEX.search(cmd):
        logging.warning(f"Command blocked by regex: {redact(cmd)}")
        return True
    
    # Check for command injection attempts
    if any(char in cmd for char in ['\0', '\x1a']):  # null bytes, EOF
        logging.warning(f"Command blocked - null bytes detected: {redact(cmd)}")
        return True
    
    try:
        # Deep parse with bashlex
        tree = bashlex.parse(cmd)
        for node in bashlex.ast.walk(tree):
            # Block complex bash structures
            if node.get('kind') in ['pipeline', 'list', 'compound', 'function', 'for', 'while', 'if']:
                logging.warning(f"Command blocked - complex syntax: {redact(cmd)}")
                return True
    except bashlex.errors.ParsingError as e:
        logging.warning(f"Command blocked - parse error: {redact(cmd)} - {e}")
        return True
    
    return False

# ---------- PERSISTENT POWERSHELL ------------------------------------------
class PSRunner:
    """Persistent PowerShell session manager with health monitoring."""
    
    def __init__(self):
        self.proc: Optional[subprocess.Popen] = None
        self.cwd = pathlib.Path.home()
        self._start_process()
        self._last_health_check = time.time()
        
    def _locate_ps(self) -> str:
        """Find PowerShell executable."""
        candidates = [
            "pwsh",
            "powershell.exe",
            "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe",
            "/mnt/c/Program Files/PowerShell/7/pwsh.exe"
        ]
        
        for cand in candidates:
            if shutil.which(cand):
                logging.info(f"Found PowerShell: {cand}")
                return cand
        
        raise RuntimeError("PowerShell executable not found. Install pwsh or ensure powershell.exe is accessible.")

    def _start_process(self):
        """Start or restart PowerShell process."""
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            self.proc.wait(timeout=5)
        
        exe = self._locate_ps()
        
        # Enhanced PowerShell startup with UTF-8 and error handling
        startup_cmd = (
            "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; "
            "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; "
            "$OutputEncoding = [System.Text.Encoding]::UTF8; "
            "$PSDefaultParameterValues['*:Encoding'] = 'utf8'; "
            "Write-Host 'PS-READY'"
        )
        
        self.proc = subprocess.Popen(
            [exe, "-NoLogo", "-NoProfile", "-NoExit", "-Command", startup_cmd + "; -"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=0,  # Unbuffered for real-time interaction
            encoding='utf-8',
            errors='replace'
        )
        
        # Wait for ready signal
        try:
            ready_line = self.proc.stdout.readline()
            if "PS-READY" not in ready_line:
                raise RuntimeError(f"PowerShell startup failed: {ready_line}")
        except Exception as e:
            raise RuntimeError(f"PowerShell initialization error: {e}")
        
        # Setup signal handling
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        logging.info("PowerShell process started successfully")

    def _signal_handler(self, signum, _frame):
        """Forward signals to PowerShell process."""
        if self.proc and self.proc.poll() is None:
            logging.info(f"Forwarding signal {signum} to PowerShell")
            try:
                self.proc.send_signal(signum)
            except ProcessLookupError:
                pass

    def _health_check(self) -> bool:
        """Check if PowerShell process is healthy."""
        now = time.time()
        if now - self._last_health_check < PROCESS_HEALTH_CHECK_INTERVAL:
            return True
        
        self._last_health_check = now
        
        if not self.proc or self.proc.poll() is not None:
            logging.warning("PowerShell process died, restarting...")
            try:
                self._start_process()
                return True
            except Exception as e:
                logging.error(f"Failed to restart PowerShell: {e}")
                return False
        
        # Test with simple command
        try:
            test_result = self._execute_command("Write-Host 'health-check'")
            return test_result[0] == 0 and 'health-check' in test_result[1]
        except Exception as e:
            logging.warning(f"Health check failed: {e}")
            return False

    def _sync_working_directory(self):
        """Sync working directory with PowerShell session."""
        try:
            pwd_result = self._execute_command("Get-Location | Select-Object -ExpandProperty Path")
            if pwd_result[0] == 0:
                ps_cwd = pwd_result[1].strip()
                if ps_cwd and pathlib.Path(ps_cwd).exists():
                    self.cwd = pathlib.Path(ps_cwd)
        except Exception as e:
            logging.warning(f"Failed to sync working directory: {e}")

    def _execute_command(self, cmd: str, timeout: int = 30) -> Tuple[int, str, str]:
        """Execute command in PowerShell with timeout."""
        if not self.proc or self.proc.poll() is not None:
            raise RuntimeError("PowerShell process not available")
        
        # Prepare command with directory context and exit code capture
        full_cmd = (
            f'Set-Location -LiteralPath "{self.cwd}"; '
            f'try {{ {cmd} }} catch {{ Write-Error $_.Exception.Message; exit 1 }}; '
            f'Write-Host "EXIT-CODE:$LASTEXITCODE"'
        )
        
        try:
            self.proc.stdin.write(full_cmd + "\n")
            self.proc.stdin.flush()
        except BrokenPipeError:
            raise RuntimeError("PowerShell stdin pipe broken")
        
        stdout_lines = []
        stderr_lines = []
        exit_code = 0
        start_time = time.time()
        
        # Read output with timeout
        while time.time() - start_time < timeout:
            try:
                # Non-blocking read with small timeout
                line = self.proc.stdout.readline()
                if not line:
                    time.sleep(0.1)
                    continue
                
                if line.startswith("EXIT-CODE:"):
                    try:
                        exit_code = int(line.split(":")[1].strip())
                    except (ValueError, IndexError):
                        exit_code = 1
                    break
                
                stdout_lines.append(line)
                
            except Exception as e:
                logging.error(f"Error reading PowerShell output: {e}")
                break
        else:
            # Timeout reached
            logging.warning(f"Command timeout after {timeout}s: {redact(cmd)}")
            exit_code = 124  # Timeout exit code
        
        # Read any remaining stderr
        try:
            # Non-blocking stderr read
            while True:
                try:
                    stderr_line = self.proc.stderr.readline()
                    if not stderr_line:
                        break
                    stderr_lines.append(stderr_line)
                except:
                    break
        except:
            pass
        
        stdout = ''.join(stdout_lines)
        stderr = ''.join(stderr_lines)
        
        return exit_code, stdout, stderr

    def run(self, cmd: str) -> Tuple[int, str, str]:
        """Run command with health check and recovery."""
        if not check_rate_limit():
            logging.error("Rate limit exceeded")
            return 1, "", "ERROR: Command rate limit exceeded\n"
        
        if not self._health_check():
            return 1, "", "ERROR: PowerShell process unhealthy\n"
        
        try:
            result = self._execute_command(cmd)
            self._sync_working_directory()
            return result
        except Exception as e:
            logging.error(f"Command execution failed: {e}")
            # Try to restart and retry once
            try:
                self._start_process()
                result = self._execute_command(cmd)
                return result
            except Exception as retry_e:
                logging.error(f"Retry failed: {retry_e}")
                return 1, "", f"ERROR: Command execution failed: {str(e)}\n"

    def __del__(self):
        """Cleanup PowerShell process."""
        if self.proc and self.proc.poll() is None:
            try:
                self.proc.terminate()
                self.proc.wait(timeout=5)
            except:
                try:
                    self.proc.kill()
                except:
                    pass

# ---------- MAIN FLOW -------------------------------------------------------
def main() -> None:
    """Main wrapper entry point."""
    # Setup
    try:
        os.makedirs(os.path.dirname(LOGFILE), exist_ok=True)
        
        # Capture raw command
        if len(sys.argv) > 1:
            raw = ' '.join(sys.argv[1:])
        else:
            try:
                raw = sys.stdin.readline().strip()
            except (EOFError, KeyboardInterrupt):
                sys.exit(0)
        
        if not raw:
            sys.exit(0)
        
        logging.info(f"CMD: {redact(raw)}")
        
        # Security validation
        if risky(raw):
            sys.stderr.write("❌ Command blocked by security policy.\n")
            sys.exit(1)
        
        # Parse and convert
        try:
            tokens = shlex.split(raw, posix=True)
            tokens = translate_tokens(tokens)
            cmd = map_env_vars(' '.join(tokens))
            
            # Re-quote for Windows PowerShell
            cmd_win = subprocess.list2cmdline(tokens)
            
        except Exception as e:
            logging.error(f"Command parsing failed: {e}")
            sys.stderr.write(f"❌ Command parsing error: {str(e)}\n")
            sys.exit(1)
        
        # Execute
        try:
            if USE_LONG_PS:
                if not hasattr(main, '_runner'):
                    main._runner = PSRunner()
                runner = main._runner
            else:
                runner = PSRunner()
            
            rc, out, err = runner.run(cmd_win)
            
            # Output results
            if out:
                sys.stdout.write(out)
                sys.stdout.flush()
            if err:
                sys.stderr.write(err)
                sys.stderr.flush()
            
            logging.info(f"CMD result: rc={rc}")
            sys.exit(rc)
            
        except Exception as e:
            logging.error(f"Execution failed: {e}")
            sys.stderr.write(f"❌ Execution error: {str(e)}\n")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logging.info("Interrupted by user")
        sys.exit(130)
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        sys.stderr.write(f"❌ Unexpected error: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()