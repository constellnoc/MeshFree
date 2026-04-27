# MeshFree API Design

## 1. API Overview

The backend API is divided into two groups:

- Public API
- Admin API

Public API can be accessed without login.  
Admin API requires administrator authentication.

## 2. Base Rules

### Common Prefix

All endpoints use `/api` as the common prefix.

### Response Style

- Successful requests return useful business data or a success message
- Failed requests return a `message` field describing the error

### Authentication

Admin endpoints must include a valid token.

### File Upload

The public submission endpoint uses `multipart/form-data`.

### Basic Rate Limiting

To reduce brute-force attempts and abuse after public deployment, the current implementation applies basic rate limiting to:

- `POST /api/admin/login`
- `POST /api/submissions`

When a request is rate limited, the API returns `429`.

## 3. Public API

### 3.1 Get Approved Model List

**Method**

`GET /api/models`

**Purpose**

Return all approved resources for the public home page.

**Access**

Public

**Response Example**

```json
[
  {
    "id": "sub_001",
    "title": "Temple Asset Pack",
    "description": "Low-poly temple model set for practice.",
    "coverImageUrl": "/uploads/covers/temple.jpg",
    "createdAt": "2026-04-10T12:00:00.000Z"
  }
]
```

**Notes**

- Only resources with status `approved` are returned
- The home page only needs summary information

### 3.2 Get Approved Model Detail

**Method**

`GET /api/models/:id`

**Purpose**

Return the detail of one approved model.

**Access**

Public

**Path Params**

- `id`: submission ID

**Response Example**

```json
{
  "id": "sub_001",
  "title": "Temple Asset Pack",
  "description": "Low-poly temple model set for practice.",
  "coverImageUrl": "/uploads/covers/temple.jpg",
  "createdAt": "2026-04-10T12:00:00.000Z"
}
```

**Error Example**

```json
{
  "message": "Model not found."
}
```

### 3.3 Download Approved Model

**Method**

`GET /api/models/:id/download`

**Purpose**

Download the ZIP file of an approved model.

**Access**

Public

**Path Params**

- `id`: submission ID

**Success Behavior**

The backend sends the ZIP file directly to the browser as a download response.

**Error Example**

```json
{
  "message": "Model not found or not available for download."
}
```

**Notes**

- Only resources with status `approved` can be downloaded
- The backend should verify file existence before sending it

### 3.4 Submit New Resource

**Method**

`POST /api/submissions`

**Purpose**

Allow public visitors to submit a new model resource.

**Access**

Public

**Content Type**

`multipart/form-data`

**Form Fields**

- `title`: string
- `description`: string
- `contact`: string
- `cover`: image file
- `modelZip`: ZIP file

**Validation Rules**

- `title` is required
- `description` is required
- `contact` is required
- `cover` is required
- `modelZip` is required
- `cover` must be a valid image file
- `cover` must not exceed `2MB`
- `modelZip` must be a `.zip` file
- `modelZip` must not exceed `20MB`

**Success Response Example**

```json
{
  "message": "Submission received successfully. Please wait for admin review.",
  "submissionId": "sub_003",
  "status": "pending"
}
```

**Error Response Example**

```json
{
  "message": "Invalid file type or file size exceeds the limit."
}
```

**Rate Limit Response Example**

```json
{
  "message": "Too many submission attempts. Please try again later."
}
```

## 4. Admin API

### 4.1 Admin Login

**Method**

`POST /api/admin/login`

**Purpose**

Allow the administrator to log in.

**Access**

Public

**Request Body Example**

```json
{
  "username": "your-admin-username",
  "password": "your-password"
}
```

**Success Response Example**

```json
{
  "message": "Login successful.",
  "token": "jwt-token-example"
}
```

**Error Response Example**

```json
{
  "message": "Invalid username or password."
}
```

**Rate Limit Response Example**

```json
{
  "message": "Too many login attempts. Please try again later."
}
```

### 4.2 Get Submission List

**Method**

`GET /api/admin/submissions`

**Purpose**

Return all submissions for admin review and management.

**Access**

Admin only

**Optional Query Params**

- `status=pending`
- `status=approved`
- `status=rejected`

**Response Example**

```json
[
  {
    "id": "sub_003",
    "title": "Temple Asset Pack",
    "description": "Low-poly temple model set for practice.",
    "contact": "QQ:123456",
    "coverImageUrl": "/uploads/covers/temple.jpg",
    "status": "pending",
    "rejectReason": null,
    "createdAt": "2026-04-10T12:00:00.000Z",
    "reviewedAt": null
  }
]
```

### 4.3 Get Submission Detail

**Method**

`GET /api/admin/submissions/:id`

**Purpose**

Return the full detail of one submission for admin review.

**Access**

Admin only

**Path Params**

- `id`: submission ID

**Response Example**

```json
{
  "id": 3,
  "title": "Temple Asset Pack",
  "description": "Low-poly temple model set for practice.",
  "contact": "QQ:123456",
  "coverImageUrl": "/uploads/covers/temple.jpg",
  "modelZipName": "temple-pack.zip",
  "status": "pending",
  "rejectReason": null,
  "createdAt": "2026-04-10T12:00:00.000Z",
  "reviewedAt": null,
  "tags": [
    {
      "slug": "environment",
      "label": "Environment",
      "scopeLevel": "broad"
    }
  ],
  "rawTags": [
    {
      "id": 18,
      "value": "ruins",
      "status": "pending",
      "resolvedTag": null
    }
  ]
}
```

