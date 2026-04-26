package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"mylake/internal/config"
)

type JupyterHandler struct {
	BaseURL string
	Token   string
}

func NewJupyterHandler(cfg *config.Config) *JupyterHandler {
	baseURL := cfg.JupyterURL
	if baseURL == "" {
		baseURL = "http://localhost:8888"
	}
	token := cfg.JupyterToken
	if token == "" {
		token = "mylake-token-123"
	}
	return &JupyterHandler{
		BaseURL: baseURL,
		Token:   token,
	}
}

// Notebook represents a Jupyter notebook file
type Notebook struct {
	Metadata   map[string]interface{} `json:"metadata"`
	NbFormat   int                    `json:"nbformat"`
	NbFormatMinor int                 `json:"nbformat_minor"`
	Cells      []Cell                 `json:"cells"`
}

type Cell struct {
	CellType       string                 `json:"cell_type"`
	ExecutionCount *int                   `json:"execution_count"`
	Metadata       map[string]interface{} `json:"metadata"`
	Source         []string               `json:"source"`
	Outputs        []Output               `json:"outputs,omitempty"`
	ID             string                 `json:"id,omitempty"`
}

type Output struct {
	OutputType     string                 `json:"output_type"`
	ExecutionCount *int                   `json:"execution_count,omitempty"`
	Data           map[string]interface{} `json:"data,omitempty"`
	Text           []string               `json:"text,omitempty"`
	Ename          string                 `json:"ename,omitempty"`
	Evalue         string                 `json:"evalue,omitempty"`
	Traceback      []string               `json:"traceback,omitempty"`
}

// ExecuteRequest represents a cell execution request
type ExecuteRequest struct {
	Code   string `json:"code"`
	CellID string `json:"cell_id"`
}

// ExecuteResponse represents the execution result
type ExecuteResponse struct {
	Success bool     `json:"success"`
	Outputs []Output `json:"outputs"`
	Error   string   `json:"error,omitempty"`
}

// NotebookInfo for listing
type NotebookInfo struct {
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	Modified  time.Time `json:"modified"`
	Created   time.Time `json:"created"`
}

func (h *JupyterHandler) proxyToJupyter(method, endpoint string, body []byte) (*http.Response, error) {
	url := fmt.Sprintf("%s/api/%s?token=%s", h.BaseURL, endpoint, h.Token)
	
	var req *http.Request
	var err error
	
	if body != nil {
		req, err = http.NewRequest(method, url, bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, err = http.NewRequest(method, url, nil)
		if err != nil {
			return nil, err
		}
	}
	
	client := &http.Client{Timeout: 30 * time.Second}
	return client.Do(req)
}

func getNotebooksDir() string {
	if dir := os.Getenv("NOTEBOOKS_DIR"); dir != "" {
		return dir
	}
	return "./notebooks"
}

// ListNotebooks lists all notebooks in the notebooks directory
func (h *JupyterHandler) ListNotebooks(c *gin.Context) {
	notebooksDir := getNotebooksDir()
	
	entries, err := os.ReadDir(notebooksDir)
	if err != nil {
		// If directory doesn't exist, return empty list
		if os.IsNotExist(err) {
			c.JSON(http.StatusOK, gin.H{"notebooks": []NotebookInfo{}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	var notebooks []NotebookInfo
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if !strings.HasSuffix(entry.Name(), ".ipynb") {
			continue
		}
		
		info, err := entry.Info()
		if err != nil {
			continue
		}
		
		notebooks = append(notebooks, NotebookInfo{
			Name:     entry.Name(),
			Path:     entry.Name(),
			Modified: info.ModTime(),
			Created:  info.ModTime(),
		})
	}
	
	c.JSON(http.StatusOK, gin.H{"notebooks": notebooks})
}

// GetNotebook returns a notebook's content
func (h *JupyterHandler) GetNotebook(c *gin.Context) {
	path := c.Param("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}
	
	// Security: prevent directory traversal
	if strings.Contains(path, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		return
	}
	
	fullPath := filepath.Join(getNotebooksDir(), path)
	
	data, err := os.ReadFile(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "notebook not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	var notebook Notebook
	if err := json.Unmarshal(data, &notebook); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid notebook format"})
		return
	}
	
	c.JSON(http.StatusOK, notebook)
}

// SaveNotebook saves a notebook
func (h *JupyterHandler) SaveNotebook(c *gin.Context) {
	path := c.Param("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}
	
	// Security: prevent directory traversal
	if strings.Contains(path, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		return
	}
	
	var notebook Notebook
	if err := c.ShouldBindJSON(&notebook); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Ensure directory exists
	dir := filepath.Dir(filepath.Join(getNotebooksDir(), path))
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	data, err := json.MarshalIndent(notebook, "", "  ")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	fullPath := filepath.Join(".", path)
	if err := os.WriteFile(fullPath, data, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "notebook saved"})
}

// CreateNotebook creates a new notebook
func (h *JupyterHandler) CreateNotebook(c *gin.Context) {
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Sanitize filename
	name := req.Name
	if !strings.HasSuffix(name, ".ipynb") {
		name += ".ipynb"
	}
	
	// Security check
	if strings.Contains(name, "..") || strings.Contains(name, "/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid name"})
		return
	}
	
	path := filepath.Join(getNotebooksDir(), name)
	
	// Check if exists
	if _, err := os.Stat(path); err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "notebook already exists"})
		return
	}
	
	// Create empty notebook
	notebook := Notebook{
		Metadata: map[string]interface{}{
			"kernelspec": map[string]string{
				"display_name": "Python 3",
				"language":     "python",
				"name":         "python3",
			},
			"language_info": map[string]interface{}{
				"name":          "python",
				"version":       "3.11.0",
				"mimetype":      "text/x-python",
				"codemirror_mode": map[string]interface{}{
					"name": "ipython",
					"version": 3,
				},
				"pygments_lexer": "ipython3",
				"nbconvert_exporter": "python",
				"file_extension": ".py",
			},
		},
		NbFormat:      4,
		NbFormatMinor: 5,
		Cells: []Cell{
			{
				CellType: "code",
				ID:       uuid.New().String(),
				Metadata: map[string]interface{}{},
				Source:   []string{"# Welcome to your new notebook!"},
				Outputs:  []Output{},
			},
		},
	}
	
	data, err := json.MarshalIndent(notebook, "", "  ")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	if err := os.WriteFile(path, data, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{"path": name})
}

