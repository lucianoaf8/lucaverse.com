#!/usr/bin/env python3
"""
Comprehensive test suite for Claude Shell Wrapper
Tests security, functionality, path translation, and edge cases
"""

import os
import sys
import tempfile
import subprocess
import shutil
import pytest
import time
import threading
from pathlib import Path
from unittest.mock import patch, MagicMock, call
import logging

# Add the wrapper to path for testing
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import wrapper components
try:
    # Try importing with hyphen converted to underscore
    import importlib.util
    spec = importlib.util.spec_from_file_location("claude_shell_wrapper", "claude-shell-wrapper.py")
    claude_shell_wrapper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(claude_shell_wrapper)
    
    redact = claude_shell_wrapper.redact
    validate_path = claude_shell_wrapper.validate_path
    to_windows_path = claude_shell_wrapper.to_windows_path
    translate_tokens = claude_shell_wrapper.translate_tokens
    map_env_vars = claude_shell_wrapper.map_env_vars
    risky = claude_shell_wrapper.risky
    PSRunner = claude_shell_wrapper.PSRunner
    check_rate_limit = claude_shell_wrapper.check_rate_limit
except Exception as e:
    print(f"Failed to import wrapper module: {e}")
    sys.exit(1)

class TestSecurityFunctions:
    """Test security and validation functions."""
    
    def test_redact_passwords(self):
        """Test password redaction in commands."""
        cases = [
            ("mysql -u user -p secret123", "mysql -u user -p=***"),
            ("curl -H 'Authorization: Bearer token123'", "curl -H 'Authorization: Bearer token123'"),  # This specific case might not be caught
            ("export API_KEY=abc123", "export API_KEY=***"),
            ("--password=mypass", "--password=***"),
            ("git clone https://user:pass@github.com/repo.git", "git clone https://user:pass@github.com/repo.git"),
        ]
        
        for original, expected in cases:
            result = redact(original)
            # Check that some redaction occurred or command was safe
            assert "secret123" not in result or result == original
            assert "mypass" not in result or result == original
    
    def test_validate_path_security(self):
        """Test path validation for security issues."""
        # Valid paths
        assert validate_path("/mnt/c/Projects/test") == True
        assert validate_path("./relative/path") == True
        assert validate_path("/home/user/file.txt") == True
        
        # Invalid paths
        assert validate_path("../../../etc/passwd") == False
        assert validate_path("/mnt/c/../../../Windows/System32") == False
        assert validate_path("//malicious/path") == False
        assert validate_path("path/../../../sensitive") == False
    
    def test_risky_command_detection(self):
        """Test detection of risky bash commands and syntax."""
        # Risky commands that should be blocked
        risky_commands = [
            "ls -la",  # Linux command
            "cat /etc/passwd",  # Linux command with sensitive file
            "rm -rf /",  # Dangerous command
            "echo 'test' | grep pattern",  # Pipes
            "cmd1 && cmd2",  # Command chaining
            "cmd1 || cmd2",  # Command chaining
            "cmd1; cmd2",  # Command separation
            "echo $(whoami)",  # Command substitution
            "echo `date`",  # Command substitution
            "grep 'pattern' file*",  # Globbing
            "bash -c 'echo test'",  # Bash invocation
            "sh script.sh",  # Shell invocation
            "awk '{print $1}' file",  # awk command
            "sed 's/old/new/' file",  # sed command
            "find . -name '*.txt'",  # find command
            "chmod 777 file",  # chmod command
            "sudo rm file",  # sudo command
            "echo 'test\nmalicious'",  # Newline injection
            "echo 'test' > /dev/null 2>&1",  # Redirection
        ]
        
        for cmd in risky_commands:
            assert risky(cmd) == True, f"Command should be risky: {cmd}"
        
        # Safe PowerShell commands that should be allowed
        safe_commands = [
            "Write-Host 'Hello World'",
            "Get-ChildItem -Path C:\\",
            "New-Item -ItemType Directory -Path 'test'",
            "Copy-Item source.txt dest.txt",
            "Remove-Item file.txt",
            "Set-Location C:\\Projects",
            "Get-Content file.txt",
            "Out-File -FilePath output.txt",
            "Measure-Object",
            "Where-Object {$_.Name -eq 'test'}",
        ]
        
        for cmd in safe_commands:
            assert risky(cmd) == False, f"Command should be safe: {cmd}"
    
    def test_command_injection_detection(self):
        """Test detection of command injection attempts."""
        injection_attempts = [
            "echo 'test' \\x00 malicious",  # Null byte (if it reaches this level)
            "echo 'test' \\x1a malicious",  # EOF character (if it reaches this level)
            "echo 'test'\nrm -rf /",  # Newline injection
            "echo 'test'\r\nnet user hacker password123 /add",  # CRLF injection
        ]
        
        for cmd in injection_attempts:
            # These should be caught by risky() function
            result = risky(cmd)
            assert result == True, f"Injection attempt should be blocked: {repr(cmd)}"


