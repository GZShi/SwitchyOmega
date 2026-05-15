# SwitchyOmega 项目架构文档

## 模块依赖图

```
omega-pac (纯逻辑，无外部依赖)
  ↑
  ├── omega-target (workspace:* omega-pac)
  ↑       ↑
  │       ├── omega-target-chromium-extension (workspace:* omega-target + omega-pac + omega-web)
  │
  ├── omega-web (workspace:* omega-pac)
```

依赖方向严格单向：`omega-web` 只依赖 `omega-pac`（不依赖 `omega-target`）；`omega-target` 只依赖 `omega-pac`；`omega-target-chromium-extension` 聚合所有模块。

`omega-locales` 没有 package.json，是纯翻译资源目录。

---

## 各模块核心职责

### omega-pac — PAC 脚本生成引擎（纯逻辑，零 Chrome API 依赖）

**核心文件：**
- `src/profiles.ts` — Profile 的创建、查找、匹配、版本管理、引用解析
- `src/conditions.ts` — 条件匹配（HostWildcard、URL、HostRegex 等）
- `src/rule_list.ts` — 规则列表匹配
- `src/pac_generator.ts` — PAC 脚本 AST 生成、压缩、ASCII 输出
- `src/astree/` — JavaScript AST 构建和打印（自定义实现，不依赖外部 JS parser）
- `src/shexp_utils.ts` — Shell 通配符模式匹配工具
- `src/utils.ts` / `src/types.ts` — 工具函数和类型定义

**对外暴露：** `Profiles`, `Conditions`, `PacGenerator`, `Revision`, `RuleList`

**测试：** mocha + chai，纯 Node 环境运行，不需要浏览器。

---

### omega-target — 配置管理核心（纯逻辑，通过抽象接口隔离存储）

**核心文件：**
- `src/options.ts` — **核心类 `Options`**，配置的加载/保存/升级/应用/同步全生命周期
- `src/storage.ts` — 内存 Storage 实现（`InMemoryStorage`），提供 `get/set/remove/watch/apply` 接口
- `src/browser_storage.ts` — 基于 `localStorage` 的持久化 `BrowserStorage`
- `src/options_sync.ts` — `chrome.storage.sync` 双向同步引擎（限速、合并、冲突处理）
- `src/default_options.ts` — 默认配置工厂函数
- `src/errors.ts` — 网络错误类型（NetworkError, HttpError 等）
- `src/log.ts` — 日志抽象（log/error 方法）

**抽象接口设计（storage 层由扩展侧注入）：**
- `_storage` — 配置持久化存储（扩展侧注入 `ChromeBrowserStorage`）
- `_state` — UI 运行时状态存储（扩展侧注入 `ChromeBrowserStorage`）
- `sync` — 可选，chrome.storage.sync 同步实例
- `proxyImpl` — 可选，代理设置实现（扩展侧注入 `SettingsProxyImpl`）
- `fetchUrl` / `setQuickSwitch` / `setInspect` / `setMonitorWebRequests` / `schedule` / `currentProfileChanged` / `printProfile` — 扩展侧通过继承 `ChromeOptions` 覆写

**对外暴露：** `Options`, `Storage`, `BrowserStorage`, `OptionsSync`, `Log`, `OmegaPac`（re-export）, 错误类型

**测试：** mocha + sinon，纯 Node 环境运行，不需要浏览器。

---

### omega-target-chromium-extension — Chrome 扩展（MV3 Service Worker）

**核心文件：**
- `src/background/background.ts` — **Service Worker 入口**，组装所有模块，监听消息，驱动整个扩展
- `src/background/sw.ts` — SW 启动脚本
- `src/module/options.ts` — **`ChromeOptions extends Options`**，覆写所有 Chrome 特定行为
- `src/module/chrome_browser_storage.ts` — **`ChromeBrowserStorage`**，包装 `chrome.storage.local`
- `src/module/chrome_api.ts` — Chrome API Promise 化工具
- `src/module/chrome_port.ts` — `chrome.runtime.Port` 包装
- `src/module/tabs.ts` — `ChromeTabs`，标签页监听 + Browser Action 图标/标题更新
- `src/module/proxy/proxy_impl_settings.ts` — **`SettingsProxyImpl`**，通过 `chrome.proxy.settings` 设置代理
- `src/module/external_api.ts` — 跨扩展通信（外部扩展可 disable/enable/getOptions）
- `src/module/web_request_monitor.ts` — Web 请求错误监控
- `src/module/inspect.ts` — URL 检查模式
- `src/module/switchysharp.ts` — SwitchySharp 旧版迁移
- `src/module/upgrade.ts` — 旧版 SwitchySharp 配置升级逻辑
- `src/module/fetch_url.ts` — 扩展端 fetch（下载 PAC 脚本/规则列表）
- `src/module/proxy/proxy_auth.ts` — 代理认证处理

