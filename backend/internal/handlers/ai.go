package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

var OllamaAPIKey = os.Getenv("OLLAMA_API_KEY")
var OllamaBaseURL = "https://ollama.com"

// AIChatRequest represents a chat request
type AIChatRequest struct {
	Message        string `json:"message"`
	Context        string `json:"context"`
	Model          string `json:"model"`
	SelectedCellID string `json:"selected_cell_id,omitempty"`
	Mode           string `json:"mode,omitempty"` // "ask" or "edit"
}

// AIChatResponse represents a chat response
type AIChatResponse struct {
	Content string     `json:"content"`
	Actions []AIAction `json:"actions,omitempty"`
}

// AIAction represents an action the AI wants to perform
type AIAction struct {
	Type        string `json:"type"`
	Description string `json:"description"`
	CellType    string `json:"cell_type,omitempty"`
	Code        string `json:"code,omitempty"`
	CellIndex   int    `json:"cell_index,omitempty"`
}

// ListModels returns available Ollama models
func ListModels(c *gin.Context) {
	req, err := http.NewRequest("GET", OllamaBaseURL+"/api/tags", nil)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	req.Header.Set("Authorization", "Bearer "+OllamaAPIKey)

	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return nil
		},
	}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(200, gin.H{
			"models": []string{"qwen2.5-coder:1.5b", "codellama:7b", "llama3:8b"},
		})
		return
	}
	defer resp.Body.Close()

	var result struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		c.JSON(200, gin.H{
			"models": []string{"qwen2.5-coder:1.5b", "codellama:7b", "llama3:8b"},
		})
		return
	}

	var models []string
	for _, m := range result.Models {
		models = append(models, m.Name)
	}

	c.JSON(200, gin.H{"models": models})
}

// AIChat processes a chat message and returns actions
func AIChat(c *gin.Context) {
	var req AIChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Build the system prompt based on mode
	var systemPrompt string
	if req.Mode == "ask" {
		systemPrompt = `You are an AI assistant for a Python notebook environment called MyLake.
Answer the user's questions clearly and concisely. Do NOT output any <ACTION> blocks.

Current notebook context:
` + req.Context
	} else {
		systemPrompt = `You are an AI assistant for a Python notebook environment called MyLake.
You help users write, modify, and understand code in their notebook cells.

When the user asks to modify a cell, add a cell, or explain code, respond with BOTH:
1. A natural language explanation
2. A structured JSON action block

Use this format in your response:

<ACTION>
{
  "type": "add_cell|modify|explain|run",
  "description": "Brief description of what you're doing",
  "cell_type": "code|markdown",
  "code": "the actual code or markdown content"
}
</ACTION>

For "modify" type, the code should be the COMPLETE replacement content for the selected cell.
For "explain" type, cell_type should be "markdown" and code should be the explanation.
For "add_cell" type, provide the new cell content.

Rules:
- Always wrap the JSON in <ACTION> and </ACTION> tags
- The "code" field must contain the FULL content for the cell
- Do not truncate or abbreviate the code
- Use proper escaping for quotes and newlines in JSON

Current notebook context:
` + req.Context
	}

	// Build the user message
	userContent := req.Message
	if req.SelectedCellID != "" {
		userContent += "\n\nSelected cell ID: " + req.SelectedCellID
	}

	// Call Ollama Cloud
	response, err := callOllamaCloud(req.Model, systemPrompt, userContent)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Parse actions only in edit mode
	var actions []AIAction
	if req.Mode != "ask" {
		actions = parseActions(response)
	}

	c.JSON(200, AIChatResponse{
		Content: response,
		Actions: actions,
	})
}

// callOllamaCloud makes a request to Ollama Cloud API
func callOllamaCloud(model, systemPrompt, userContent string) (string, error) {
	// Map common model names to Ollama Cloud models
	modelMappings := map[string]string{
		"qwen2.5-coder:1.5b": "qwen3-coder-next",
		"codellama:7b":       "qwen3-coder-next",
		"llama3:8b":          "qwen3-coder-next",
	}

	if mapped, ok := modelMappings[model]; ok {
		model = mapped
	}

	payload := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": systemPrompt,
			},
			{
				"role":    "user",
				"content": userContent,
			},
		},
		"stream": false,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", OllamaBaseURL+"/api/chat", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+OllamaAPIKey)

	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return nil
		},
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// Log response for debugging
	fmt.Printf("Ollama response status: %d, body: %s\n", resp.StatusCode, string(body))

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("ollama API returned status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return result.Message.Content, nil
}

// parseActions extracts actions from the AI response by looking for <ACTION> blocks
func parseActions(response string) []AIAction {
	var actions []AIAction

	// Look for <ACTION> blocks
	startTag := "<ACTION>"
	endTag := "</ACTION>"

	for {
		startIdx := strings.Index(response, startTag)
		if startIdx == -1 {
			break
		}

		endIdx := strings.Index(response[startIdx:], endTag)
		if endIdx == -1 {
			break
		}

		// Extract JSON content
		jsonStart := startIdx + len(startTag)
		jsonEnd := startIdx + endIdx
		jsonContent := response[jsonStart:jsonEnd]
		jsonContent = strings.TrimSpace(jsonContent)

		// Try to parse the action
		var action AIAction
		if err := json.Unmarshal([]byte(jsonContent), &action); err == nil {
			// Clean up the code (remove extra escaping)
			action.Code = strings.ReplaceAll(action.Code, "\\n", "\n")
			action.Code = strings.ReplaceAll(action.Code, "\\\"", "\"")
			action.Code = strings.ReplaceAll(action.Code, "\\\\", "\\")
			actions = append(actions, action)
		}

		// Remove this action block from response
		response = response[:startIdx] + response[startIdx+endIdx+len(endTag):]
	}

	return actions
}

// SetOllamaAPIKey sets the Ollama API key
func SetOllamaAPIKey(key string) {
	OllamaAPIKey = key
}
