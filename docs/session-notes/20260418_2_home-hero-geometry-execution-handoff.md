# MeshFree 首页 Hero / 几何元素执行交接稿

以下内容用于直接交接给新对话继续执行。目标是让下一轮对话在不重复讨论的情况下，直接进入实现。

## 1. 当前项目状态

- 项目：`MeshFree`
- 当前分支：`feature/TabBar`
- 当前阶段：`MeshFree MVP` 已跑通、已部署、已完成 `v0.1.0` 版本整理
- 当前已经完成第一阶段全局结构调整：
  - 固定顶栏
  - 新的 `tabbar` 结构
  - 新的 `footer`
  - favicon 已接入
  - 页面标题已改为 `MeshFree-...`
  - 圆角系统已整体收紧为更偏矩形的小圆角

## 2. 当前已确认的导航结构

顶栏从左到右固定为：

- `MeshFree`
- `Gallery`
- `Search` 占位
- `About`
- `Sign in / Sign up`
- `Upload`

行为规则：

- `MeshFree`：返回首页顶部 Hero 区
- `Gallery`：滚动到模型区
- `About`：滚动到底部 footer
- `Search`：当前只做纯占位，不实现真实搜索
- `Sign in / Sign up`：统一登录入口
- 登录后右上角显示用户名文字，点击进入 `dashboard`
- `Upload`：进入投稿页

## 3. 当前已确认的 footer 结构

footer 为三行：

1. About 简短说明
2. `Copyright © 2026 Noctiluca`
3. 链接组：
   - `GitHub`
   - `Contact: constellnoc@gmail.com`

当前已去掉：

- 单独的 `Admin` 入口
- `Author` 独立展示项

## 4. 下一轮要做的核心主题

下一轮要实现的是：

- 首页上半部分 Hero 区
- 几何元素视觉系统
- Hero 到 `Gallery` 的无缝过渡

注意：

- 这轮不是继续改 `tabbar` / `footer`
- 这轮不是继续做配色
- 这轮不是继续做用户系统
- 重点是首页 Hero 与 Gallery 一体化体验

## 5. 已确认的视觉和结构方向

### 5.1 总体方案

采用“方案 A：一页式无缝过渡”。

含义：

- 首页和 `Gallery` 分开，但又是一体
- 页面上半部分先是 Hero / 介绍区
- 页面下半部分自然进入模型区
- 用户滚动时几乎感觉不到切换
- 不做两个硬切页面

### 5.2 Hero 结构方向

Hero 区需要承担：

- 品牌第一印象
- 开源精神表达
- 视觉设计感
- 向模型区自然引导

主标题已选定为：

`Open resources, open creativity.`

副文案已确认放在 Hero，而不是 footer：

`MeshFree is a lightweight platform for browsing, sharing, and reviewing 3D model resources.`

这句副文案要浮在几何图形之上。

## 6. 几何元素执行要求

### 6.1 几何元素数量

Hero 区使用：

- 2 到 4 组几何元素

不要太多，不要做满屏复杂装饰。

### 6.2 几何元素层级

要求：

- 不同透明度
- 不同前后层级
- 有主次关系
- 不要遮挡主要文字

### 6.3 滚动时的变化

滚动交互只做轻量变化，要求：

- 轻微位移
- 轻微旋转
- 轻微缩放

不要做剧烈变形，不要做强控制感切换。

### 6.4 到模型区后的处理

当页面进入模型区时，几何元素需要：

- 逐渐淡出
- 或退到背景层

要求是：

- 模型区成为视觉主角
- 几何元素不再抢占注意力

## 7. 对实现风格的限制

### 必须遵守

- 顶栏已经固定，不要推翻
- 不要重新改 footer 结构
- 不要重新放大圆角
- 不要把 Hero 做成过于夸张的实验性动效页
- 不要让几何元素影响文字可读性
- 不要把首页和 Gallery 做成两个强切换页面

### 风格要求

- 简洁
- 现代
- 干净
- 有设计感
- 有轻量动效
- 不要显得廉价或默认 AI 模板味

## 8. 技术和实现建议

下一轮实现时建议：

1. 在首页 `HomePage` 中加入 Hero 区和过渡区结构
2. 保留现有模型区作为 Gallery 主体
3. 用轻量 CSS / 前端交互做滚动响应
4. 控制动画强度，不要一开始上复杂库
5. 若要加导航高亮变化，只做轻量状态切换

## 9. 当前不做的内容

本轮不要扩展到以下内容：

- 真正的搜索功能
- 普通用户系统
- 额外后台入口设计
- 新的配色系统
- 重做 footer
- 重做版本文档

## 10. 新对话可直接使用的执行提示词

下面这段可以直接发给新对话：

---

请继续 `MeshFree` 当前分支 `feature/TabBar` 的前端实现。

当前已经完成：

- 固定顶栏
- 新 `tabbar` 结构：
  - MeshFree
  - Gallery
  - Search 占位
  - About
  - Sign in / Sign up
  - Upload
- footer 三行结构
- favicon 已接入
- 页面标题已改为 `MeshFree-...`
- 全站圆角已收紧为更偏矩形的小圆角系统

这轮只做首页 Hero / 几何元素 / Gallery 一体化，不要重做导航、footer、配色。

要求如下：

1. 采用“一页式无缝过渡”方案
2. 首页上半部分做 Hero / Intro 区
3. Hero 区加入 2 到 4 组几何元素
4. 几何元素要有不同透明度和层级
5. 滚动时只做轻微位移、旋转、缩放
6. 到模型区时，几何元素逐渐淡出或退到背景
7. 主标题使用：
   - `Open resources, open creativity.`
8. 副文案使用：
   - `MeshFree is a lightweight platform for browsing, sharing, and reviewing 3D model resources.`
9. 副文案放在首页 Hero 中，浮在几何图形之上
10. 不要让视觉动效影响文字阅读
11. 不要做成两个硬切换页面
12. 保持当前干净、现代、克制的产品感

请先说明你打算怎么做和为什么这样做，再开始改代码。

---
