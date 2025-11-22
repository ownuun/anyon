use axum::{
    Extension, Json, Router,
    extract::{Path, Query, State},
    middleware::from_fn_with_state,
    response::Json as ResponseJson,
    routing::get,
};
use chrono::{DateTime, Utc};
use db::models::project::Project;
use deployment::Deployment;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use tokio::fs;
use ts_rs::TS;
use utils::response::ApiResponse;
use uuid::Uuid;

use crate::{DeploymentImpl, error::ApiError, middleware::load_project_middleware};

const DOCS_FOLDER: &str = "anyon-docs";

// Category mapping
const DEFAULT_CATEGORY: &str = "planning";
const CATEGORY_FOLDERS: &[(&str, &str)] = &[
    ("planning", "plan"),
    ("design", "design"),
    ("technology", "tech"),
    ("conversation", "conversation"),
];

fn category_to_folder(category: &str) -> &str {
    for (cat, folder) in CATEGORY_FOLDERS {
        if *cat == category {
            return folder;
        }
    }
    CATEGORY_FOLDERS
        .iter()
        .find(|(cat, _)| *cat == DEFAULT_CATEGORY)
        .map(|(_, folder)| *folder)
        .unwrap_or("plan")
}

fn folder_to_category(folder: &str) -> &str {
    for (cat, f) in CATEGORY_FOLDERS {
        if *f == folder {
            return cat;
        }
    }
    DEFAULT_CATEGORY
}

// Generate deterministic UUID from file path
fn path_to_uuid(path: &PathBuf) -> Uuid {
    let mut hasher = DefaultHasher::new();
    path.to_string_lossy().hash(&mut hasher);
    let hash = hasher.finish();

    // Create UUID from hash bytes
    let bytes: [u8; 16] = {
        let mut b = [0u8; 16];
        b[0..8].copy_from_slice(&hash.to_le_bytes());
        b[8..16].copy_from_slice(&hash.to_be_bytes());
        b
    };
    Uuid::from_bytes(bytes)
}

// Get docs base path for a project
fn get_docs_path(project: &Project) -> PathBuf {
    project.git_repo_path.join(DOCS_FOLDER)
}

// Ensure category folder exists
async fn ensure_category_folder(project: &Project, category: &str) -> Result<PathBuf, ApiError> {
    let folder = category_to_folder(category);
    let path = get_docs_path(project).join(folder);
    fs::create_dir_all(&path).await?;
    Ok(path)
}

// Ensure fixed conversation docs exist (empty templates)
async fn ensure_conversation_docs(project: &Project) -> Result<(), ApiError> {
    let folder = category_to_folder("conversation");
    let path = get_docs_path(project).join(folder);
    fs::create_dir_all(&path).await?;

    const FILES: &[&str] = &[
        "prd.md",
        "ux-design.md",
        "design-guide.md",
        "trd.md",
        "architecture.md",
        "erd.md",
    ];

    for file in FILES {
        let file_path = path.join(file);
        if !file_path.exists() {
            fs::write(&file_path, "").await?;
        }
    }

    Ok(())
}

