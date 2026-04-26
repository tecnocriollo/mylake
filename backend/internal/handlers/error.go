package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type ErrorReport struct {
	Message   string `json:"message"`
	Stack     string `json:"stack,omitempty"`
	URL       string `json:"url"`
	UserAgent string `json:"userAgent"`
	Timestamp string `json:"timestamp"`
}

type ErrorHandler struct {
	logDir string
}

func NewErrorHandler() *ErrorHandler {
	homeDir, _ := os.UserHomeDir()
	logDir := filepath.Join(homeDir, ".openclaw", "logs", "mylake-errors")
	os.MkdirAll(logDir, 0755)
	return &ErrorHandler{logDir: logDir}
}

func (h *ErrorHandler) Report(c *gin.Context) {
	var report ErrorReport
	if err := c.ShouldBindJSON(&report); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid error report"})
		return
	}

	if report.Timestamp == "" {
		report.Timestamp = time.Now().Format(time.RFC3339)
	}

	filename := time.Now().Format("2006-01-02") + ".log"
	logPath := filepath.Join(h.logDir, filename)

	file, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err == nil {
		defer file.Close()
		encoder := json.NewEncoder(file)
		encoder.Encode(report)
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

func (h *ErrorHandler) GetLogs(c *gin.Context) {
	date := c.Query("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	logPath := filepath.Join(h.logDir, date+".log")
	data, err := os.ReadFile(logPath)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"logs": []string{}})
		return
	}

	var logs []string
	for _, line := range strings.Split(string(data), "\n") {
		if line != "" {
			logs = append(logs, line)
		}
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs})
}
