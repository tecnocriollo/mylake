package handlers

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"mylake/internal/database"
)

type LakeItem struct {
	Name     string     `json:"name"`
	Type     string     `json:"type"` // "folder", "table", "file"
	Path     string     `json:"path"`
	Schema   string     `json:"schema,omitempty"`
	Format   string     `json:"format,omitempty"`
	Size     int64      `json:"size,omitempty"`
	Children []LakeItem `json:"children,omitempty"`
}

type CreateFileRequest struct {
	Type string `json:"type" binding:"required"` // "folder", "python", "notebook"
	Path string `json:"path"`                    // parent folder path
	Name string `json:"name" binding:"required"`
}

type DeleteFileRequest struct {
	Path string `json:"path" binding:"required"`
}

type LakeHandler struct {
	DB *database.DB
}

func NewLakeHandler(db *database.DB) *LakeHandler {
	return &LakeHandler{DB: db}
}

// ListSchemas devuelve todos los esquemas y tablas de PostgreSQL
func (h *LakeHandler) ListSchemas(c *gin.Context) {
	ctx := context.Background()

	// Obtener schemas
	schemaQuery := `
		SELECT schema_name 
		FROM information_schema.schemata 
		WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
		ORDER BY schema_name
	`
	schemaRows, err := h.DB.Pool.Query(ctx, schemaQuery)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer schemaRows.Close()

	var schemas []LakeItem
	for schemaRows.Next() {
		var schemaName string
		if err := schemaRows.Scan(&schemaName); err != nil {
			continue
		}

		schema := LakeItem{
			Name: schemaName,
			Type: "schema",
			Path: schemaName,
		}

		// Obtener tablas del schema
		tableQuery := `
			SELECT table_name, table_type 
			FROM information_schema.tables 
			WHERE table_schema = $1
			ORDER BY table_name
		`
		tableRows, err := h.DB.Pool.Query(ctx, tableQuery, schemaName)
		if err != nil {
			continue
		}

		for tableRows.Next() {
			var tableName, tableType string
			if err := tableRows.Scan(&tableName, &tableType); err != nil {
				continue
			}
			
			itemType := "table"
			if tableType == "VIEW" {
				itemType = "view"
			}

			schema.Children = append(schema.Children, LakeItem{
				Name:   tableName,
				Type:   itemType,
				Path:   schemaName + "." + tableName,
				Schema: schemaName,
			})
		}
		tableRows.Close()

		schemas = append(schemas, schema)
	}

	c.JSON(http.StatusOK, LakeItem{
		Type:     "database",
		Name:     "PostgreSQL",
		Children: schemas,
	})
}

// ListFiles devuelve archivos del workspace de Jupyter
func (h *LakeHandler) ListFiles(c *gin.Context) {
	basePath := "/home/jovyan/work"
	
	// Asegurar que existe
	os.MkdirAll(basePath, 0755)

	items := listDirectory(basePath, "")
	
	c.JSON(http.StatusOK, LakeItem{
		Type:     "folder",
		Name:     "Workspace",
		Path:     "/",
		Children: items,
	})
}

// CreateFile crea carpetas, scripts Python o notebooks
func (h *LakeHandler) CreateFile(c *gin.Context) {
	var req CreateFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	basePath := "/home/jovyan/work"
	fullPath := filepath.Join(basePath, req.Path, req.Name)
	
	// Security: prevent directory traversal
	if !isSubPath(fullPath, basePath) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid path"})
		return
	}

	switch req.Type {
	case "folder":
		if err := os.MkdirAll(fullPath, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

	case "python":
		// Ensure .py extension
		if filepath.Ext(req.Name) != ".py" {
			fullPath += ".py"
		}
		
		content := fmt.Sprintf(`# %s
# Created on MyLake

from pyspark.sql import SparkSession

spark = SparkSession.builder \\
    .appName("MyLake-Notebook") \\
    .getOrCreate()

print(f"Spark Version: {spark.version}")

# Your code here:

`, req.Name)
		
		if err := ioutil.WriteFile(fullPath, []byte(content), 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

	case "notebook":
		// Ensure .ipynb extension
		if filepath.Ext(req.Name) != ".ipynb" {
			fullPath += ".ipynb"
		}
		
		content := `{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "from pyspark.sql import SparkSession\\n",
    "\\n",
    "spark = SparkSession.builder \\\\\n",
    "    .appName(\"MyLake-Notebook\") \\\\\n",
    "    .getOrCreate()\\n",
    "\\n",
    "print(f\"Spark Version: {spark.version}\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": []
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "Python 3",
   "language": "python",
   "name": "python3"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 4
}`
		
		if err := ioutil.WriteFile(fullPath, []byte(content), 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid type"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "path": fullPath})
}

// DeleteFile elimina archivos o carpetas
func (h *LakeHandler) DeleteFile(c *gin.Context) {
	var req DeleteFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	basePath := "/home/jovyan/work"
	fullPath := filepath.Join(basePath, req.Path)
	
	// Security: prevent directory traversal
	if !isSubPath(fullPath, basePath) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid path"})
		return
	}

	if err := os.RemoveAll(fullPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func listDirectory(basePath, relPath string) []LakeItem {
	fullPath := filepath.Join(basePath, relPath)
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil
	}

	var items []LakeItem
	for _, entry := range entries {
		name := entry.Name()
		path := filepath.Join(relPath, name)
		
		item := LakeItem{
			Name: name,
			Path: path,
		}

		if entry.IsDir() {
			item.Type = "folder"
			item.Children = listDirectory(basePath, path)
			
			// Detectar formato lakehouse (carpetas con archivos .parquet)
			if hasParquetFiles(filepath.Join(basePath, path)) {
				item.Format = "delta"
			}
		} else {
			item.Type = "file"
			ext := filepath.Ext(name)
			switch ext {
			case ".parquet":
				item.Format = "parquet"
			case ".csv":
				item.Format = "csv"
			case ".json":
				item.Format = "json"
			case ".ipynb":
				item.Format = "notebook"
			case ".py":
				item.Format = "python"
			}
			
			if info, err := entry.Info(); err == nil {
				item.Size = info.Size()
			}
		}

		items = append(items, item)
	}

	return items
}

func hasParquetFiles(path string) bool {
	entries, err := os.ReadDir(path)
	if err != nil {
		return false
	}
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".parquet" {
			return true
		}
		if entry.IsDir() && hasParquetFiles(filepath.Join(path, entry.Name())) {
			return true
		}
	}
	return false
}

func isSubPath(path, base string) bool {
	rel, err := filepath.Rel(base, path)
	if err != nil {
		return false
	}
	return !filepath.IsAbs(rel) && rel != ".." && !filepath.HasPrefix(rel, "..")
}
