package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"mylake/internal/database"
)

type HealthHandler struct {
	DB *database.DB
}

func NewHealthHandler(db *database.DB) *HealthHandler {
	return &HealthHandler{DB: db}
}

func (h *HealthHandler) Check(c *gin.Context) {
	ctx := context.Background()
	if err := h.DB.Pool.Ping(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unhealthy",
			"database": "disconnected",
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "healthy",
		"database": "connected",
	})
}