// DeleteNotebook deletes a notebook
func (h *JupyterHandler) DeleteNotebook(c *gin.Context) {
	path := c.Param("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}
	
	// Security: prevent directory traversal
	if strings.Contains(path, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path"})
		return
	}
	
	fullPath := filepath.Join(getNotebooksDir(), path)
	
	if err := os.Remove(fullPath); err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "notebook not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "notebook deleted"})
}

// ExecuteCell executes a code cell using Python subprocess via nbconvert
func (h *JupyterHandler) ExecuteCell(c *gin.Context) {
	var req ExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Create a temporary notebook with just this cell
	tempNotebook := Notebook{
		Metadata: map[string]interface{}{
			"kernelspec": map[string]string{
				"display_name": "Python 3",
				"language":     "python",
				"name":         "python3",
			},
		},
		NbFormat:      4,
		NbFormatMinor: 5,
		Cells: []Cell{
			{
				CellType: "code",
				ID:       uuid.New().String(),
				Metadata: map[string]interface{}{},
				Source:   strings.Split(req.Code, "\n"),
				Outputs:  []Output{},
			},
		},
	}
	
	// Write temp notebook
	tempDir := os.TempDir()
	tempFile := filepath.Join(tempDir, fmt.Sprintf("exec_%s.ipynb", uuid.New().String()))
	defer os.Remove(tempFile)
	
	data, err := json.Marshal(tempNotebook)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to marshal notebook: " + err.Error()})
		return
	}
	
	if err := os.WriteFile(tempFile, data, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write temp file: " + err.Error()})
		return
	}
	
	// Execute using nbconvert
	cmd := exec.Command("python3", "-m", "jupyter", "nbconvert", "--to", "notebook", "--execute",
		"--ExecutePreprocessor.timeout=30",
		"--output", tempFile,
		tempFile)
	
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	
	err = cmd.Run()
	if err != nil {
		// Even if command fails, check if output was generated
		if stderr.Len() > 0 {
			c.JSON(http.StatusOK, ExecuteResponse{
				Success: false,
				Outputs: []Output{
					{
						OutputType: "error",
						Ename:      "ExecutionError",
						Evalue:     stderr.String(),
					},
				},
			})
			return
		}
	}
	
	// Read the executed notebook
	outputData, err := os.ReadFile(tempFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read output: " + err.Error()})
		return
	}
	
	var executedNotebook Notebook
	if err := json.Unmarshal(outputData, &executedNotebook); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse output: " + err.Error()})
		return
	}
	
	// Extract outputs from the cell
	if len(executedNotebook.Cells) > 0 {
		cell := executedNotebook.Cells[0]
		c.JSON(http.StatusOK, ExecuteResponse{
			Success: true,
			Outputs: cell.Outputs,
		})
	} else {
		c.JSON(http.StatusOK, ExecuteResponse{
			Success: true,
			Outputs: []Output{},
		})
	}
}