**构建流程：**
1. `scripts/build-extension.js` 生成 manifest.json，复制 locales 资源
2. tsdown 打包 TypeScript 到 `dist/`
3. omega-web 构建产物（`omega-web/build/`）被复制到扩展目录

**测试：** 无独立测试（依赖 omega-pac 和 omega-target 的测试覆盖）

---

### omega-web — Vue 3 UI（Options Page + Popup）

**目录结构：**
- `src/options/` — Options 页面（Vue 3 + Pinia + Vue Router）
- `src/popup/` — Popup 弹出页面
- `src/services/chrome/` — **Chrome API 薄包装层**
- `src/services/omegaTarget.ts` — Options 页与 Background 通信的高级 API
- `src/services/omegaTargetPopup.ts` — Popup 与 Background 通信的高级 API
- `src/stores/` — Pinia 状态管理（optionsStore, profilesStore, popupStore, uiStore）
- `src/composables/` — Vue 组合函数

**构建产物** 被 `omega-target-chromium-extension` 复制到扩展目录中。

---

## Chrome API 耦合点集中地图

所有 Chrome API 调用集中在下述位置，其余模块**零 Chrome API 依赖**：

### 耦合层 1: `omega-web/src/services/chrome/`（UI → Chrome API 薄包装）

| 文件 | 包装的 Chrome API | 用途 |
|------|-------------------|------|
| `runtime.ts` | `chrome.runtime.sendMessage`, `chrome.runtime.connect`, `chrome.runtime.getURL`, `chrome.runtime.id` | 与 Background SW 通信 |
| `storage.ts` | `chrome.storage.local.get/set` | 本地状态读写 |
| `tabs.ts` | `chrome.tabs.query/update/create/reload` | 标签页操作 |
| `i18n.ts` | `chrome.i18n.getMessage` | 国际化文案 |

### 耦合层 2: `omega-target-chromium-extension/src/module/`（Extension → Chrome API 具体实现）

| 文件 | 使用的 Chrome API | 用途 |
|------|-------------------|------|
| `chrome_browser_storage.ts` | `chrome.storage.local` | 配置/状态持久化 |
| `options.ts` (ChromeOptions) | `chrome.action.*`, `chrome.contextMenus.*`, `chrome.alarms.*` | 图标/菜单/定时任务 |
| `background.ts` | `chrome.runtime.onMessage`, `chrome.tabs.*` | 消息路由、标签操作 |
| `proxy/proxy_impl_settings.ts` | `chrome.proxy.settings` | 代理设置 |
| `proxy/proxy_auth.ts` | `chrome.webRequest.onAuthRequired` | 代理认证 |
| `external_api.ts` | `chrome.runtime.onConnectExternal` | 跨扩展通信 |
| `tabs.ts` | `chrome.tabs.*`, `chrome.action.*` | 标签监听 + 图标更新 |
| `web_request_monitor.ts` | `chrome.webRequest.*` | 请求错误监控 |
| `fetch_url.ts` | `fetch()` (SW 内建) | 下载规则列表/PAC 脚本 |


---

## 配置管理全链路

### 配置存储架构

```
chrome.storage.local (ChromeBrowserStorage, prefix="")
  ├── schemaVersion: 2
  ├── -enableQuickSwitch, -refreshOnProfileChange, ...
  ├── +proxy (FixedProfile)
  ├── +auto switch (SwitchProfile)
  └── +<profileKey> ... (所有 profile 以 "+" 为前缀的 key 存储)

chrome.storage.local (ChromeBrowserStorage, prefix="omega.local.")
  ├── currentProfileName, isSystemProfile
  ├── availableProfiles, validResultProfiles
  ├── firstRun, syncOptions, refreshOnProfileChange
  └── web.last_url, web.switchGuide ...

chrome.storage.sync (可选，通过 OptionsSync 管理)
  └── 与 local 双向同步，含冲突合并逻辑
```

两层存储分离：
- **不带 prefix** → 用户配置（profiles + 设置项），可同步
- **带 `omega.local.` prefix** → 运行时状态（当前 profile、UI 状态），不可同步

### 1. 配置加载链路（初始化）

```
Background SW 启动
  → new ChromeBrowserStorage("omega.local.")       // state
  → new Storage("local")   // 内部用 ChromeBrowserStorage("")  // options
  → new Options(null, storage, state, Log, sync, proxyImpl)
    → Options.init()
      → Options.loadOptions()
        ├─ [sync enabled] sync.copyTo(local)  // 从 chrome.storage.sync 拉取
        ├─ storage.get(null)                   // 从 chrome.storage.local 读取
        ├─ Options.upgrade(rawOpts)            // schema 升级 (v1→v2)
        ├─ Options._watch()                    // 监听 storage 变更
        └─ return upgradedOpts
      → Options.applyProfile(startupProfile || lastProfile || "system")
        ├─ Profiles.byName(name, _options)     // 查找 profile
        ├─ Profiles.allReferenceSet()          // 解析依赖图
        ├─ proxyImpl.applyProfile(profile)     // 调用 chrome.proxy.settings.set()
        │   └─ PacGenerator.script() → PAC 脚本生成
        ├─ _state.set({currentProfileName, ...})
        ├─ _setAvailableProfiles()
        └─ currentProfileChanged()             // 更新 browser action 图标
  → options.ready 完成
  → chrome.runtime.onMessage 开始监听
```

