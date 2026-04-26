export type AppLocale = "en" | "zh-CN";

export const defaultAppLocale: AppLocale = "en";
export const supportedAppLocales: AppLocale[] = ["en", "zh-CN"];
export const appLocaleStorageKey = "meshfree_app_locale";

function resolveLocalizedTagReference(activeTag: string, activeTagLabel?: string) {
  return activeTagLabel && activeTagLabel !== activeTag ? activeTagLabel : activeTag;
}

const en = {
  nav: {
    gallery: "Gallery",
    about: "About",
    primaryNavigation: "Primary navigation",
    searchPlaceholder: "Search",
    searchAriaLabel: "Search models",
    adminSignIn: "Sign in / Sign up",
    dashboardFallback: "Dashboard",
    upload: "Upload",
    languageGroupAriaLabel: "Language switcher",
    languageToggleLabel: "EN / 中",
  },
  documentTitle: {
    about: "MeshFree-About",
    gallery: "MeshFree-Gallery",
    home: "MeshFree-Home",
    upload: "MeshFree-Upload",
    signIn: "MeshFree-Sign in",
    dashboard: "MeshFree-Dashboard",
    model: "MeshFree-Model",
    fallback: "MeshFree",
  },
  footer: {
    description: "A lightweight platform for 3D model sharing and review.",
    contact: "Contact",
    copyright: "Copyright © 2026 Noctiluca",
  },
  home: {
    heroTitle: "Open resources, open creativity.",
    heroLead: "MeshFree is a lightweight platform for browsing, sharing, and reviewing 3D model resources.",
    browseGallery: "Browse gallery",
    upload: "Upload",
    galleryKicker: "Gallery",
    galleryTitle: "Approved model resources",
    galleryLead: "Browse recommended tags and open approved resources without logging in.",
    uploadModel: "Upload a model",
    showingResults: (activeQuery: string, activeTag: string, activeTagLabel?: string) =>
      `Showing results${activeQuery ? ` for "${activeQuery}"` : ""}${activeTag ? ` in tag "${resolveLocalizedTagReference(activeTag, activeTagLabel)}"` : ""}.`,
    clearFilters: "Clear filters",
    loadingTitle: "Loading models",
    loadingBody: "The client is requesting `/api/models` from the backend.",
    errorTitle: "Unable to load models",
    failedLoad: (errorMessage: string) => `Failed to load approved models: ${errorMessage}`,
    noMatchingTitle: "No matching models",
    noApprovedTitle: "No approved models yet",
    noMatchingBody: "Try a different keyword or remove the active tag filter.",
    noApprovedBody:
      "The public gallery is empty right now. Once approved submissions exist, they will appear here automatically.",
    approvedResource: "Approved resource",
    viewDetailsAndDownload: "View details and download",
    createdOn: (dateLabel: string) => `Created ${dateLabel}`,
  },
  modelDetail: {
    loadingTitle: "Loading model",
    loadingBody: (id: string) => `The client is requesting \`/api/models/${id || ":id"}\`.`,
    unavailableTitle: "Model unavailable",
    notFound: "Model not found.",
    failedLoad: (errorMessage: string) => `Failed to load model detail: ${errorMessage}`,
    backToHome: "Back to home",
    closePreviewAriaLabel: "Close model preview",
    preview: "Preview",
    modalKicker: "Model Preview",
    pageKicker: "Model Detail",
    createdOn: (dateLabel: string) => `Created ${dateLabel}`,
    downloadZip: "Download ZIP",
    preparingPreview: "Preparing 3D preview...",
  },
  upload: {
    kicker: "Public Upload",
    title: "Upload a model for admin review",
    intro:
      "Upload one cover image and one ZIP file. After upload, the resource will stay in pending status until the administrator reviews it.",
    titleLabel: "Title",
    titlePlaceholder: "Temple Asset Pack",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Describe the model pack and its intended use.",
    contactLabel: "Contact info (QQ / WeChat / Email)",
    contactPlaceholder: "Email: your-name@example.com",
    presetTagsLabel: "Preset tags",
    presetTagsHelp: (maxTags: number) =>
      `Select up to ${maxTags} public tags. These are the tags that can become visible after review.`,
    suggestedTagsLabel: "Suggested tags",
    suggestedTagPlaceholder: "Suggest a new tag for admin review",
    addSuggestion: "Add suggestion",
    suggestedTagsHelp:
      "Suggested tags stay private. Only the administrator can decide whether they become a new public tag or an alias for an existing tag.",
    coverImageLabel: "Cover image",
    coverImageHelp: "Accepted: JPG, JPEG, PNG, WEBP. Max 2MB.",
    modelZipLabel: "Model ZIP",
    modelZipHelp: (maxMb: number) => `Accepted: ZIP only. Max ${maxMb}MB.`,
    reset: "Reset",
    uploading: "Uploading...",
    uploadForReview: "Upload for review",
    draftHelp:
      "Text fields, selected preset tags, and suggested tags are saved locally in this browser. File inputs must be selected again after refresh or reset.",
    rulesTitle: "Upload rules",
    rulesAllFields: "All fields are required.",
    rulesSingleFiles: "Only one cover image and one ZIP file are allowed.",
    rulesPublicAfterReview: "The model will become public only after admin approval.",
    uploadId: "Upload ID",
    status: "Status",
    statusValues: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
    },
    failedUpload: "Failed to upload. Please try again.",
    successReceived: "Submission received successfully. Please wait for admin review.",
    requiredFields: "Please complete all required text fields.",
    requiredFiles: "Please upload both a cover image and a ZIP file.",
    coverImageType: "Cover image must be a JPG, JPEG, PNG, or WEBP file.",
    coverImageMaxSize: "Cover image must not exceed 2MB.",
    zipType: "Model file must be a ZIP archive.",
    zipMaxSize: (maxMb: number) => `Model ZIP must not exceed ${maxMb}MB.`,
    presetTagsLimit: (maxTags: number) => `Please select up to ${maxTags} preset tags.`,
    suggestedTagsLimit: (maxTags: number) => `Please use up to ${maxTags} suggested tags.`,
    tagLength: (minLength: number, maxLength: number) =>
      `Each tag must be between ${minLength} and ${maxLength} characters.`,
  },
  adminLogin: {
    kicker: "Admin Access",
    title: "Sign in to the review dashboard",
    intro: "Only the seeded administrator account can access review actions for pending submissions.",
    username: "Username",
    usernamePlaceholder: "Enter username",
    password: "Password",
    signingIn: "Signing in...",
    signIn: "Sign in",
    workflowTitle: "Review workflow",
    workflowIntro: "After login, the dashboard lets the administrator:",
    workflowView: "View all submissions or filter by review status.",
    workflowInspect: "Inspect contact info, cover image, and stored ZIP name.",
    workflowManage: "Approve, reject, or delete a submission.",
    goToDashboard: "Go to dashboard",
    openDashboard: "Open dashboard",
    requiredCredentials: "Please enter both username and password.",
    failedLogin: "Failed to log in. Please try again.",
  },
  admin: {
    kicker: "Admin Dashboard",
    title: "Review submissions",
    intro: "Select a record to inspect it and update its review status.",
    logout: "Log out",
    filters: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      all: "All",
    },
    status: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
    },
    loadingSubmissions: "Loading submissions...",
    noMatchingSubmissions: "No submissions match the current filter.",
    createdOn: (dateLabel: string) => `Created ${dateLabel}`,
    noSubmissionSelectedTitle: "No submission selected",
    noSubmissionSelectedBody: "Choose an item from the list to inspect its details.",
    detailKicker: "Submission Detail",
    loadingSelectedSubmission: "Loading selected submission...",
    statusLabel: "Status",
    contactLabel: "Contact",
    zipFileLabel: "ZIP file",
    createdLabel: "Created",
    reviewedLabel: "Reviewed",
    rejectReasonLabel: "Reject reason",
    notReviewedYet: "Not reviewed yet",
    publicTagsLabel: "Public tags",
    publicTagsHelp: (maxTags: number) =>
      `Choose up to ${maxTags} public tags. These are the only tags visible to visitors after approval.`,
    noPublicTagsSaved: "No public tags saved yet.",
    saveTags: "Save tags",
    privateSuggestedTagsLabel: "Private suggested tags",
    privateSuggestedTagsHelp:
      "These suggestions are visible only to the administrator until they are reviewed.",
    noPrivateSuggestedTags: "No private tag suggestions were submitted.",
    rejectReasonPlaceholder: "Explain why this submission should be rejected.",
    downloadZip: "Download ZIP",
    approve: "Approve",
    reject: "Reject",
    delete: "Delete",
    publicTagsLimit: (maxTags: number) => `Please select up to ${maxTags} public tags.`,
    requiredRejectReason: "Please enter a reject reason before rejecting.",
    requestFailed: "Request failed. Please try again.",
    successTagsSaved: "Submission tags updated successfully.",
    successApproved: "Submission approved successfully.",
    successRejected: "Submission rejected successfully.",
    successDeleted: "Submission deleted successfully.",
  },
  viewer: {
    backgroundGroupAriaLabel: "Viewer background color",
    backgroundPresetLabels: {
      white: "White",
      black: "Black",
      softWhite: "Soft White",
      softBlack: "Soft Black",
    },
    switchBackgroundTo: (label: string) => `Switch background to ${label}`,
    resetView: "Reset view",
    close: "Close",
    unavailable: "3D preview is unavailable for this file.",
    loading: "Loading model preview...",
    hint: "Drag to rotate and scroll to zoom.",
    srOnlyTitle: (title: string) => `${title} 3D preview viewer.`,
  },
};

