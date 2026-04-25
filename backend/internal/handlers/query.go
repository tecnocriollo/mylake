package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"mylake/internal/database"
)

type QueryRequest struct {
	Query string `json:"query" binding:"required"`
}

type QueryHandler struct {
	DB *database.DB
}

func NewQueryHandler(db *database.DB) *QueryHandler {
	return &QueryHandler{DB: db}
}

func (h *QueryHandler) Execute(c *gin.Context) {
	var req QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()
	rows, err := h.DB.Pool.Query(ctx, req.Query)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	// Get column names
	fields := rows.FieldDescriptions()
	columns := make([]string, len(fields))
	for i, f := range fields {
		columns[i] = string(f.Name)
	}

	// Collect results
	var results []map[string]interface{}
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		row := make(map[string]interface{})
		for i, col := range columns {
			row[col] = values[i]
		}
		results = append(results, row)
	}

	c.JSON(http.StatusOK, gin.H{
		"columns": columns,
		"rows":    results,
		"count":   len(results),
	})
}
