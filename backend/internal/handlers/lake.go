package handlers

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"sort"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go"
	"github.com/gin-gonic/gin"
	"mylake/internal/config"
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
	DB       *database.DB
	S3Client *s3.Client
	Bucket   string
}

func NewLakeHandler(db *database.DB, cfg *config.Config) *LakeHandler {
	useSSL := strings.EqualFold(cfg.RustFSUseSSL, "true")
	scheme := "http"
	if useSSL {
		scheme = "https"
	}
	endpoint := fmt.Sprintf("%s://%s", scheme, cfg.RustFSEndpoint)

	awsCfg, err := awsconfig.LoadDefaultConfig(
		context.Background(),
		awsconfig.WithRegion("us-east-1"),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.RustFSAccessKey, cfg.RustFSSecretKey, ""),
		),
	)
	if err != nil {
		panic(fmt.Sprintf("failed to initialize RustFS client: %v", err))
	}

	return &LakeHandler{
		DB:       db,
		S3Client: s3.NewFromConfig(awsCfg, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(endpoint)
			o.UsePathStyle = true
		}),
		Bucket:   cfg.RustFSBucket,
	}
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

// ListFiles devuelve archivos del bucket S3 (RustFS)
func (h *LakeHandler) ListFiles(c *gin.Context) {
	ctx := c.Request.Context()

	if err := h.ensureBucket(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	items, err := h.listPrefixTree(ctx, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

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

	key := normalizeObjectKey(req.Path, req.Name)
	if key == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid path"})
		return
	}

	ctx := c.Request.Context()
	if err := h.ensureBucket(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	switch req.Type {
	case "folder":
		folderKey := strings.TrimSuffix(key, "/") + "/"
		_, err := h.S3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket: aws.String(h.Bucket),
			Key:    aws.String(folderKey),
			Body:   bytes.NewReader(nil),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

	case "python":
		if filepath.Ext(req.Name) != ".py" {
			key += ".py"
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
		
		_, err := h.S3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(h.Bucket),
			Key:         aws.String(key),
			Body:        strings.NewReader(content),
			ContentType: aws.String("text/x-python"),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

	case "notebook":
		if filepath.Ext(req.Name) != ".ipynb" {
			key += ".ipynb"
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
		
		_, err := h.S3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(h.Bucket),
			Key:         aws.String(key),
			Body:        strings.NewReader(content),
			ContentType: aws.String("application/x-ipynb+json"),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid type"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "path": key})
}

// DeleteFile elimina archivos o carpetas
func (h *LakeHandler) DeleteFile(c *gin.Context) {
	var req DeleteFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	key := sanitizeRelativePath(req.Path)
	if key == "" && req.Path != "/" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid path"})
		return
	}

	ctx := c.Request.Context()
	if err := h.ensureBucket(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Delete folder recursively by prefix, or file by exact key.
	prefix := key
	if prefix != "" && !strings.HasSuffix(prefix, "/") {
		prefix += "/"
	}
	foundFolder := false

	paginator := s3.NewListObjectsV2Paginator(h.S3Client, &s3.ListObjectsV2Input{
		Bucket: aws.String(h.Bucket),
		Prefix: aws.String(prefix),
	})
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		for _, object := range page.Contents {
			foundFolder = true
			_, err = h.S3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
				Bucket: aws.String(h.Bucket),
				Key:    object.Key,
			})
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
	}

	if !foundFolder {
		_, err := h.S3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(h.Bucket),
			Key:    aws.String(key),
		})
		if err != nil && !isNoSuchKeyErr(err) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *LakeHandler) ensureBucket(ctx context.Context) error {
	_, err := h.S3Client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(h.Bucket),
	})
	if err == nil {
		return nil
	}
	_, createErr := h.S3Client.CreateBucket(ctx, &s3.CreateBucketInput{
		Bucket: aws.String(h.Bucket),
	})
	if createErr != nil && !isBucketAlreadyOwnedErr(createErr) {
		return createErr
	}
	return nil
}

func (h *LakeHandler) listPrefixTree(ctx context.Context, prefix string) ([]LakeItem, error) {
	root := &treeNode{
		isFolder: true,
		children: map[string]*treeNode{},
	}

	paginator := s3.NewListObjectsV2Paginator(h.S3Client, &s3.ListObjectsV2Input{
		Bucket: aws.String(h.Bucket),
		Prefix: aws.String(prefix),
	})
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, err
		}
		for _, object := range page.Contents {
			key := strings.TrimPrefix(aws.ToString(object.Key), prefix)
			if key == "" {
				continue
			}
			insertObjectIntoTree(root, key, aws.ToInt64(object.Size), strings.HasSuffix(aws.ToString(object.Key), "/"))
		}
	}

	return treeToLakeItems(root, prefix), nil
}

type treeNode struct {
	isFolder bool
	size     int64
	format   string
	children map[string]*treeNode
}

