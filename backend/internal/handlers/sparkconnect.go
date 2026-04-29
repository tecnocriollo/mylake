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
	codeEndMarker   = "___MYLAKE_CODE_END___"
	outputEndMarker = "___MYLAKE_OUTPUT_END___"
	kernelTimeout   = 120 * time.Second
)

// Python REPL that keeps state (globals) between cell executions
const sparkReplScript = `import sys, traceback
from io import StringIO

CODE_END = "___MYLAKE_CODE_END___"
OUTPUT_END = "___MYLAKE_OUTPUT_END___"

spark = None
_globals = {"__name__": "__main__"}

try:
    from pyspark.sql import SparkSession
    spark = SparkSession.builder \
        .appName("MyLake") \
        .master("local[*]") \
        .config("spark.sql.adaptive.enabled", "true") \
        .config("spark.driver.memory", "1g") \
        .getOrCreate()
    spark.sparkContext.setLogLevel("ERROR")
    _globals["spark"] = spark
    sys.stdout.write("READY\n")
    sys.stdout.flush()
except Exception as e:
    sys.stdout.write("INIT_ERROR:" + str(e) + "\n")
    sys.stdout.flush()
    sys.exit(1)

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

type sparkKernel struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	reader *bufio.Reader
	mu     sync.Mutex
	logMu  sync.Mutex
	logBuf strings.Builder
	dead   chan struct{}
}

var (
	globalKernel *sparkKernel
	kernelMu     sync.Mutex
)

func getOrCreateSparkKernel() (*sparkKernel, error) {
	kernelMu.Lock()
	defer kernelMu.Unlock()

	if globalKernel != nil && globalKernel.isAlive() {
		return globalKernel, nil
	}

	k, err := startSparkKernel()
	if err != nil {
		return nil, err
	}
	globalKernel = k
	return k, nil
}

func startSparkKernel() (*sparkKernel, error) {
	f, err := os.CreateTemp("", "spark_repl_*.py")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp script: %w", err)
	}
	scriptPath := f.Name()
	if _, err := f.WriteString(sparkReplScript); err != nil {
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

	k := &sparkKernel{
		cmd:    cmd,
		stdin:  stdin,
		reader: bufio.NewReader(stdoutPipe),
		dead:   make(chan struct{}),
	}

	// Capture stderr into log buffer
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		os.Remove(scriptPath)
		return nil, err
	}
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := stderrPipe.Read(buf)
			if n > 0 {
				k.logMu.Lock()
				k.logBuf.Write(buf[:n])
				k.logMu.Unlock()
			}
			if err != nil {
				return
			}
		}
	}()

	if err := cmd.Start(); err != nil {
		os.Remove(scriptPath)
		return nil, fmt.Errorf("failed to start Python: %w", err)
	}

	go func() {
		cmd.Wait()
		close(k.dead)
		os.Remove(scriptPath)
	}()

	// Wait for READY signal
	ready := make(chan error, 1)
	go func() {
		line, err := k.reader.ReadString('\n')
		if err != nil {
			ready <- fmt.Errorf("kernel died during startup: %w", err)
			return
		}
		line = strings.TrimSpace(line)
		if line == "READY" {
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
	case <-time.After(60 * time.Second):
		cmd.Process.Kill()
		return nil, fmt.Errorf("kernel startup timeout (60s)")
	}

	return k, nil
}

func (k *sparkKernel) isAlive() bool {
	select {
	case <-k.dead:
		return false
	default:
		return true
	}
}

func (k *sparkKernel) execute(code string) (output string, success bool, err error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	// Send code lines followed by end marker
	for _, line := range strings.Split(code, "\n") {
		if _, err := fmt.Fprintln(k.stdin, line); err != nil {
			return "", false, fmt.Errorf("write error: %w", err)
		}
	}
	if _, err := fmt.Fprintln(k.stdin, codeEndMarker); err != nil {
		return "", false, fmt.Errorf("write error: %w", err)
	}

	// Read response until OUTPUT_END marker
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
			if trimmed == outputEndMarker {
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
		return "", false, fmt.Errorf("Spark kernel died during execution")
	case <-time.After(kernelTimeout):
		return "", false, fmt.Errorf("execution timeout (%s)", kernelTimeout)
	}

	full := strings.Join(lines, "\n")
	if strings.HasPrefix(full, "OK:") {
		return strings.TrimPrefix(full, "OK:"), true, nil
	} else if strings.HasPrefix(full, "ERR:") {
		return strings.TrimPrefix(full, "ERR:"), false, nil
	}
	return full, true, nil
}

func (k *sparkKernel) getLogs() string {
	k.logMu.Lock()
	defer k.logMu.Unlock()
	return k.logBuf.String()
}

// ExecuteSparkRequest represents a Spark Connect execution request
type ExecuteSparkRequest struct {
	Code string `json:"code"`
}

// ExecuteSparkResponse represents a Spark Connect execution response
type ExecuteSparkResponse struct {
	Success bool     `json:"success"`
	Outputs []string `json:"outputs"`
	Error   string   `json:"error,omitempty"`
}

// SparkConnectStatus returns Spark Connect server status
func SparkConnectStatus(c *gin.Context) {
	kernelMu.Lock()
	alive := globalKernel != nil && globalKernel.isAlive()
	kernelMu.Unlock()

	if alive {
		c.JSON(200, gin.H{"status": "healthy", "message": "Spark kernel running"})
	} else {
		c.JSON(200, gin.H{"status": "idle", "message": "Spark kernel not started"})
	}
}

// SparkConnectProxy provides info about Spark Connect
func SparkConnectProxy(c *gin.Context) {
	c.JSON(200, gin.H{
		"status":   "Spark Connect available",
		"endpoint": "local",
		"usage":    "Spark Session local",
	})
}

// ExecuteSparkConnect executes Python code in a persistent Spark kernel
func ExecuteSparkConnect(c *gin.Context) {
	var req ExecuteSparkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	kernel, err := getOrCreateSparkKernel()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to start Spark kernel: " + err.Error()})
		return
	}

	output, success, err := kernel.execute(req.Code)
	if err != nil {
		// Kill dead kernel so next request restarts it
		kernelMu.Lock()
		globalKernel = nil
		kernelMu.Unlock()
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	result := ExecuteSparkResponse{
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

// GetSparkLogs returns the stderr logs from the running Spark kernel
func GetSparkLogs(c *gin.Context) {
	kernelMu.Lock()
	k := globalKernel
	kernelMu.Unlock()

	if k == nil {
		c.JSON(http.StatusOK, gin.H{"message": "No Spark kernel started yet"})
		return
	}

	logs := k.getLogs()
	if logs == "" {
		c.JSON(http.StatusOK, gin.H{"message": "No logs yet"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs})
}

// ResetSparkKernel kills the current kernel (next execution will restart it)
func ResetSparkKernel(c *gin.Context) {
	kernelMu.Lock()
	if globalKernel != nil {
		globalKernel.cmd.Process.Kill()
		globalKernel = nil
	}
	kernelMu.Unlock()
	c.JSON(http.StatusOK, gin.H{"message": "Spark kernel reset"})
}

// indentCode indenta cada línea del código con 4 espacios
func indentCode(code string) string {
	lines := strings.Split(code, "\n")
	var indented []string
	for _, line := range lines {
		if strings.TrimSpace(line) != "" {
			indented = append(indented, "    "+line)
		} else {
			indented = append(indented, "")
		}
	}
	return strings.Join(indented, "\n")
}
