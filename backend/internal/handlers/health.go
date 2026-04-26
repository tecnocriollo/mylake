package handlers

import (
	"context"
	"net/http"
	"time"

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
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check database
	dbStatus := "connected"
	if err := h.DB.Pool.Ping(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":    "unhealthy",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"database":  "disconnected",
			"error":     err.Error(),
		})
		return
	}

	// Check if we can execute a simple query
	var dbVersion string
	if err := h.DB.Pool.QueryRow(ctx, "SELECT version()").Scan(&dbVersion); err != nil {
		dbStatus = "degraded"
		dbVersion = "unknown"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":         "healthy",
		"timestamp":      time.Now().UTC().Format(time.RFC3339),
		"database":       dbStatus,
		"database_version": dbVersion,
		"service":        "mylake-backend",
	})
}

// Simple liveness check - just confirms the server is up
func (h *HealthHandler) Live(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "alive",
		"service": "mylake-backend",
	})
}

// Readiness check - confirms all dependencies are ready
func (h *HealthHandler) Ready(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := h.DB.Pool.Ping(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":    "not_ready",
			"database":  "disconnected",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "ready",
		"database":  "connected",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}