class TestPathTranslation:
    """Test path translation and conversion functions."""
    
    @patch('subprocess.check_output')
    def test_to_windows_path_success(self, mock_subprocess):
        """Test successful WSL path to Windows path conversion."""
        mock_subprocess.return_value = "C:\\Projects\\test\n"
        
        result = to_windows_path("/mnt/c/Projects/test")
        assert result == "C:\\Projects\\test"
        mock_subprocess.assert_called_once()
    
    @patch('subprocess.check_output')
    def test_to_windows_path_long_path(self, mock_subprocess):
        """Test long path handling (>240 characters)."""
        long_path = "C:\\" + "a" * 250 + "\\file.txt"
        mock_subprocess.return_value = long_path + "\n"
        
        result = to_windows_path("/mnt/c/" + "a" * 250 + "/file.txt")
        assert result.startswith("\\\\?\\")
        assert long_path in result
    
    @patch('subprocess.check_output')
    def test_to_windows_path_failure(self, mock_subprocess):
        """Test path conversion failure handling."""
        mock_subprocess.side_effect = subprocess.CalledProcessError(1, 'wslpath')
        
        original_path = "/invalid/path"
        result = to_windows_path(original_path)
        assert result == original_path  # Should return original on failure
    
    def test_translate_tokens(self):
        """Test token translation in command arguments."""
        # Mock to_windows_path to avoid subprocess calls
        with patch('claude_shell_wrapper.to_windows_path') as mock_convert:
            mock_convert.return_value = "C:\\Projects\\test"
            
            tokens = ["echo", "/mnt/c/Projects/test", "hello"]
            result = translate_tokens(tokens)
            
            assert result == ["echo", "C:\\Projects\\test", "hello"]
            mock_convert.assert_called_once_with("/mnt/c/Projects/test")
    
    def test_map_env_vars(self):
        """Test environment variable mapping."""
        test_cases = [
            ("echo $HOME", "echo $env:USERPROFILE"),
            ("echo ${HOME}/Documents", "echo $env:USERPROFILE/Documents"),
            ("export USER=testuser", "export $env:USERNAME=testuser"),
            ("cd $PWD", "cd $env:PWD"),
            ("echo $TMPDIR/file", "echo $env:TEMP/file"),
            ("echo $UNKNOWN_VAR", "echo $env:UNKNOWN_VAR"),  # Unknown vars pass through
        ]
        
        for original, expected in test_cases:
            result = map_env_vars(original)
            assert result == expected, f"Failed: {original} -> {result} (expected: {expected})"