### 4.4 Download Submission ZIP

**Method**

`GET /api/admin/submissions/:id/download`

**Purpose**

Download the original uploaded ZIP package for admin review.

**Access**

Admin only

**Path Params**

- `id`: submission ID

### 4.5 Update Submission Tags

**Method**

`PATCH /api/admin/submissions/:id/tags`

**Purpose**

Save the governed public tags for one submission.

**Access**

Admin only

**Path Params**

- `id`: submission ID

**Request Body Example**

```json
{
  "selectedTagSlugs": ["environment", "low-poly"]
}
```

**Success Response Example**

```json
{
  "message": "Submission tags updated successfully.",
  "submission": {
    "id": 3,
    "status": "pending",
    "tags": [
      {
        "slug": "environment",
        "label": "Environment",
        "scopeLevel": "broad"
      },
      {
        "slug": "low-poly",
        "label": "Low Poly",
        "scopeLevel": "specific"
      }
    ]
  }
}
```

### 4.6 Create Public Tag

**Method**

`POST /api/admin/tags`

**Purpose**

Create a new governed public tag directly from the admin panel.

**Access**

Admin only

**Request Body Example**

```json
{
  "slug": "sci-fi-weapon-pack",
  "displayNameEn": "Sci-Fi Weapon Pack",
  "displayNameZh": "科幻武器包",
  "scopeLevel": "medium"
}
```

**Success Response Example**

```json
{
  "message": "Admin tag created successfully.",
  "tag": {
    "slug": "sci-fi-weapon-pack",
    "label": "Sci-Fi Weapon Pack",
    "scopeLevel": "medium"
  }
}
```

### 4.7 Ignore Raw Custom Tag

**Method**

`PATCH /api/admin/raw-tags/:id/ignore`

**Purpose**

Mark a private raw custom tag as ignored.

**Access**

Admin only

### 4.8 Resolve Raw Custom Tag to Existing Public Tag

**Method**

`PATCH /api/admin/raw-tags/:id/resolve-existing`

**Purpose**

Bind a private raw custom tag to an existing governed public tag.

**Access**

Admin only

**Request Body Example**

```json
{
  "tagSlug": "environment"
}
```

### 4.9 Create Public Tag from Raw Custom Tag

**Method**

`POST /api/admin/raw-tags/:id/create-tag`

**Purpose**

Create a new governed public tag from a private raw custom tag and resolve it immediately.

**Access**

Admin only

**Request Body Example**

```json
{
  "slug": "ruins",
  "displayNameEn": "Ruins",
  "displayNameZh": "遗迹",
  "scopeLevel": "medium"
}
```

### 4.10 Approve Submission

**Method**

`PATCH /api/admin/submissions/:id/approve`

**Purpose**

Approve a pending submission.

**Access**

Admin only

**Path Params**

- `id`: submission ID

**Success Response Example**

```json
{
  "message": "Submission approved successfully."
}
```

**Notes**

The backend should:

- Set status to `approved`
- Clear the reject reason
- Set the review time

### 4.11 Reject Submission

**Method**

`PATCH /api/admin/submissions/:id/reject`

**Purpose**

Reject a submission and save the reject reason.

**Access**

Admin only

**Path Params**

- `id`: submission ID

**Request Body Example**

```json
{
  "rejectReason": "Preview image is unclear."
}
```

**Success Response Example**

```json
{
  "message": "Submission rejected successfully."
}
```

**Notes**

The backend should:

- Set status to `rejected`
- Save `rejectReason`
- Set the review time

### 4.12 Delete Submission

**Method**

`DELETE /api/admin/submissions/:id`

**Purpose**

Delete a submission and its related files.

**Access**

Admin only

**Path Params**

- `id`: submission ID

**Success Response Example**

```json
{
  "message": "Submission deleted successfully."
}
```

**Notes**

The backend should:

- Delete the database record
- Delete the related cover image file
- Delete the related ZIP file

## 5. Route Naming Rules

The project follows these route naming rules:

- Use `/api` as the common prefix
- Use plural nouns for resource collections
- Use `/:id` for single resource access
- Use a separate `/admin` prefix for protected admin routes
- Use clear action suffixes for review operations

**Examples**

- `GET /api/models`
- `GET /api/models/:id`
- `GET /api/models/:id/download`
- `POST /api/submissions`
- `POST /api/admin/login`
- `GET /api/admin/submissions`
- `GET /api/admin/submissions/:id/download`
- `PATCH /api/admin/submissions/:id/tags`
- `POST /api/admin/tags`
- `PATCH /api/admin/raw-tags/:id/ignore`
- `PATCH /api/admin/raw-tags/:id/resolve-existing`
- `POST /api/admin/raw-tags/:id/create-tag`
- `PATCH /api/admin/submissions/:id/approve`
- `PATCH /api/admin/submissions/:id/reject`
- `DELETE /api/admin/submissions/:id`

## 6. Error Handling Principles

The API should return simple, clear, and readable error messages.

Examples:

```json
{
  "message": "Unauthorized."
}
```

```json
{
  "message": "Submission not found."
}
```

```json
{
  "message": "Invalid request data."
}
```

```json
{
  "message": "Too many login attempts. Please try again later."
}
```

```json
{
  "message": "Too many submission attempts. Please try again later."
}
```

## 7. Future Expansion Notes

The current API design is intentionally minimal.

Future versions may add:

- Search endpoint
- Category endpoint
- Download count
- Public submission tracking ID
- Object storage support
- Multiple admin accounts