export type AppCopy = typeof en;

const zhCN: AppCopy = {
  nav: {
    gallery: "模型库",
    about: "关于",
    primaryNavigation: "主导航",
    searchPlaceholder: "搜索",
    searchAriaLabel: "搜索模型",
    adminSignIn: "登录 / 注册",
    dashboardFallback: "管理面板",
    upload: "上传",
    languageGroupAriaLabel: "语言切换",
    languageToggleLabel: "EN / 中",
  },
  documentTitle: {
    about: "MeshFree-关于",
    gallery: "MeshFree-模型库",
    home: "MeshFree-首页",
    upload: "MeshFree-上传",
    signIn: "MeshFree-登录",
    dashboard: "MeshFree-管理面板",
    model: "MeshFree-模型",
    fallback: "MeshFree",
  },
  footer: {
    description: "一个轻量级的 3D 模型分享平台。",
    contact: "联系我们",
    copyright: "Copyright © 2026 Noctiluca",
  },
  home: {
    heroTitle: "Open resources, open creativity.",
    heroLead: "MeshFree 是一个用于浏览和分享 3D 模型资源的轻量级平台。",
    browseGallery: "浏览模型库",
    upload: "上传",
    galleryKicker: "模型库",
    galleryTitle: "公开资源",
    galleryLead: "无需登录即可浏览标签并查看公开资源。",
    uploadModel: "上传模型",
    showingResults: (activeQuery: string, activeTag: string, activeTagLabel?: string) =>
      `正在显示${
        activeTag ? `标签“${resolveLocalizedTagReference(activeTag, activeTagLabel)}”` : ""
      }${activeQuery ? `${activeTag ? "下" : ""}“${activeQuery}”的` : activeTag ? "的" : ""}搜索结果。`,
    clearFilters: "清除筛选",
    loadingTitle: "加载中...",
    loadingBody: "正在请求...后端接口 `/api/models`。",
    errorTitle: "无法加载模型",
    failedLoad: (errorMessage: string) => `无法加载公开资源：${errorMessage}`,
    noMatchingTitle: "无匹配模型",
    noApprovedTitle: "暂无公开资源",
    noMatchingBody: "请尝试使用其他关键词或清除当前的标签筛选。",
    noApprovedBody: "公开模型库目前为空。审核通过的资源会自动显示在这里。",
    approvedResource: "公开资源",
    viewDetailsAndDownload: "查看与下载",
    createdOn: (dateLabel: string) => `创建于 ${dateLabel}`,
  },
  modelDetail: {
    loadingTitle: "加载模型中",
    loadingBody: (id: string) => `正在请求...接口 \`/api/models/${id || ":id"}\`。`,
    unavailableTitle: "不可查看模型",
    notFound: "未找到该模型。",
    failedLoad: (errorMessage: string) => `无法加载模型详情：${errorMessage}`,
    backToHome: "返回首页",
    closePreviewAriaLabel: "关闭预览",
    preview: "预览",
    modalKicker: "模型预览",
    pageKicker: "模型详情",
    createdOn: (dateLabel: string) => `创建于 ${dateLabel}`,
    downloadZip: "下载 ZIP",
    preparingPreview: "准备 3D 预览中...",
  },
  upload: {
    kicker: "公开上传",
    title: "上传模型以供审核",
    intro: "请上传一张封面图片和一个 ZIP 文件。在管理员完成审核前，资源将保持待审核状态。",
    titleLabel: "标题",
    titlePlaceholder: "模型资产包",
    descriptionLabel: "详情",
    descriptionPlaceholder: "描述模型及其用途。",
    contactLabel: "联系方式 (QQ / 微信 / 邮箱)",
    contactPlaceholder: "邮箱：your-name@example.com",
    presetTagsLabel: "预设标签",
    presetTagsHelp: (maxTags: number) => `最多选择 ${maxTags} 个公开标签。这些标签将在审核通过后对访客可见。`,
    suggestedTagsLabel: "建议标签",
    suggestedTagPlaceholder: "向管理员建议新标签",
    addSuggestion: "添加建议",
    suggestedTagsHelp: "建议标签不会公开。仅管理员可决定将其转为新的公开标签，或作为现有标签的别名。",
    coverImageLabel: "封面图片",
    coverImageHelp: "支持格式：JPG, JPEG, PNG, WEBP。最大 2MB。",
    modelZipLabel: "模型 ZIP",
    modelZipHelp: (maxMb: number) => `仅支持 ZIP 格式。最大 ${maxMb}MB。`,
    reset: "重置",
    uploading: "上传中...",
    uploadForReview: "提交审核",
    draftHelp: "文本字段、已选预设标签和建议标签将保存在本地浏览器中。刷新或重置后需重新选择文件。",
    rulesTitle: "上传规则",
    rulesAllFields: "所有字段均必填。",
    rulesSingleFiles: "仅允许上传一张封面图片和一个 ZIP 文件。",
    rulesPublicAfterReview: "模型在管理员审核通过后才会公开。",
    uploadId: "上传 ID",
    status: "状态",
    statusValues: {
      pending: "待审核",
      approved: "已通过",
      rejected: "已拒绝",
    },
    failedUpload: "上传失败，请重试。",
    successReceived: "投稿接收成功，请等待审核。",
    requiredFields: "请填写所有必填文本字段。",
    requiredFiles: "请上传封面图片和 ZIP 文件。",
    coverImageType: "封面图片必须为 JPG, JPEG, PNG 或 WEBP 格式。",
    coverImageMaxSize: "封面图片大小不能超过 2MB。",
    zipType: "模型文件必须为 ZIP 压缩包。",
    zipMaxSize: (maxMb: number) => `模型 ZIP 大小不能超过 ${maxMb}MB。`,
    presetTagsLimit: (maxTags: number) => `请最多选择 ${maxTags} 个预设标签。`,
    suggestedTagsLimit: (maxTags: number) => `请最多使用 ${maxTags} 个建议标签。`,
    tagLength: (minLength: number, maxLength: number) =>
      `每个标签的长度必须在 ${minLength} 到 ${maxLength} 个字符之间。`,
  },
  adminLogin: {
    kicker: "管理员入口",
    title: "登录管理面板",
    intro: "仅预设的管理员账户可以访问待审核投稿的审核操作。",
    username: "用户名",
    usernamePlaceholder: "输入用户名",
    password: "密码",
    signingIn: "登录中...",
    signIn: "登录",
    workflowTitle: "审核流程",
    workflowIntro: "登录后，管理员可以在管理面板中：",
    workflowView: "查看所有投稿或按照审核状态进行筛选。",
    workflowInspect: "查看联系方式、封面图片和存储的 ZIP 文件名。",
    workflowManage: "通过、拒绝或删除投稿。",
    goToDashboard: "前往管理面板",
    openDashboard: "打开管理面板",
    requiredCredentials: "请输入用户名和密码。",
    failedLogin: "登录失败，请重试。",
  },
  admin: {
    kicker: "管理员管理面板",
    title: "审核投稿",
    intro: "选择一条记录查看详情并更新其审核状态。",
    logout: "退出登录",
    filters: {
      pending: "待审核",
      approved: "已通过",
      rejected: "已拒绝",
      all: "全部",
    },
    status: {
      pending: "待审核",
      approved: "已通过",
      rejected: "已拒绝",
    },
    loadingSubmissions: "加载投稿中...",
    noMatchingSubmissions: "没有匹配当前筛选条件下的投稿。",
    createdOn: (dateLabel: string) => `创建于 ${dateLabel}`,
    noSubmissionSelectedTitle: "未选择投稿",
    noSubmissionSelectedBody: "从列表中选择一项查看详情。",
    detailKicker: "投稿详情",
    loadingSelectedSubmission: "加载所选投稿中...",
    statusLabel: "状态",
    contactLabel: "联系方式",
    zipFileLabel: "ZIP 文件",
    createdLabel: "创建时间",
    reviewedLabel: "审核时间",
    rejectReasonLabel: "拒绝原因",
    notReviewedYet: "未审核",
    publicTagsLabel: "公开标签",
    publicTagsHelp: (maxTags: number) =>
      `最多选择 ${maxTags} 个公开标签。这些是审核通过后访客唯一可见的标签。`,
    noPublicTagsSaved: "尚未保存公开标签。",
    saveTags: "保存标签",
    privateSuggestedTagsLabel: "私有建议标签",
    privateSuggestedTagsHelp: "这些建议在审核前仅对管理员可见。",
    noPrivateSuggestedTags: "未提交私有建议标签。",
    rejectReasonPlaceholder: "请说明拒绝此投稿的原因。",
    downloadZip: "下载 ZIP",
    approve: "通过",
    reject: "拒绝",
    delete: "删除",
    publicTagsLimit: (maxTags: number) => `请最多选择 ${maxTags} 个公开标签。`,
    requiredRejectReason: "请在拒绝前输入拒绝原因。",
    requestFailed: "请求失败，请重试。",
    successTagsSaved: "投稿标签更新成功。",
    successApproved: "投稿已通过审核。",
    successRejected: "投稿已拒绝。",
    successDeleted: "投稿已删除。",
  },
  viewer: {
    backgroundGroupAriaLabel: "背景颜色",
    backgroundPresetLabels: {
      white: "白色",
      black: "黑色",
      softWhite: "柔和白",
      softBlack: "柔和黑",
    },
    switchBackgroundTo: (label: string) => `切换背景至 ${label}`,
    resetView: "重置视角",
    close: "关闭",
    unavailable: "此文件无法进行 3D 预览。",
    loading: "加载模型预览中...",
    hint: "拖拽旋转，滚动缩放。",
    srOnlyTitle: (title: string) => `${title} 3D 预览查看器。`,
  },
};

export const appMessages: Record<AppLocale, AppCopy> = {
  en,
  "zh-CN": zhCN,
};

export function normalizeAppLocale(value: unknown): AppLocale | null {
  if (typeof value !== "string") {
    return null;
  }

  if (value === "zh-CN" || value.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }

  if (value === "en" || value.toLowerCase().startsWith("en")) {
    return "en";
  }

  return null;
}

export function getPreferredAppLocale(): AppLocale {
  const storedLocale = normalizeAppLocale(window.localStorage.getItem(appLocaleStorageKey));

  if (storedLocale) {
    return storedLocale;
  }

  const browserLocales = window.navigator.languages.length > 0 ? window.navigator.languages : [window.navigator.language];

  for (const locale of browserLocales) {
    const normalizedLocale = normalizeAppLocale(locale);

    if (normalizedLocale) {
      return normalizedLocale;
    }
  }

  return defaultAppLocale;
}

export function toIntlLocale(locale: AppLocale) {
  return locale === "zh-CN" ? "zh-CN" : "en-US";
}
