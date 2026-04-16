# MeshFree API 设计说明

## 1. API 概览

后端接口分为两类：

- 公开接口
- 管理员接口

公开接口无需登录即可访问。  
管理员接口必须通过管理员认证后才能访问。

## 2. 基本规则

### 统一前缀

所有接口统一使用 `/api` 作为前缀。

### 响应风格

- 成功时返回业务数据或成功提示
- 失败时返回 `message` 字段说明错误原因

### 认证方式

管理员接口必须携带有效 token。

### 文件上传方式

投稿上传接口使用 `multipart/form-data`。

### 基础限流

为了降低公网部署后的暴力尝试和滥用风险，当前实现对以下接口加入了基础限流：

- `POST /api/admin/login`
- `POST /api/submissions`

当触发限流时，接口会返回 `429`。

## 3. 公开接口

### 3.1 获取已发布模型列表

**方法**

`GET /api/models`

**用途**

返回所有已审核通过的资源，用于前台首页展示。

**访问权限**

游客可访问

**响应示例**

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

**说明**

- 仅返回状态为 `approved` 的资源
- 首页只需要摘要信息，不返回过多字段

### 3.2 获取模型详情

**方法**

`GET /api/models/:id`

**用途**

返回单个已审核通过模型的详情信息。

**访问权限**

游客可访问

**路径参数**

- `id`：投稿 ID

**响应示例**

```json
{
  "id": "sub_001",
  "title": "Temple Asset Pack",
  "description": "Low-poly temple model set for practice.",
  "coverImageUrl": "/uploads/covers/temple.jpg",
  "createdAt": "2026-04-10T12:00:00.000Z"
}
```

**错误示例**

```json
{
  "message": "Model not found."
}
```

### 3.3 下载模型

**方法**

`GET /api/models/:id/download`

**用途**

下载已审核通过模型对应的 ZIP 文件。

**访问权限**

游客可访问

**路径参数**

- `id`：投稿 ID

**成功行为**

后端直接返回 ZIP 文件给浏览器下载。

**错误示例**

```json
{
  "message": "Model not found or not available for download."
}
```

**说明**

- 仅 `approved` 状态资源可下载
- 下载前后端应检查文件是否存在

### 3.4 提交新投稿

**方法**

`POST /api/submissions`

**用途**

允许游客提交新的模型资源。

**访问权限**

游客可访问

**内容类型**

`multipart/form-data`

**表单字段**

- `title`：字符串
- `description`：字符串
- `contact`：字符串
- `cover`：图片文件
- `modelZip`：ZIP 文件

**校验规则**

- `title` 必填
- `description` 必填
- `contact` 必填
- `cover` 必填
- `modelZip` 必填
- `cover` 必须是合法图片格式
- `cover` 大小不能超过 `2MB`
- `modelZip` 必须是 `.zip` 文件
- `modelZip` 大小不能超过 `20MB`

**成功响应示例**

```json
{
  "message": "Submission received successfully. Please wait for admin review.",
  "submissionId": "sub_003",
  "status": "pending"
}
```

**失败响应示例**

```json
{
  "message": "Invalid file type or file size exceeds the limit."
}
```

**限流响应示例**

```json
{
  "message": "Too many submission attempts. Please try again later."
}
```

## 4. 管理员接口

### 4.1 管理员登录

**方法**

`POST /api/admin/login`

**用途**

允许管理员登录后台。

**访问权限**

公开可访问

**请求体示例**

```json
{
  "username": "your-admin-username",
  "password": "your-password"
}
```

**成功响应示例**

```json
{
  "message": "Login successful.",
  "token": "jwt-token-example"
}
```

**失败响应示例**

```json
{
  "message": "Invalid username or password."
}
```

**限流响应示例**

```json
{
  "message": "Too many login attempts. Please try again later."
}
```

### 4.2 获取投稿列表

**方法**

`GET /api/admin/submissions`

**用途**

返回所有投稿，用于后台审核与管理页面。

**访问权限**

仅管理员可访问

**可选查询参数**

- `status=pending`
- `status=approved`
- `status=rejected`

**响应示例**

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

### 4.3 获取投稿详情

**方法**

`GET /api/admin/submissions/:id`

**用途**

返回单条投稿的完整信息，用于后台审核详情查看。

**访问权限**

仅管理员可访问

**路径参数**

- `id`：投稿 ID

**响应示例**

```json
{
  "id": "sub_003",
  "title": "Temple Asset Pack",
  "description": "Low-poly temple model set for practice.",
  "contact": "QQ:123456",
  "coverImageUrl": "/uploads/covers/temple.jpg",
  "modelZipName": "temple-pack.zip",
  "status": "pending",
  "rejectReason": null,
  "createdAt": "2026-04-10T12:00:00.000Z",
  "reviewedAt": null
}
```

### 4.4 通过投稿

**方法**

`PATCH /api/admin/submissions/:id/approve`

**用途**

将待审核投稿通过。

**访问权限**

仅管理员可访问

**路径参数**

- `id`：投稿 ID

**成功响应示例**

```json
{
  "message": "Submission approved successfully."
}
```

**说明**

后端应执行：

- 将状态改为 `approved`
- 清空拒绝原因
- 写入审核时间

### 4.5 拒绝投稿

**方法**

`PATCH /api/admin/submissions/:id/reject`

**用途**

拒绝一条投稿并保存拒绝原因。

**访问权限**

仅管理员可访问

**路径参数**

- `id`：投稿 ID

**请求体示例**

```json
{
  "rejectReason": "Preview image is unclear."
}
```

**成功响应示例**

```json
{
  "message": "Submission rejected successfully."
}
```

**说明**

后端应执行：

- 将状态改为 `rejected`
- 保存 `rejectReason`
- 写入审核时间

### 4.6 删除投稿

**方法**

`DELETE /api/admin/submissions/:id`

**用途**

删除一条投稿以及其关联文件。

**访问权限**

仅管理员可访问

**路径参数**

- `id`：投稿 ID

**成功响应示例**

```json
{
  "message": "Submission deleted successfully."
}
```

**说明**

后端应执行：

- 删除数据库记录
- 删除对应封面图文件
- 删除对应 ZIP 文件

## 5. 路由命名规则

本项目路由遵循以下规则：

- 统一使用 `/api` 作为公共前缀
- 资源集合使用复数名词
- 单个资源使用 `/:id`
- 管理员接口统一使用 `/admin` 前缀
- 特殊审核动作使用明确的动作后缀

**示例**

- `GET /api/models`
- `GET /api/models/:id`
- `GET /api/models/:id/download`
- `POST /api/submissions`
- `POST /api/admin/login`
- `GET /api/admin/submissions`
- `PATCH /api/admin/submissions/:id/approve`
- `PATCH /api/admin/submissions/:id/reject`
- `DELETE /api/admin/submissions/:id`

## 6. 错误处理原则

接口应尽量返回简单、明确、可读的错误提示。

示例：

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

## 7. 后续扩展说明

当前 API 设计刻意保持最小化。

未来版本可扩展：

- 搜索接口
- 分类接口
- 下载次数统计
- 公开投稿查询编号
- 对象存储支持
- 多管理员账号