func insertObjectIntoTree(root *treeNode, key string, size int64, isFolderMarker bool) {
	cleanKey := strings.Trim(strings.TrimSpace(key), "/")
	if cleanKey == "" {
		return
	}
	parts := strings.Split(cleanKey, "/")
	current := root
	for i, part := range parts {
		if part == "" {
			continue
		}

		child, ok := current.children[part]
		if !ok {
			child = &treeNode{
				isFolder: i < len(parts)-1,
				children: map[string]*treeNode{},
			}
			current.children[part] = child
		}

		if i == len(parts)-1 {
			if isFolderMarker {
				child.isFolder = true
			} else {
				child.isFolder = false
				child.size = size
				child.format = inferFileFormat(part)
			}
		}

		current = child
	}
}

func treeToLakeItems(node *treeNode, prefix string) []LakeItem {
	keys := make([]string, 0, len(node.children))
	for name := range node.children {
		keys = append(keys, name)
	}
	sort.Slice(keys, func(i, j int) bool {
		left := node.children[keys[i]]
		right := node.children[keys[j]]
		if left.isFolder != right.isFolder {
			return left.isFolder
		}
		return strings.ToLower(keys[i]) < strings.ToLower(keys[j])
	})

	items := make([]LakeItem, 0, len(keys))
	for _, name := range keys {
		child := node.children[name]
		item := LakeItem{
			Name: name,
			Path: strings.TrimSuffix(prefix+name, "/"),
		}
		if child.isFolder {
			item.Type = "folder"
			item.Children = treeToLakeItems(child, prefix+name+"/")
		} else {
			item.Type = "file"
			item.Size = child.size
			item.Format = child.format
		}
		items = append(items, item)
	}
	return items
}

func normalizeObjectKey(parentPath, name string) string {
	parent := sanitizeRelativePath(parentPath)
	filename := strings.TrimSpace(strings.Trim(name, "/"))
	if filename == "" {
		return ""
	}
	if parent == "" {
		return filename
	}
	return parent + "/" + filename
}

func sanitizeRelativePath(path string) string {
	clean := strings.TrimSpace(path)
	if clean == "" || clean == "/" {
		return ""
	}
	clean = filepath.ToSlash(filepath.Clean("/" + clean))
	clean = strings.TrimPrefix(clean, "/")
	if clean == "." || strings.HasPrefix(clean, "../") || clean == ".." {
		return ""
	}
	return strings.TrimSuffix(clean, "/")
}

func inferFileFormat(name string) string {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".parquet":
		return "parquet"
	case ".csv":
		return "csv"
	case ".json":
		return "json"
	case ".ipynb":
		return "notebook"
	case ".py":
		return "python"
	default:
		return ""
	}
}

func sanitizeWorkspaceObjectKey(path string) (string, bool) {
	key := strings.TrimSpace(filepath.ToSlash(path))
	key = strings.TrimPrefix(key, "/")
	if key == "" || strings.Contains(key, "..") {
		return "", false
	}
	return key, true
}

// ReadWorkspaceObject returns an object from the RustFS lake bucket (workspace files).
func (h *LakeHandler) ReadWorkspaceObject(ctx context.Context, path string) ([]byte, error) {
	key, ok := sanitizeWorkspaceObjectKey(path)
	if !ok {
		return nil, fmt.Errorf("invalid path")
	}
	out, err := h.S3Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(h.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}
	defer out.Body.Close()
	return io.ReadAll(out.Body)
}

// WriteWorkspaceObject writes an object to the lake bucket.
func (h *LakeHandler) WriteWorkspaceObject(ctx context.Context, path string, body []byte, contentType string) error {
	key, ok := sanitizeWorkspaceObjectKey(path)
	if !ok {
		return fmt.Errorf("invalid path")
	}
	if contentType == "" {
		contentType = "application/json"
	}
	_, err := h.S3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(h.Bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(body),
		ContentType: aws.String(contentType),
	})
	return err
}

// DeleteWorkspaceObject removes an object from the lake bucket.
func (h *LakeHandler) DeleteWorkspaceObject(ctx context.Context, path string) error {
	key, ok := sanitizeWorkspaceObjectKey(path)
	if !ok {
		return fmt.Errorf("invalid path")
	}
	_, err := h.S3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(h.Bucket),
		Key:    aws.String(key),
	})
	return err
}

func isNoSuchKeyErr(err error) bool {
	var apiErr smithy.APIError
	if errors.As(err, &apiErr) {
		return apiErr.ErrorCode() == "NoSuchKey"
	}
	return false
}

func isBucketAlreadyOwnedErr(err error) bool {
	var apiErr smithy.APIError
	if errors.As(err, &apiErr) {
		code := apiErr.ErrorCode()
		return code == "BucketAlreadyOwnedByYou" || code == "BucketAlreadyExists"
	}
	return false
}

