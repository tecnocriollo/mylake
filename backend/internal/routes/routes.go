package routes

import (
	"github.com/gin-gonic/gin"
	"mylake/internal/config"
	"mylake/internal/database"
	"mylake/internal/handlers"
)

func Setup(r *gin.Engine, db *database.DB, cfg *config.Config) {
	// Health check
	healthHandler := handlers.NewHealthHandler(db)
	r.GET("/api/health", healthHandler.Check)

	// Auth routes
	authHandler := handlers.NewAuthHandler(db, cfg)
	r.POST("/api/auth/register", authHandler.Register)
	r.POST("/api/auth/login", authHandler.Login)

	// Protected routes
	protected := r.Group("/api")
	protected.Use(handlers.AuthMiddleware(cfg))
	{
		queryHandler := handlers.NewQueryHandler(db)
		protected.POST("/query", queryHandler.Execute)

		// Lake endpoints
		lakeHandler := handlers.NewLakeHandler(db)
		protected.GET("/lake/schemas", lakeHandler.ListSchemas)
		protected.GET("/lake/files", lakeHandler.ListFiles)
	}
}
