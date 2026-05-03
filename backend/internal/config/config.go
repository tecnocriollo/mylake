package config

import (
	"os"
)

type Config struct {
	DatabaseURL  string
	JWTSecret    string
	Port         string
	JupyterURL   string
	JupyterToken string
	OllamaAPIKey string
	RustFSEndpoint  string
	RustFSAccessKey string
	RustFSSecretKey string
	RustFSBucket    string
	RustFSUseSSL    string
}

func Load() *Config {
	return &Config{
		DatabaseURL:  getEnv("DATABASE_URL", "postgres://admin:change-me-locally@localhost:5432/mylake"),
		JWTSecret:    getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		Port:         getEnv("PORT", "8080"),
		JupyterURL:   getEnv("JUPYTER_URL", "http://jupyter:8888"),
		JupyterToken: getEnv("JUPYTER_TOKEN", "mylake-token-123"),
		OllamaAPIKey: getEnv("OLLAMA_API_KEY", ""),
		RustFSEndpoint:  getEnv("RUSTFS_ENDPOINT", "rustfs:9000"),
		RustFSAccessKey: getEnv("RUSTFS_ACCESS_KEY", "mylake-access"),
		RustFSSecretKey: getEnv("RUSTFS_SECRET_KEY", "mylake-secret-key"),
		RustFSBucket:    getEnv("RUSTFS_BUCKET", "lakehouse"),
		RustFSUseSSL:    getEnv("RUSTFS_USE_SSL", "false"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