### 2. 配置保存链路（UI Apply）

```
用户点击 Apply 按钮
  → optionsStore.applyOptions()
    ├─ jsondiffpatch.diff(optionsOld, options)  // 计算差异
    └─ omegaTarget.optionsPatch(patch)
      → chrome.runtime.sendMessage({method:"patch", args:[patch]})
        //////// 跨进程边界 ////////
      → Background: options.patch(patch)
        ├─ jsondiffpatch.patch(_options, patch)   // 应用到内存
        ├─ Options._setOptions(changes)
        │   ├─ 遍历 changes，更新 _options
        │   ├─ 如果 profile 被删除/修改 → 重新 apply profile
        │   ├─ 如果 profiles 变更 → _setAvailableProfiles()
        │   ├─ sync?.requestPush(changes)            // 推到 chrome.storage.sync
        │   └─ _storage.set(changes)                 // 持久化到 chrome.storage.local
        └─ 返回 _options
      → omegaTarget.refresh()
        → chrome.runtime.sendMessage({method:"getAll"})
        → 回调通知所有 addOptionsChangeCallback 注册的监听器
        → Pinia store 更新 options/optionsOld，optionsDirty = false
```

### 3. Profile 应用链路（切换代理）

```
用户切换 Profile
  → omegaTarget.applyProfile(name)
    → chrome.runtime.sendMessage({method:"applyProfile", args:[name]})
      //////// 跨进程边界 ////////
    → Background: options.applyProfile(name)
      ├─ Profiles.byName(name, _options)        // 找到 profile
      ├─ Profiles.allReferenceSet(profile)      // 解析所有引用的 profile
      ├─ _state.set({currentProfileName, isSystemProfile, ...})
      ├─ _setAvailableProfiles()                // 更新可用 profile 列表
      ├─ proxyImpl.applyProfile(profile, meta, _options)
      │   ├─ [SwitchProfile] → PacGenerator.script() 生成内联 PAC
      │   │   chrome.proxy.settings.set({mode:"pac_script", pacScript:{data:...}})
      │   ├─ [FixedProfile] → chrome.proxy.settings.set({mode:"fixed_servers", ...})
      │   ├─ [PacProfile]  → chrome.proxy.settings.set({mode:"pac_script", pacScript:{url:...}})
      │   ├─ [DirectProfile] → chrome.proxy.settings.set({mode:"direct"})
      │   └─ [SystemProfile] → chrome.proxy.settings.clear()
      ├─ currentProfileChanged()                // 更新 browser action 图标/标题
      └─ 如果 downloadInterval > 0 → updateProfile() 下载规则列表更新
```

### 4. 配置读取链路（UI 刷新）

```
页面加载 / 触发刷新
  → omegaTarget.refresh()
    → chrome.runtime.sendMessage({method:"getAll"})
      //////// 跨进程边界 ////////
    → Background: 直接返回内存中的 options._options
    → 回调 optionsChangeCallbacks
      → Pinia store options.value = deepClone(newOptions)
      → Vue 响应式系统更新所有绑定组件
```

### 5. 跨扩展通信链路

```
外部扩展 (如 SwitchySharp)
  → chrome.runtime.connectExternal(Omega扩展ID)
  → ExternalApi.listen()
    → onMessage(msg, port)
      ├─ "disable" → applyProfile("system"), 设置 badge "X"
      ├─ "enable"  → reenable(), 恢复之前 profile
      └─ "getOptions" → 返回 options.getAll()

代理被外部修改时：
  → chrome.proxy.settings.onChange
    → SettingsProxyImpl._proxyChangeListener
      → proxyImpl.watchProxyChange callback
        → options.setExternalProfile(parsed, {noRevert, internal})
```

### 关键设计要点

1. **omega-pac 和 omega-target 是纯逻辑库**，不依赖浏览器环境，所有测试在 Node 下运行
2. **omega-web 通过 `chrome.runtime.sendMessage` 以 RPC 方式调用 background**，调用方法名映射到 `Options` 实例方法
3. **配置变更始终从 background 发起持久化**，UI 只发送 patch diff，不直接写 storage
4. **`Options._setOptions()` 是配置变更的唯一入口**，集中处理 profile 依赖更新、同步推送、状态持久化
5. **Watch 机制**：`Options._watch()` 监听 storage 变更（来自 sync 的远程变更），自动合并到内存并触发 UI 更新