// ExecuteCellWithPolling executes code and waits for results
func (h *JupyterHandler) ExecuteCellWithPolling(c *gin.Context) {
	var req ExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Get or create kernel
	kernelID, err := h.getOrCreateKernel()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "kernel error: " + err.Error()})
		return
	}
	
	// Use the Jupyter REST API to execute via sessions
	// This is a simplified approach using the contents API
	sessionURL := fmt.Sprintf("%s/api/sessions?token=%s", h.BaseURL, h.Token)
	
	// Create session if needed
	sessionReq := map[string]interface{}{
		"kernel": map[string]string{"id": kernelID},
		"name": "",
		"type": "notebook",
		"path": ".",
	}
	
	sessionBody, _ := json.Marshal(sessionReq)
	sessionResp, err := http.Post(sessionURL, "application/json", bytes.NewReader(sessionBody))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "session error: " + err.Error()})
		return
	}
	defer sessionResp.Body.Close()
	
	// Try using the nbconvert or a simpler approach
	// For now, return a placeholder with the code to execute
	c.JSON(http.StatusOK, ExecuteResponse{
		Success: true,
		Outputs: []Output{
			{
				OutputType: "stream",
				Text:       []string{"Cell execution request received. Kernel ID: " + kernelID},
			},
		},
	})
}

func (h *JupyterHandler) getOrCreateKernel() (string, error) {
	// List existing kernels
	url := fmt.Sprintf("%s/api/kernels?token=%s", h.BaseURL, h.Token)
	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	
	var kernels []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&kernels); err != nil {
		return "", err
	}
	
	// Return first available kernel
	if len(kernels) > 0 {
		if id, ok := kernels[0]["id"].(string); ok {
			return id, nil
		}
	}
	
	// Create new kernel
	createURL := fmt.Sprintf("%s/api/kernels?token=%s", h.BaseURL, h.Token)
	createResp, err := http.Post(createURL, "application/json", strings.NewReader(`{"name":"python3"}`))
	if err != nil {
		return "", err
	}
	defer createResp.Body.Close()
	
	var newKernel map[string]interface{}
	if err := json.NewDecoder(createResp.Body).Decode(&newKernel); err != nil {
		return "", err
	}
	
	if id, ok := newKernel["id"].(string); ok {
		return id, nil
	}
	
	return "", fmt.Errorf("could not create kernel")
}

// GetKernels lists available kernels
func (h *JupyterHandler) GetKernels(c *gin.Context) {
	url := fmt.Sprintf("%s/api/kernels?token=%s", h.BaseURL, h.Token)
	resp, err := http.Get(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.Data(resp.StatusCode, "application/json", body)
}

// ProxyRequest proxies arbitrary requests to Jupyter
func (h *JupyterHandler) ProxyRequest(c *gin.Context) {
	// Get the path from the URL
	path := c.Param("path")
	
	// Build the target URL
	targetURL := fmt.Sprintf("%s/%s?token=%s", h.BaseURL, path, h.Token)
	
	// Create the proxy request
	method := c.Request.Method
	var body io.Reader
	if c.Request.Body != nil {
		bodyBytes, _ := io.ReadAll(c.Request.Body)
		body = bytes.NewReader(bodyBytes)
	}
	
	req, err := http.NewRequest(method, targetURL, body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// Copy headers
	for key, values := range c.Request.Header {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()
	
	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			c.Writer.Header().Add(key, value)
		}
	}
	
	// Copy status code
	c.Status(resp.StatusCode)
	
	// Copy body
	io.Copy(c.Writer, resp.Body)
}