// Sanitize filename
fn sanitize_filename(title: &str) -> String {
    title
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim()
        .to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Document {
    pub id: Uuid,
    pub project_id: Uuid,
    pub title: String,
    pub content: String,
    pub category: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DocumentListResponse {
    pub items: Vec<Document>,
    pub total: i64,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct CreateDocument {
    pub title: String,
    pub content: String,
    pub category: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct UpdateDocument {
    pub title: Option<String>,
    pub content: Option<String>,
    pub category: Option<String>,
}

#[derive(Deserialize)]
pub struct DocumentQueryParams {
    pub category: Option<String>,
}

#[derive(Deserialize)]
pub struct DocumentPathParams {
    pub project_id: Uuid,
    pub document_id: String,
}

// Read document from file
async fn read_document_from_file(
    project: &Project,
    category_folder: &str,
    filename: &str,
) -> Result<Document, ApiError> {
    let file_path = get_docs_path(project).join(category_folder).join(filename);

    let content = fs::read_to_string(&file_path).await?;
    let metadata = fs::metadata(&file_path).await?;

    let title = filename.strip_suffix(".md").unwrap_or(filename).to_string();
    let category = folder_to_category(category_folder);

    let created_at = metadata.created()
        .map(|t| DateTime::<Utc>::from(t))
        .unwrap_or_else(|_| Utc::now());
    let updated_at = metadata.modified()
        .map(|t| DateTime::<Utc>::from(t))
        .unwrap_or_else(|_| Utc::now());

    Ok(Document {
        id: path_to_uuid(&file_path),
        project_id: project.id,
        title,
        content,
        category: category.to_string(),
        created_at,
        updated_at,
    })
}

pub async fn list_documents(
    Extension(project): Extension<Project>,
    Query(params): Query<DocumentQueryParams>,
) -> Result<ResponseJson<ApiResponse<DocumentListResponse>>, ApiError> {
    // If requesting conversation docs, ensure fixed files exist
    if params.category.as_deref() == Some("conversation") {
        ensure_conversation_docs(&project).await?;
    }

    let docs_path = get_docs_path(&project);
    let mut items = Vec::new();

    let categories = if let Some(ref cat) = params.category {
        vec![category_to_folder(cat)]
    } else {
        vec!["plan", "design", "tech"] // keep existing default categories for main Docs tab
    };

    for category_folder in categories {
        let category_path = docs_path.join(category_folder);

        if !category_path.exists() {
            continue;
        }

        let mut entries = match fs::read_dir(&category_path).await {
            Ok(e) => e,
            Err(_) => continue,
        };

        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "md") {
                if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                    match read_document_from_file(&project, category_folder, filename).await {
                        Ok(doc) => items.push(doc),
                        Err(e) => tracing::warn!("Failed to read document {}: {:?}", filename, e),
                    }
                }
            }
        }
    }

    let total = items.len() as i64;

    Ok(ResponseJson(ApiResponse::success(DocumentListResponse {
        items,
        total,
    })))
}

pub async fn get_document(
    Extension(project): Extension<Project>,
    Path(params): Path<DocumentPathParams>,
) -> Result<ResponseJson<ApiResponse<Document>>, ApiError> {
    // Ensure conversation docs are present before search (covers direct get by ID)
    ensure_conversation_docs(&project).await?;

    let docs_path = get_docs_path(&project);

    // Search in all category folders
    for category_folder in CATEGORY_FOLDERS.iter().map(|(_, folder)| *folder) {
        let category_path = docs_path.join(category_folder);

        if !category_path.exists() {
            continue;
        }

        let mut entries = match fs::read_dir(&category_path).await {
            Ok(e) => e,
            Err(_) => continue,
        };

        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "md") {
                let file_id = path_to_uuid(&path);
                if file_id.to_string() == params.document_id {
                    if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                        let doc = read_document_from_file(&project, category_folder, filename).await?;
                        return Ok(ResponseJson(ApiResponse::success(doc)));
                    }
                }
            }
        }
    }

    Err(ApiError::BadRequest("Document not found".to_string()))
}

pub async fn create_document(
    Extension(project): Extension<Project>,
    State(deployment): State<DeploymentImpl>,
    Json(payload): Json<CreateDocument>,
) -> Result<ResponseJson<ApiResponse<Document>>, ApiError> {
    let category_path = ensure_category_folder(&project, &payload.category).await?;
    let filename = format!("{}.md", sanitize_filename(&payload.title));
    let file_path = category_path.join(&filename);

    // Check if file already exists
    if file_path.exists() {
        return Err(ApiError::BadRequest("Document with this title already exists".to_string()));
    }

    fs::write(&file_path, &payload.content).await?;
    let metadata = fs::metadata(&file_path).await?;

    let now = Utc::now();
    let created_at = metadata.created()
        .map(|t| DateTime::<Utc>::from(t))
        .unwrap_or(now);

    let document = Document {
        id: path_to_uuid(&file_path),
        project_id: project.id,
        title: payload.title,
        content: payload.content,
        category: payload.category.clone(),
        created_at,
        updated_at: now,
    };

    deployment
        .track_if_analytics_allowed(
            "document_created",
            serde_json::json!({
                "document_id": document.id.to_string(),
                "project_id": project.id.to_string(),
                "category": document.category,
            }),
        )
        .await;

    Ok(ResponseJson(ApiResponse::success(document)))
}

