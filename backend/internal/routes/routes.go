package routes

import (
	"github.com/gin-gonic/gin"
	"mylake/internal/config"
	"mylake/internal/database"
	"mylake/internal/handlers"
)

func Setup(r *gin.Engine, db *database.DB, cfg *config.Config) {
	// Health check endpoints (no auth required)
	healthHandler := handlers.NewHealthHandler(db)
	r.GET("/api/health", healthHandler.Check)
	r.GET("/health/live", healthHandler.Live)     // Kubernetes liveness
	r.GET("/health/ready", healthHandler.Ready)   // Kubernetes readiness
	r.GET("/health", healthHandler.Check)         // Simple alias

	// Error reporting endpoint (no auth required for frontend errors)
	errorHandler := handlers.NewErrorHandler()
	r.POST("/api/errors", errorHandler.Report)

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
		protected.POST("/lake/files/create", lakeHandler.CreateFile)
		protected.DELETE("/lake/files", lakeHandler.DeleteFile)

		// Error logs endpoint
		protected.GET("/errors/logs", errorHandler.GetLogs)

		// Jupyter notebook endpoints
		jupyterHandler := handlers.NewJupyterHandler(cfg)
		protected.GET("/jupyter/notebooks", jupyterHandler.ListNotebooks)
		protected.GET("/jupyter/notebooks/:path", jupyterHandler.GetNotebook)
		protected.PUT("/jupyter/notebooks/:path", jupyterHandler.SaveNotebook)
		protected.POST("/jupyter/notebooks", jupyterHandler.CreateNotebook)
		protected.DELETE("/jupyter/notebooks/:path", jupyterHandler.DeleteNotebook)
		protected.POST("/jupyter/execute", jupyterHandler.ExecuteCell)
		protected.POST("/jupyter/execute-poll", jupyterHandler.ExecuteCellWithPolling)
		protected.GET("/jupyter/kernels", jupyterHandler.GetKernels)
		protected.Any("/jupyter/proxy/:path", jupyterHandler.ProxyRequest)
	}
}