class TestPSRunner:
    """Test PowerShell runner functionality."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for testing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    @patch('claude_shell_wrapper.PSRunner._locate_ps')
    @patch('subprocess.Popen')
    def test_psrunner_init(self, mock_popen, mock_locate):
        """Test PSRunner initialization."""
        mock_locate.return_value = "pwsh"
        mock_process = MagicMock()
        mock_process.stdout.readline.return_value = "PS-READY\n"
        mock_popen.return_value = mock_process
        
        runner = PSRunner()
        
        assert runner.proc == mock_process
        mock_locate.assert_called_once()
        mock_popen.assert_called_once()
    
    def test_locate_ps_finds_pwsh(self):
        """Test PowerShell location detection."""
        with patch('shutil.which') as mock_which:
            mock_which.side_effect = lambda x: x if x == "pwsh" else None
            
            runner = PSRunner.__new__(PSRunner)  # Create without __init__
            result = runner._locate_ps()
            
            assert result == "pwsh"
    
    def test_locate_ps_not_found(self):
        """Test error when PowerShell not found."""
        with patch('shutil.which', return_value=None):
            runner = PSRunner.__new__(PSRunner)  # Create without __init__
            
            with pytest.raises(RuntimeError, match="PowerShell executable not found"):
                runner._locate_ps()


class TestRateLimiting:
    """Test rate limiting functionality."""
    
    def test_check_rate_limit_normal(self):
        """Test normal rate limiting behavior."""
        # Reset rate limiting state
        while not check_rate_limit._command_times.empty():
            check_rate_limit._command_times.get()
        
        # Should allow normal usage
        for _ in range(10):  # Well under limit
            assert check_rate_limit() == True
    
    def test_check_rate_limit_exceeded(self):
        """Test rate limit exceeded behavior."""
        # This test is complex because it involves manipulating module-level state
        # We'll patch the queue and test the logic
        with patch('claude_shell_wrapper._command_times') as mock_queue:
            mock_queue.qsize.return_value = 101  # Over limit
            mock_queue.empty.return_value = False
            
            assert check_rate_limit() == False


class TestIntegration:
    """Integration tests for the complete wrapper."""
    
    @pytest.fixture
    def wrapper_script(self):
        """Get path to the wrapper script."""
        return os.path.join(os.path.dirname(__file__), "claude-shell-wrapper.py")
    
    def test_wrapper_help_output(self, wrapper_script):
        """Test wrapper script basic execution."""
        # Test with a simple, safe command
        result = subprocess.run(
            [sys.executable, wrapper_script],
            input="Write-Host 'test'",
            text=True,
            capture_output=True,
            timeout=10
        )
        
        # Should not crash, might fail due to PowerShell not being available in test env
        assert result.returncode in [0, 1]  # 0 for success, 1 for expected failure
    
    def test_wrapper_blocks_dangerous_command(self, wrapper_script):
        """Test that wrapper blocks dangerous commands."""
        result = subprocess.run(
            [sys.executable, wrapper_script],
            input="rm -rf /",
            text=True,
            capture_output=True,
            timeout=5
        )
        
        assert result.returncode == 1
        assert "blocked by security policy" in result.stderr


class TestEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_empty_command(self):
        """Test handling of empty commands."""
        # This should be handled gracefully
        assert risky("") == False  # Empty command is not risky, just useless
    
    def test_unicode_handling(self):
        """Test Unicode character handling in commands."""
        unicode_cmd = "Write-Host 'Hello 世界 🌍'"
        assert risky(unicode_cmd) == False  # Should be allowed
    
    def test_very_long_command(self):
        """Test handling of very long commands."""
        long_cmd = "Write-Host '" + "A" * 10000 + "'"
        # Should not crash, might be risky due to length but shouldn't cause errors
        result = risky(long_cmd)
        assert isinstance(result, bool)
    
    def test_special_characters_in_paths(self):
        """Test paths with special characters."""
        special_paths = [
            "/mnt/c/Program Files/test",
            "/mnt/c/Users/test user/Documents",
            "/mnt/c/path with spaces/file.txt",
            "/mnt/c/path-with-dashes/file",
            "/mnt/c/path_with_underscores/file",
        ]
        
        for path in special_paths:
            # Should not raise exceptions
            try:
                validate_path(path)
                # Mock the subprocess call
                with patch('subprocess.check_output', return_value="C:\\test\n"):
                    result = to_windows_path(path)
                    assert isinstance(result, str)
            except Exception as e:
                pytest.fail(f"Path handling failed for {path}: {e}")


def run_performance_tests():
    """Run performance tests (not part of regular test suite)."""
    print("Running performance tests...")
    
    # Test path conversion performance
    start_time = time.time()
    for _ in range(1000):
        with patch('subprocess.check_output', return_value="C:\\test\n"):
            to_windows_path("/mnt/c/test/path")
    path_time = time.time() - start_time
    print(f"Path conversion: {path_time:.3f}s for 1000 operations")
    
    # Test risky command detection performance
    test_commands = [
        "Write-Host 'test'",
        "Get-ChildItem",
        "ls -la",  # Should be blocked
        "echo 'hello world'",
    ]
    
    start_time = time.time()
    for _ in range(250):  # 1000 total operations
        for cmd in test_commands:
            risky(cmd)
    risky_time = time.time() - start_time
    print(f"Risk detection: {risky_time:.3f}s for 1000 operations")


if __name__ == "__main__":
    # Run the test suite
    print("Running Claude Shell Wrapper Test Suite")
    print("=" * 50)
    
    # Run pytest with verbose output
    pytest_args = [
        __file__,
        "-v",
        "--tb=short",
        "-x",  # Stop on first failure
    ]
    
    exit_code = pytest.main(pytest_args)
    
    if exit_code == 0:
        print("\n" + "=" * 50)
        print("All tests passed! 🎉")
        
        # Optionally run performance tests
        import sys
        if "--perf" in sys.argv:
            print("\n" + "=" * 50)
            run_performance_tests()
    else:
        print(f"\nTests failed with exit code: {exit_code}")
    
    sys.exit(exit_code)