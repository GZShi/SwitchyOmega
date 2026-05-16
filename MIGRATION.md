# 技术栈现代化改造报告

> **时间范围:** 2026 年 5 月  
> **改造范围:** 全部 4 个核心模块（omega-pac, omega-target, omega-target-chromium-extension, omega-web）  
> **总体规模:** 314 个文件变更, +23,873 / -19,697 行, 23 个里程碑 commit

---

## 目录

1. [背景与目标](#背景与目标)
2. [改造全景图](#改造全景图)
3. [Phase 0: 工程基础现代化](#phase-0-工程基础现代化)
4. [Phase 1: 语言迁移 — CoffeeScript → TypeScript](#phase-1-语言迁移--coffeescript--typescript)
5. [Phase 2: 依赖与工具链现代化](#phase-2-依赖与工具链现代化)
6. [Phase 3: 平台升级 — Manifest V2 → V3](#phase-3-平台升级--manifest-v2--v3)
7. [Phase 4: 代码质量与工程体系](#phase-4-代码质量与工程体系)
8. [各模块现状](#各模块现状)
9. [关键数据](#关键数据)
10. [技术债清理记录](#技术债清理记录)

---

## 背景与目标

SwitchyOmega 是一个 Chromium 浏览器代理切换扩展，最初发布于 2015 年前后。在本次改造之前，代码库使用了大量当时流行但如今已过时的技术：

| 维度 | 改造前 | 改造后 |
|------|--------|--------|
| 编程语言 | CoffeeScript | TypeScript |
| 前端框架 | AngularJS 1.x + Jade 模板 | Vue 3 + SFC (Single File Components) |
| 构建工具 | Grunt + Bower + npm 2.x | pnpm workspaces + Vite + tsdown |
| 打包方式 | webpack (IIFE/UMD) | ESM + tree-shaking |
| 扩展平台 | Manifest V2 + 部分 Firefox | Manifest V3（纯 Chromium） |
| 异步模式 | Bluebird Promise + `.then()` 链 | 原生 Promise + async/await |
| 核心依赖 | uglify-js, bluebird, xhr, heap, tldjs, lolex | astring, heap-js, tldts, @sinonjs/fake-timers |
| 类型系统 | 无 | 全局类型安全，dts 生成 |
| CSS 方案 | Bootstrap 3 + 散落内联样式 | CSS 自定义属性 + Less + scoped styles |
| 开发体验 | 无 HMR，全量构建 | Vite HMR 热更新 |

改造遵循 **功能一致优先** 原则 —— 在所有行为保持与旧版完全一致的前提下，对底层技术栈进行彻底更新。

---

## 改造全景图

```
commit 时间线 ──────────────────────────────────────────────────────────────►

Phase 0          Phase 1               Phase 2            Phase 3       Phase 4
[45acd48]    [cf5b998→f2ce522]    [672d760→a39958b]    [7f1c113→32514b1]  [6495704→07aab7e]
   │              │                     │                    │                │
   │              │                     │                    │                │
   ▼              ▼                     ▼                    ▼                ▼
 Toolchain    CoffeeScript         依赖清理            MV2→MV3          代码质量
 现代化       → TypeScript         工具链升级           ESM现代化        工程体系
              4个模块并行            清除6个过时依赖        丢弃Firefox      22项修复
              0个.coffee残留         0个Jade残留           Service Worker   42个类型错误
```

## Phase 0: 工程基础现代化

### 里程碑: `45acd48` — modernize toolchain to pnpm + webpack

**改造前：**
- 全局安装 `grunt-cli@1.2.0` + `bower`
- 特殊构建目录 `omega-build/`，`npm run deps` 手动装依赖
- CircleCI 持续集成
- Grunt watch 全量构建

**改造后：**
- pnpm workspaces 统一管理 4 个 package
- webpack 5 作为主力打包工具
- 专用 Node 脚本处理扩展装配和 locale 生成
- GitHub Actions 替代 CircleCI

**变更规模:** 55 files, +5,783 / -872

---

## Phase 1: 语言迁移 — CoffeeScript → TypeScript

这是本次改造中体量最大、最核心的四个里程碑，覆盖全部 4 个模块。所有 `.coffee` 源文件被删除，`.jade` 模板被 Vue SFC 替代。

### 里程碑 1: `cf5b998` — omega-pac: CoffeeScript → TypeScript

**omega-pac** 是 PAC（Proxy Auto-Config）脚本生成模块，负责将代理配置编译为 PAC 脚本。

| 方面 | 改造前 | 改造后 |
|------|--------|--------|
| 源文件 | 6 个 `.coffee` | 8 个 `.ts`（含 types.ts） |
| 测试文件 | 6 个 `.coffee`（Mocha） | 7 个 `.test.ts`（Vitest） |
| 类型 | 无 | 完整类型定义 + dts 生成 |

核心模块：
- `conditions.ts` — 条件匹配引擎（IP 地址、域名、URL 模式）
- `profiles.ts` — 5 种代理配置模式（Fixed/Proxy/System/Direct/AutoDetect）
- `rule_list.ts` — 规则列表解析与匹配
- `pac_generator.ts` — PAC 脚本生成器
- `shexp_utils.ts` — Shell 表达式工具
- `astree/` — 新增 ESTree AST 构建工具层

**变更规模:** 30 files, +4,416 / -3,257

### 里程碑 2: `b165ebb` — omega-target: CoffeeScript → TypeScript

**omega-target** 是浏览器无关的选项管理与配置应用逻辑层。

核心模块：
- `options.ts` — 配置模型（Options 基类，含 Profiles/Proxy 管理）
- `options_sync.ts` — 跨上下文配置同步（TokenBucket 限流）
- `storage.ts` — 抽象存储层（chrome.storage 适配）
- `browser_storage.ts` — 浏览器存储接口定义
- `log.ts` — 日志管理

**变更规模:** 27 files, +2,586 / -1,904

### 里程碑 3: `b0fa92e` — omega-target-chromium-extension: CoffeeScript → TypeScript

**omega-target-chromium-extension** 是 Chromium 扩展层，包含浏览器特定实现和后台脚本。

核心模块：
- `module/chrome_api.ts` — Chrome API 封装
- `module/options.ts` — ChromeOptions（继承 omega-target Options）
- `module/fetch_url.ts` — HTTP 请求（fetch API）
- `module/proxy/` — 代理实现（认证、配置应用）
- `src/background/` — Service Worker 后台脚本
- `popup/` — 弹出窗口资源

**变更规模:** 51 files, +3,254 / -2,443

### 里程碑 4: `f2ce522` — omega-web: CoffeeScript + AngularJS → TypeScript + Vue 3

这是体量最大的单次模块迁移。从 AngularJS 1.x MVC 架构完全重写为 Vue 3 Composition API。

**改造前：**
- AngularJS 1.x 控制器（`omega/controllers/*.coffee`，~15 个文件）
- Jade 模板引擎（`src/partials/*.jade`，~25 个模板）
- Angular Directive/Filter（`directives.coffee`, `filters.coffee`）
- CoffeeScript 入口（`options.coffee`, `popup.coffee`）

**改造后：**
- Vue 3 SFC 组件（39 个 `.vue` 文件）
- Pinia 状态管理（3 个 store：options, popup, ui）
- Vue Router（options 页面路由）
- Vite 构建（HMR 开发服务器 + 生产构建）
- TypeScript 全面覆盖
- Less CSS 预处理，CSS 自定义属性

新增架构组件：
- **Options Page（选项页面）:** App.vue → NavigationSidebar + ProfileSelect + 5 个页面（General/Profile/Io/About/Ui）+ 12 个 Modal 组件 + 5 个 Profile Editor
- **Popup（弹出窗口）:** PopupApp.vue → PopupMenuNav + ConditionForm + RequestInfoDetails + KeyboardHelp
- **Service Layer:** 抽象 Chrome API 调用，集中于 `services/chrome/` 目录
- **Composables:** `useOmegaTarget`, `usePopupTarget` 等可组合函数

**变更规模:** 114 files, +6,416 / -5,064

---

## Phase 2: 依赖与工具链现代化

### 里程碑 5: `672d760` — 清除过时依赖

一次性清除 6 个老旧第三方依赖，全部替换为现代替代方案：

| 旧依赖 | 新方案 | 模块 |
|--------|--------|------|
| bluebird | 原生 Promise | omega-target, omega-target-chromium-extension |
| xhr | 原生 fetch() | omega-target-chromium-extension |
| heap | heap-js | omega-target-chromium-extension |
| tldjs | tldts ^6.1 | omega-pac |
| lolex | @sinonjs/fake-timers | omega-pac |
| po2json | gettext-parser | omega-target-chromium-extension |

同时升级：
- `ip-address` ^4 → ^10（API 适配，`isValid()` → try/catch）
- `limiter` ^1 → ^3（TokenBucket 包装层保持旧接口兼容）
- `jsondiffpatch` 0.1.43 → 0.7.3（omega-web）
- `file-saver` ^1.3.3 → ^2.0.5

**pnpm-lock.yaml 净减约 542 行。**

**变更规模:** 31 files, +989 / -1,195

### 里程碑 6: `f7cd4da` — omega-pac: 替换 uglify-js

uglify-js 2.8.29（已停止维护约 10 年）被完全替换：

| 组件 | 旧方案 | 新方案 |
|------|--------|--------|
| AST 打印 | uglify-js OutputStream | astring 1.9 (16KB, 0 dep) |
| AST 构造 | U2.AST_* 构造器 | 自建 builders.ts（40 个工厂函数） |
| 变量混淆 | U2.Compressor + mangle_names | 自建 mangler.ts（作用域感知） |
| 构建工具 | webpack + ts-loader + terser | tsdown + rolldown |

**包体积对比：**
- UMD: 870KB → 174KB (-80%)
- CJS: 276KB → 60KB
- 新增 ESM 产物: 58KB

**变更规模:** 23 files, +1,586 / -7,755

### 里程碑 7-11: 持续工具链升级

| 里程碑 | 内容 | 规模 |
|--------|------|------|
| `5dad0b3` | omega-pac 源码现代化（移除 self shim，现代 JS API，添加类型） | 8 files, +182/-224 |
| `8506347` | omega-pac: tsdown 0.22.0 + ESLint flat config | 10 files, +991/-287 |
| `bf45538` | omega-target: webpack → tsdown，现代化 TypeScript | 24 files, +1,504/-799 |
| `b0aa4f9` | omega-target-chromium: ESM 现代化，目录重构，ESLint 清理 | 41 files, +1,678/-2,949 |
| `a39958b` | jsondiffpatch 0.7.3 + omega-web ESLint | 50 files, +2,807/-1,793 |

---

## Phase 3: 平台升级 — Manifest V2 → V3

### 里程碑 12: `7f1c113` — Manifest V3 迁移，丢弃 Firefox 支持

Chrome 扩展平台从 Manifest V2 升级到 V3，同时移除 Firefox 兼容层：

**核心变更：**
- `background.page` → `service_worker`（后台页面 → Service Worker）
- `browser_action` → `action` API
- 新增 `host_permissions` 声明
- CSP 策略更新
- 移除 Firefox 特定 manifest 条目和构建步骤
- 删除旧版代理实现（`proxy_impl_listener`, `proxy_impl_script`, `webext_proxy_script`）
- 新增 `chrome_browser_storage` 模块

**变更规模:** 29 files, +463 / -1,030

### 里程碑 13: `32514b1` — 完成 MV2→MV3 迁移，全面 ESM 现代化

第二波 MV3 迁移，深度完成所有改造：

**平台 API 迁移：**
- Canvas DOM → OffscreenCanvas
- FileSaver → FileReader
- `chrome.browserAction` → `chrome.action`
- `chrome.extension.getURL` → `chrome.runtime.getURL`
- `localStorage` → `chrome.storage.local`
- `webRequestBlocking` → 移除（MV3 不支持）
- `onAuthRequired` → async（MV3 异步模式）

**ESM 现代化：**
- 所有后台脚本从全局 script 转为 ES module（`import/export` 替代 `importScripts`）
- Options/Popup 页面通过 Vite 打包为 ESM
- 移除 `omega_pac.min.js` (UMD) 和 `omega_target.min.js` (IIFE)
- 构建管线简化：7 个入口 → 5 个，全部 ESM 输出
- 开启 sourcemap，关闭代码压缩

**Bug 修复：**
- 修复 `sync.enabled` 在 Service Worker 启动时默认为 `true` 导致的同步问题
- 修复 `refreshActivePageIfEnabled` 逻辑（默认关闭）
- 修复 Context Menu 竞态条件
- 添加 Service Worker 重启时的日志持久化

**变更规模:** 40 files, +434 / -743

---

## Phase 4: 代码质量与工程体系

### 里程碑 14: `6495704` — ESLint 规则收紧与修复

统一所有模块的 ESLint 配置，修复所有 lint 错误和警告：

- 移除无用的 ESLint 配置和过度的规则压制
- 修复 `no-var` 违规（`declare var` → `declare let`）
- Vue 编辑器组件从 prop mutation 改为 `defineModel()` 双向绑定
- `computed()` 副作用修正为 `watchEffect()`
- 自动修复：`startsWith` 字符匹配、模板字符串、可选链、`??` 替代 `||`、箭头函数

**变更规模:** 29 files, +543 / -593

### 里程碑 15: `cf23a6a` — 构建产物清理与命名规范化

- 过滤构建脚本中的 `.DS_Store`
- 禁用 sourcemap 生成（节省 941KB）
- 移除空的 guide 入口点和冗余的动态脚本加载
- popup CSS 重命名为 `popup.css`
- 后台源文件统一 kebab-case 命名
- 构建输出目录结构优化（`options.html` → `options/index.html`）
- 剔除 `AUTHORS` 文件

**变更规模:** 35 files, +857 / -1,043

### 里程碑 16: `9f73c82` — Promise 链全面 async/await 化

消除全部 25 处 `.then()` 调用（覆盖 12 个源文件），统一为 async/await 模式。Fire-and-forget 模式保留语义使用 `void (async () => {...})()`。

**变更规模:** 24 files, +458 / -404

### 里程碑 17: `7673066` — Vite HMR 开发服务器

引入 HMR 热更新开发工作流：

- Extension 页面从 `vite build --watch` 全量构建切换为 Vite dev server 实时提供 JS
- 通过轻量级 HTML wrappers 从 dev server 加载页面资源
- Vue SFC / TypeScript / CSS 变更即时热更新，无需手动刷新
- 新增 `dev-init.js` 生成带 dev CSP 的 extension build 目录
- 生产构建不受影响

**变更规模:** 5 files, +271 / -2

### 里程碑 18: `e58c81d` — UI 遗留 parity 修复 + i18n 现代化

逐项对比旧版 AngularJS/CoffeeScript 代码与新 Vue 3 代码的 UI 行为，修复所有行为差异：

**i18n 现代化：**
- 引入全局 `$t()`（通过 `app.config.globalProperties`）
- 模板中 269 处 `omega.getMessage()` 全部替换为 `$t()`
- 17 个文件在 script 上下文中使用 `$t` 以 `getMessage` 别名导入

**Options 页面修复：**
- AboutPage: 动态版本号、缺失免责声明/footer、应用图标、实验性功能警告
- GeneralPage: profile 名称参数化 i18n
- NavigationSidebar: legacy 结构还原（单一 ul、li.divider、li.nav-header）、Tab 图标修正、始终可见的 apply/discard 按钮

**Profile Editor 修复：**
- FixedProfileEditor: 默认端口/主机自动填充、直连 fallback、认证清理、bypassList 失焦模式
- SwitchProfileEditor: TrueCondition 迁移、rule 删除/重置/解绑确认对话框、条件编辑器脏检查、错误消息翻译

**Popup 修复：**
- 外部 profile 编辑 UI 含名称验证
- 全局 `window.onerror` 处理器
- Condition 模式自动更新
- RequestInfoDetails 帮助区和配置监控按钮

**Chrome API 集中化：**
- `services/chrome/platform.ts`: 集中化的 `isFirefox` 检测
- `services/chrome/runtime.ts`: `getManifest()` 封装
- `services/errorLog.ts`: localStorage 日志读写
- 移除分散在组件中的 `chrome.*`/`navigator`/`localStorage` 调用

**变更规模:** 43 files, +1,225 / -422

### 里程碑 19: `23010a5` — Popup 添加条件直达（RPC）

彻底消除从 popup 跳转到 options 页面添加条件/规则的旧流程：

- Popup 通过 `addCondition`/`addTempRule` RPC 直接添加条件和规则
- 替换 fire-and-forget `sendMessageNoReply` 为 request/response `callBackground`
- 实时请求错误信息更新（通过 `chrome.runtime.Port` 从 background 推送）
- `chrome.storage.onChanged` 跨上下文 profile 同步（300ms 防抖）
- 表单验证和行内错误显示
- 切换 profile 后自动刷新活动页面

**新增 CLAUDE.md**（项目架构文档，273 行）

**变更规模:** 12 files, +598 / -149

### 里程碑 20: `7d08630` — 解决全部 42 个 tsc 类型错误

跨 4 个模块彻底清除所有 TypeScript 编译错误：

- omega-pac: 开启 dts 生成（`dts: false → true`），AST 节点类型窄化
- omega-target: 开启 dts 生成，基类返回类型泛化以兼容子类重写
- omega-web: 手写的 `chrome` 命名空间声明替换为官方 `@types/chrome`
- omega-target-chromium-extension: null-check 修复，MV3 兼容 cast

**变更规模:** 24 files, +46 / -34

### 里程碑 21-22: `60107da` + `07aab7e` — omega-web 全面代码质量改造

两次深度代码质量审查与重构，清理 20 HIGH / 23 MEDIUM / 17 LOW 问题：

**Phase 1 — 消除重复：**
- 提取 `BaseModal.vue`（含 focus trap、aria-modal、role=dialog），12 个 Modal 组件统一继承（消除 ~360 行样板代码）
- 提取共享函数：`formatDate`, `profileOrder`, `selectableProfiles`, `resolveTargetProfile`
- 删除重复的 `.virtual-profile-icon` CSS、无用的 CSS 声明、空 style 块

**Phase 2 — 反模式清理：**
- `window.__omegaUi` 全局变量替换为 `uiStore`（5 个调用点）
- `KeyboardEvent.keyCode` 迁移为 `e.key`
- KeyboardHelp 注入的 DOM 元素添加 `onUnmounted` 清理
- `<a role=button>` 替换为 `<button>`
- `lang`/`viewport` meta 标签添加
- `errorLog` localStorage 添加 100KB 大小限制
- 统一 `callBackground` 错误处理

**Phase 3 — 样式架构：**
- 17 个 CSS 自定义属性（颜色、间距、断点）
- 移除 22 处 `!important` 覆写
- 移除 3 个页面组件中重复的行内 page-header 样式

**Phase 4 — 类型安全：**
- 移除 `declare let chrome: any`，全面使用 `@types/chrome`
- 添加 storage/i18n/tabs wrappers 的类型

**第二轮（07aab7e）— CRITICAL 修复 + 技术债清理：**

- **CRITICAL:** ProfileSelect VirtualProfile 图标/颜色解析修复（传空对象而非真实 options map）
- **HIGH:** PopupApp 箭头键快捷键修复（`toLowerCase()` 破坏了 `ArrowUp`/`ArrowDown`）
- **HIGH:** NavigationSidebar 当前 profile 高亮修复（`params.name` 为数组）
- **HIGH:** optionsStore `applyOptions` 缺少 try-catch；3 处 mutation 改为不可变模式
- **HIGH:** popupStore `setRequestInfoCallback` 内存泄漏修复
- **HIGH:** IoPage 同步操作的 3 个空 catch 块添加错误提示
- **HIGH:** `window.onbeforeunload` → `addEventListener` + 清理
- **HIGH:** runtime.ts 添加 5 秒 RPC 超时
- **HIGH:** storage.ts 移除 `as any` cast，添加 `chrome.runtime.lastError` 检查
- **HIGH:** tabs.ts 修复不安全 non-null 断言

**技术债清理（5 项）：**
1. 提取 `omegaTargetBase.ts` — 共享 RPC 方法合并为工厂函数（消除 ~120 行重复）
2. `SwitchProfileEditor.vue` 923→638 行 — 拆分为 ConditionDetailCell、ConditionHelpSection、SwitchRulesFooter、AttachedRuleListConfig
3. `KeyboardHelp` 声明式重构 — 消除 DOM 注入，共享 `keymap.ts` 常量，通过 `v-if` 条件渲染
4. Modal 可见性标准化 — `DeleteAttachedModal`、`RuleRemoveConfirmModal`、`RuleResetConfirmModal` 从 `:show` prop 改为父组件 `v-if`
5. `beforeunload` 监听器在 `onBeforeUnmount` 中正确清理

**变更规模:** 44 files + 35 files, +1,447 / -1,709

---

## 各模块现状

### omega-pac（PAC 生成核心）
```
src/
├── astree/          # ESTree AST 构建器（builders.ts, mangler.ts）
├── conditions.ts    # 条件匹配引擎
├── profiles.ts      # 5 种代理配置模式
├── rule_list.ts     # 规则列表引擎
├── pac_generator.ts # PAC 脚本生成
├── shexp_utils.ts   # Shell 表达式工具
├── types.ts         # 公共类型定义
├── utils.ts         # 工具函数
└── index.ts         # 入口
```
- TypeScript 全面覆盖，完整 dts 输出
- tsdown 构建，ESM/CJS/UMD 三格式输出
- UMD 包体积减少 80%（870KB → 174KB）
- 143 个测试全部通过（Vitest）

### omega-target（选项管理逻辑层）
```
src/
├── options.ts       # Options 基类
├── options_sync.ts  # 跨上下文同步
├── storage.ts       # 抽象存储
├── browser_storage.ts
├── default_options.ts
├── log.ts
├── errors.ts
└── types.ts
```
- TypeScript，完整 dts 输出
- tsdown 构建
- 无浏览器依赖，纯逻辑层

### omega-target-chromium-extension（Chromium 扩展层）
```
src/
├── background/      # Service Worker 后台脚本
├── module/          # Chrome 特定实现
│   ├── chrome_api.ts
│   ├── fetch_url.ts
│   ├── options.ts   # ChromeOptions
│   └── proxy/       # 代理实现
└── shim/            # Polyfills
```
- Manifest V3，ESM Service Worker
- Chrome 特定 API 封装
- @types/chrome 全局类型

### omega-web（Web 配置界面）
```
src/
├── options/         # 选项页面（Vue 3 + Router）
│   ├── App.vue
│   ├── components/  # 15+ 组件（Editors, Modals, Nav）
│   └── pages/       # 5 个页面
├── popup/           # 弹出窗口
│   └── components/  # 6 个组件
├── stores/          # Pinia 状态管理（3 个 store）
├── services/        # Service 层（Chrome API 封装）
├── composables/     # Vue Composables
├── styles/          # Less + CSS 自定义属性
├── types/           # TypeScript 类型定义
└── plugins/         # Vue 插件（i18n）
```
- Vue 3 Composition API + Pinia + Vue Router
- Vite 构建（HMR 开发 + 生产）
- 39 个 SFC 组件
- CSS 自定义属性体系（17 个变量）
- 12 个 Modal 统一继承 BaseModal

---

## 关键数据

| 指标 | 数值 |
|------|------|
| CoffeeScript 文件（改造前） | ~90+ |
| CoffeeScript 文件（改造后） | 0 |
| Jade 模板（改造前） | ~28 |
| Jade 模板（改造后） | 0 |
| TypeScript 文件（改造后） | 92 |
| Vue SFC 组件（改造后） | 39 |
| 删除代码行数 | ~19,697 行 |
| 新增代码行数 | ~23,873 行 |
| 净增代码 | ~4,176 行 |
| 模块数 | 4（统一 pnpm workspace） |
| 清除的过时依赖 | 6 个（bluebird, xhr, heap, tldjs, po2json, lolex） |
| 替换的构建工具 | uglify-js → astring (80% 体积缩减) |
| 修复的类型错误 | 42 个 tsc errors |
| 修复的代码质量问题 | 20 HIGH + 23 MEDIUM + 17 LOW |
| pnpm-lock.yaml 减少 | ~542 行 |

**包体积优化：**
- omega-pac UMD: 870KB → 174KB (-80%)
- omega-pac CJS: 276KB → 60KB
- 扩展构建产物禁用 sourcemap 节省 941KB

**开发体验提升：**
- 构建工具: Grunt watch 全量构建 → Vite HMR 热更新（秒级）
- 类型系统: 从无到有，跨 4 模块完整类型检查
- 代码规范: ESLint flat config 统一管理
- 构建管线: 7 个入口 → 5 个 ESM 入口

---

## 技术债清理记录

在最后阶段（`60107da`, `07aab7e`），专项清理了以下技术债：

1. **Shared RPC 去重** — `omegaTargetBase.ts` 工厂函数消除 120 行重复代码
2. **SwitchProfileEditor 大文件分拆** — 923 行 → 638 行（分拆出 4 个子组件）
3. **KeyboardHelp 声明式重构** — DOM 注入 → Vue 条件渲染 + 共享常量
4. **Modal 可见性标准化** — `:show` prop → 父组件 `v-if`
5. **beforeunload 正确清理** — `addEventListener` + `onBeforeUnmount` cleanup
6. **Promise 全链 async/await** — 25 处 `.then()` 消除
7. **Vue 编辑器 defineModel** — prop mutation → 双向绑定
8. **CSS 自定义属性体系** — 17 个变量替代 22 处 `!important`
9. **Chrome API 集中化** — 消除分散的 `chrome.*`/`navigator` 调用
10. **BaseModal 统一抽象** — 12 个 Modal 消除 360 行样板代码

---

*报告生成于 2026-05-16，基于 commit 历史 `45acd48` 至 `07aab7e` 共 23 个里程碑 commit。*
