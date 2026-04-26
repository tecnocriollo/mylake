package handlers

import (
	"context"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"mylake/internal/database"
)

type LakeItem struct {
	Name     string `json:"name"`
	Type     string `json:"type"` // "folder", "table", "file"
	Path     string `json:"path"`
	Schema   string `json:"schema,omitempty"`
	Format   string `json:"format,omitempty"`
	Size     int64  `json:"size,omitempty"`
	Children []LakeItem `json:"children,omitempty"`
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

	c.JSON(http.StatusOK, gin.H{
		"type":     "database",
		"name":     "PostgreSQL",
		"children": schemas,
	})
}

// ListFiles devuelve archivos del workspace de Jupyter
func (h *LakeHandler) ListFiles(c *gin.Context) {
	basePath := "/home/jovyan/work"
	
	// Asegurar que existe
	os.MkdirAll(basePath, 0755)

	items := listDirectory(basePath, "")
	
	c.JSON(http.StatusOK, gin.H{
		"type":     "folder",
		"name":     "Workspace",
		"path":     "/",
		"children": items,
	})
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
