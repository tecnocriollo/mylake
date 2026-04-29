package handlers

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	pyCodeEndMarker   = "___MYLAKE_PY_CODE_END___"
	pyOutputEndMarker = "___MYLAKE_PY_OUTPUT_END___"
	pyKernelTimeout   = 60 * time.Second
)

const pythonReplScript = `import sys, traceback
from io import StringIO

CODE_END = "___MYLAKE_PY_CODE_END___"
OUTPUT_END = "___MYLAKE_PY_OUTPUT_END___"

_globals = {"__name__": "__main__"}

sys.stdout.write("READY\n")
sys.stdout.flush()

while True:
    lines = []
    while True:
        line = sys.stdin.readline()
        if not line:
            sys.exit(0)
        line = line.rstrip("\n")
        if line == CODE_END:
            break
        lines.append(line)

    code = "\n".join(lines)
    old_out, old_err = sys.stdout, sys.stderr
    buf = StringIO()
    sys.stdout = sys.stderr = buf

    try:
        exec(compile(code, "<cell>", "exec"), _globals)
        status = "OK"
    except Exception:
        traceback.print_exc()
        status = "ERR"

    output = buf.getvalue()
    sys.stdout = old_out
    sys.stderr = old_err

    sys.stdout.write(status + ":" + output + "\n" + OUTPUT_END + "\n")
    sys.stdout.flush()
`

type pythonKernel struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	reader *bufio.Reader
	mu     sync.Mutex
	dead   chan struct{}
}

var (
	globalPythonKernel *pythonKernel
	pythonKernelMu     sync.Mutex
)

func getOrCreatePythonKernel() (*pythonKernel, error) {
	pythonKernelMu.Lock()
	defer pythonKernelMu.Unlock()

	if globalPythonKernel != nil && globalPythonKernel.isAlive() {
		return globalPythonKernel, nil
	}

	k, err := startPythonKernel()
	if err != nil {
		return nil, err
	}
	globalPythonKernel = k
	return k, nil
}

func startPythonKernel() (*pythonKernel, error) {
	f, err := os.CreateTemp("", "python_repl_*.py")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp script: %w", err)
	}
	scriptPath := f.Name()
	if _, err := f.WriteString(pythonReplScript); err != nil {
		f.Close()
		os.Remove(scriptPath)
		return nil, err
	}
	f.Close()

	cmd := exec.Command("python", "-u", scriptPath)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		os.Remove(scriptPath)
		return nil, err
	}

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		os.Remove(scriptPath)
		return nil, err
	}

	cmd.Stderr = os.Stderr

	k := &pythonKernel{
		cmd:    cmd,
		stdin:  stdin,
		reader: bufio.NewReader(stdoutPipe),
		dead:   make(chan struct{}),
	}

	if err := cmd.Start(); err != nil {
		os.Remove(scriptPath)
		return nil, fmt.Errorf("failed to start Python: %w", err)
	}

	go func() {
		cmd.Wait()
		close(k.dead)
		os.Remove(scriptPath)
	}()

	ready := make(chan error, 1)
	go func() {
		line, err := k.reader.ReadString('\n')
		if err != nil {
			ready <- fmt.Errorf("kernel died during startup: %w", err)
			return
		}
		if strings.TrimSpace(line) == "READY" {
			ready <- nil
		} else {
			ready <- fmt.Errorf("kernel init error: %s", line)
		}
	}()

	select {
	case err := <-ready:
		if err != nil {
			cmd.Process.Kill()
			return nil, err
		}
	case <-time.After(15 * time.Second):
		cmd.Process.Kill()
		return nil, fmt.Errorf("kernel startup timeout")
	}

	return k, nil
}

func (k *pythonKernel) isAlive() bool {
	select {
	case <-k.dead:
		return false
	default:
		return true
	}
}

func (k *pythonKernel) execute(code string) (output string, success bool, err error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	for _, line := range strings.Split(code, "\n") {
		if _, err := fmt.Fprintln(k.stdin, line); err != nil {
			return "", false, fmt.Errorf("write error: %w", err)
		}
	}
	if _, err := fmt.Fprintln(k.stdin, pyCodeEndMarker); err != nil {
		return "", false, fmt.Errorf("write error: %w", err)
	}

	var lines []string
	done := make(chan error, 1)
	go func() {
		for {
			line, err := k.reader.ReadString('\n')
			if err != nil {
				done <- err
				return
			}
			trimmed := strings.TrimRight(line, "\n")
			if trimmed == pyOutputEndMarker {
				done <- nil
				return
			}
			lines = append(lines, trimmed)
		}
	}()

	select {
	case err := <-done:
		if err != nil {
			return "", false, fmt.Errorf("read error: %w", err)
		}
	case <-k.dead:
		return "", false, fmt.Errorf("Python kernel died during execution")
	case <-time.After(pyKernelTimeout):
		return "", false, fmt.Errorf("execution timeout (%s)", pyKernelTimeout)
	}

	full := strings.Join(lines, "\n")
	if strings.HasPrefix(full, "OK:") {
		return strings.TrimPrefix(full, "OK:"), true, nil
	} else if strings.HasPrefix(full, "ERR:") {
		return strings.TrimPrefix(full, "ERR:"), false, nil
	}
	return full, true, nil
}

const marimoURL = "http://marimo:2718"

// ExecuteMarimoRequest represents a code execution request
type ExecuteMarimoRequest struct {
	Code string `json:"code"`
}

// ExecuteMarimoResponse represents the execution response
type ExecuteMarimoResponse struct {
	Success bool     `json:"success"`
	Outputs []string `json:"outputs"`
	Error   string   `json:"error,omitempty"`
}

// MarimoStatus returns Python kernel status
func MarimoStatus(c *gin.Context) {
	pythonKernelMu.Lock()
	alive := globalPythonKernel != nil && globalPythonKernel.isAlive()
	pythonKernelMu.Unlock()

	if alive {
		c.JSON(200, gin.H{"status": "healthy", "message": "Python kernel running"})
	} else {
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Get(marimoURL)
		if err != nil {
			c.JSON(200, gin.H{"status": "idle", "message": "Python kernel not started"})
			return
		}
		defer resp.Body.Close()
		c.JSON(200, gin.H{"status": "idle", "url": marimoURL})
	}
}

// ExecuteMarimo runs Python code in a persistent kernel
func ExecuteMarimo(c *gin.Context) {
	var req ExecuteMarimoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	kernel, err := getOrCreatePythonKernel()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to start Python kernel: " + err.Error()})
		return
	}

	output, success, err := kernel.execute(req.Code)
	if err != nil {
		pythonKernelMu.Lock()
		globalPythonKernel = nil
		pythonKernelMu.Unlock()
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	result := ExecuteMarimoResponse{
		Success: success,
		Outputs: []string{},
	}

	if success {
		if strings.TrimSpace(output) != "" {
			result.Outputs = strings.Split(strings.TrimRight(output, "\n"), "\n")
		}
	} else {
		result.Error = output
	}

	c.JSON(200, result)
}

// ResetPythonKernel kills the current Python kernel
func ResetPythonKernel(c *gin.Context) {
	pythonKernelMu.Lock()
	if globalPythonKernel != nil {
		globalPythonKernel.cmd.Process.Kill()
		globalPythonKernel = nil
	}
	pythonKernelMu.Unlock()
	c.JSON(http.StatusOK, gin.H{"message": "Python kernel reset"})
}
