# MeshFree 标签治理与多语言升级总结

## 1. 本轮主题

这轮主题很明确：

- 不再把“用户输入的标签文本”直接当公开标签
- 正式区分“规范标签”和“原始建议标签”
- 为未来中文 / 中英切换预留结构
- 用颜色深浅表达标签范围感

一句话：

- 标签现在开始从“文本”变成“受控概念”

## 2. 本轮已确认的产品规则

本轮已确认：

- 模型只绑定规范标签
- 规范标签由管理员决定
- 用户只能选择公开标签，或提交私有建议标签
- 私有建议标签默认不公开
- 管理员可决定：
  - 绑定到已有规范标签
  - 后续变成新规范标签
  - 后续变成已有标签别名

一句话：

- 用户有建议权
- 管理员有定义权

## 3. 本轮已落地的结构调整

后端标签结构已升级为：

- `Tag`
- `TagTranslation`
- `TagAlias`
- `SubmissionTag`
- `SubmissionRawTag`

并新增：

- `scopeLevel`
  - `broad`
  - `medium`
  - `specific`

一句话：

- 标签概念、标签显示、标签别名、用户原始输入，已不再混在一个字段里

## 4. 本轮已落地的页面与接口变化

### 4.1 公开侧

已完成：

- 首页标签列表改为从后端拉取
- 公开搜索改为搜索：
  - 标题
  - 简介
  - 标签 slug
  - 标签翻译名
  - 标签别名
- 详情页显示规范标签
- 标签颜色按 `scopeLevel` 映射深浅蓝

### 4.2 投稿侧

已完成：

- 投稿页拆成两块：
  - `Preset tags`
  - `Suggested tags`
- 公开标签由用户直接选择
- 建议标签作为私有输入提交
- 草稿保存已覆盖这两类标签状态

### 4.3 管理侧

已完成：

- 管理员可看到公开标签绑定
- 管理员可看到私有建议标签
- 管理员保存的是“公开规范标签绑定”

## 5. 本轮涉及的主要文件

- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260420113000_add_tag_localization_and_raw_tags/migration.sql`
- `server/src/lib/tags.ts`
- `server/src/routes/models.ts`
- `server/src/routes/submissions.ts`
- `server/src/routes/admin.ts`
- `server/src/routes/tags.ts`
- `server/src/index.ts`
- `client/src/types/tag.ts`
- `client/src/types/model.ts`
- `client/src/types/admin.ts`
- `client/src/api/tags.ts`
- `client/src/api/models.ts`
- `client/src/api/admin.ts`
- `client/src/pages/HomePage.tsx`
- `client/src/pages/SubmitPage.tsx`
- `client/src/pages/AdminDashboardPage.tsx`
- `client/src/pages/ModelDetailPage.tsx`
- `client/src/lib/tags.ts`
- `client/src/index.css`

## 6. 本轮顺手调整

已处理：

- 首页 hero 红框中的 `MeshFree MVP` 文案已移除

## 7. 当前还没做完的点

这轮还没做完，但方向已定：

- 管理员还没有专门的“把建议标签转成新标签 / 别名”的完整 UI
- 多语言切换 UI 还没正式做
- 当前默认仍按英文标签显示

一句话：

- 数据层先做对
- 管理工具和语言切换后补

## 8. 当前阶段结论

截至本轮结束，项目标签系统已经从：

- 直接存字符串标签

推进到：

- 规范标签
- 翻译显示名
- 别名
- 私有建议标签
- 管理员裁定
- 颜色表达标签范围

一句话：

- 标签系统已从“方便先用”升级到“可以长期维护”

## 9. 下一步建议

下一步建议优先做：

1. 管理员处理私有建议标签的专用操作
2. 新标签创建与别名归并界面
3. 数据库迁移落地到真实本地 / 服务器数据
4. 后续再考虑正式中英文切换 UI
