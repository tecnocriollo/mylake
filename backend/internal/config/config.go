package config

import (
	"os"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	JupyterURL  string
	JupyterToken string
}

func Load() *Config {
	return &Config{
		DatabaseURL:  getEnv("DATABASE_URL", "postgres://admin:change-me-locally@localhost:5432/mylake"),
		JWTSecret:    getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		Port:         getEnv("PORT", "8080"),
		JupyterURL:   getEnv("JUPYTER_URL", "http://207.180.223.160:8888"),
		JupyterToken: getEnv("JUPYTER_TOKEN", "mylake-token-123"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