pub async fn update_document(
    Extension(project): Extension<Project>,
    State(deployment): State<DeploymentImpl>,
    Path(params): Path<DocumentPathParams>,
    Json(payload): Json<UpdateDocument>,
) -> Result<ResponseJson<ApiResponse<Document>>, ApiError> {
    // Ensure conversation docs directory exists (for moves or new category)
    ensure_conversation_docs(&project).await?;

    let docs_path = get_docs_path(&project);

    // Find the document
    for category_folder in CATEGORY_FOLDERS.iter().map(|(_, folder)| *folder) {
        let category_path = docs_path.join(category_folder);

        if !category_path.exists() {
            continue;
        }

        let mut entries = match fs::read_dir(&category_path).await {
            Ok(e) => e,
            Err(_) => continue,
        };

        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "md") {
                let file_id = path_to_uuid(&path);
                if file_id.to_string() == params.document_id {
                    // Found the document
                    let old_filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
                    let old_title = old_filename.strip_suffix(".md").unwrap_or(&old_filename);

                    let current_content = fs::read_to_string(&path).await?;

                    let new_title = payload.title.as_deref().unwrap_or(old_title);
                    let new_content = payload.content.as_deref().unwrap_or(&current_content);
                    let new_category = payload.category.as_deref().unwrap_or(folder_to_category(category_folder));

                    let new_filename = format!("{}.md", sanitize_filename(new_title));
                    let new_category_path = ensure_category_folder(&project, new_category).await?;
                    let new_path = new_category_path.join(&new_filename);

                    // Write content to new path
                    fs::write(&new_path, new_content).await?;

                    // Remove old file if path changed
                    if path != new_path {
                        let _ = fs::remove_file(&path).await;
                    }

                    let metadata = fs::metadata(&new_path).await?;

                    let created_at = metadata.created()
                        .map(|t| DateTime::<Utc>::from(t))
                        .unwrap_or_else(|_| Utc::now());
                    let updated_at = metadata.modified()
                        .map(|t| DateTime::<Utc>::from(t))
                        .unwrap_or_else(|_| Utc::now());

                    let document = Document {
                        id: path_to_uuid(&new_path),
                        project_id: project.id,
                        title: new_title.to_string(),
                        content: new_content.to_string(),
                        category: new_category.to_string(),
                        created_at,
                        updated_at,
                    };

                    deployment
                        .track_if_analytics_allowed(
                            "document_updated",
                            serde_json::json!({
                                "document_id": document.id.to_string(),
                            }),
                        )
                        .await;

                    return Ok(ResponseJson(ApiResponse::success(document)));
                }
            }
        }
    }

    Err(ApiError::BadRequest("Document not found".to_string()))
}

pub async fn delete_document(
    Extension(project): Extension<Project>,
    Path(params): Path<DocumentPathParams>,
) -> Result<ResponseJson<ApiResponse<()>>, ApiError> {
    // Ensure conversation docs directory exists for consistency
    ensure_conversation_docs(&project).await?;

    let docs_path = get_docs_path(&project);

    for category_folder in CATEGORY_FOLDERS.iter().map(|(_, folder)| *folder) {
        let category_path = docs_path.join(category_folder);

        if !category_path.exists() {
            continue;
        }

        let mut entries = match fs::read_dir(&category_path).await {
            Ok(e) => e,
            Err(_) => continue,
        };

        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "md") {
                let file_id = path_to_uuid(&path);
                if file_id.to_string() == params.document_id {
                    fs::remove_file(&path).await?;
                    return Ok(ResponseJson(ApiResponse::success(())));
                }
            }
        }
    }

    Err(ApiError::BadRequest("Document not found".to_string()))
}

pub fn router(deployment: &DeploymentImpl) -> Router<DeploymentImpl> {
    // Routes nested under project
    let project_documents_router = Router::new()
        .route("/", get(list_documents).post(create_document))
        .route("/{document_id}", get(get_document).put(update_document).delete(delete_document))
        .layer(from_fn_with_state(deployment.clone(), load_project_middleware));

    Router::new().nest("/projects/{project_id}/documents", project_documents_router)
}
