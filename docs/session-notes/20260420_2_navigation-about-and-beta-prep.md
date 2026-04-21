# MeshFree 导航重构、About 拆分与 beta 准备

## 1. 本轮主题

本轮主要处理三件事：

- 重构顶部导航高亮逻辑
- 把 `About` 从 footer 里拆出来
- 为 `v0.3.0-beta.1` 做文档与发布准备

一句话：

- 导航语义开始变清楚，`About` 不再是假 footer。

## 2. 本轮已确认的产品规则

本轮已确认：

- `MeshFree` 代表首页顶部状态
- `Gallery` 代表首页公开模型区
- `About` 不再绑定 footer
- 点击 `About` 进入独立页面
- 顶部导航高亮要可扩展，后面可继续加 tab
- 这阶段不加复杂动画，激活态先只做蓝色文字

一句话：

- 导航现在按“页面 / 主区块”表达，不再按 hash 拼凑。

## 3. 本轮已落地的结构调整

已完成：

- 新增独立 `About` 页面
- 抽出公共站点信息块 `SiteInfoBlock`
- footer 与 `About` 取消绑定
- `/about` 页面暂时不再显示 footer
- 顶部导航改为配置驱动的 section 结构

涉及重点：

- `MeshFree`
- `Gallery`
- `About`

一句话：

- `About` 现在是页面，不再是假装成页脚锚点。

## 4. 导航当前逻辑

当前导航逻辑：

- 在首页顶部时，高亮 `MeshFree`
- 进入 `gallery` 主视区后，高亮 `Gallery`
- 进入 `/about` 后，高亮 `About`
- 点击 `MeshFree` 回首页顶部
- 点击 `Gallery` 跳首页并滚到 `gallery`
- 点击 `About` 进入独立 `About` 页面

一句话：

- 现在顶部导航已经开始按“用户当前在哪”来表达。

## 5. 标签系统当前理解

这轮顺手确认了一件重要的认知点：

- 现在不是“没有备选标签”

当前标签来源分两层：

- 代码里有预设规范标签 `presetTagDefinitions`
- 运行时会通过 `syncPresetTags()` 同步到数据库

这意味着：

- 用户侧能看到正式可选标签
- 用户也能提交私有建议标签
- 私有建议标签不会直接变公开标签

一句话：

- 现在已经有备选标签，只是不是随便输入就自动公开。

## 6. 上传大小调整

本轮已把模型包上传大小上限从：

- `20MB`

调整到：

- `50MB`

同步位置：

- 前端上传页校验
- 后端提交校验
- `multer` 上传限制

一句话：

- 当前默认策略是优先兼顾上传自由和在线预览稳定。

## 7. 本轮涉及的主要文件

- `client/src/components/Layout.tsx`
- `client/src/components/SiteInfoBlock.tsx`
- `client/src/pages/AboutPage.tsx`
- `client/src/pages/HomePage.tsx`
- `client/src/pages/SubmitPage.tsx`
- `client/src/App.tsx`
- `client/src/index.css`
- `server/src/middleware/upload.ts`
- `server/src/routes/submissions.ts`
- `server/src/lib/tags.ts`

## 8. 当前阶段结论

截至本轮结束，项目前台结构已经从：

- 首页 + footer 假 about

推进到：

- 首页主区
- 独立 `About` 页面
- 可扩展顶部导航状态
- 更清晰的标签认知
- `50MB` 模型包上传上限

一句话：

- 项目现在更像一个能继续长的站，而不只是拼起来的 MVP 页面。

## 9. 下一步建议

下一步建议优先做：

1. 把 `About` 页面从“复制 footer 内容”升级成真正页面结构
2. 继续验证导航高亮边界体验
3. 继续完善管理员处理建议标签的 UI
4. 为 `v0.3.0-beta.1` 整理正式 release notes 与 changelog
