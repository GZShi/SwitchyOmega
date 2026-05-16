SwitchyOmega
============

Manage and switch between multiple proxies quickly & easily.

[![Translation status](https://hosted.weblate.org/widgets/switchyomega/-/svg-badge.svg)](https://hosted.weblate.org/engage/switchyomega/?utm_source=widget)

Chromium Extension
------------------
The project is available as a Chromium Extension.

You can try it on [Chrome Web Store](https://chrome.google.com/webstore/detail/padekgcemlokbadohgkifijomclgjgif),
or grab a packaged extension file (CRX) for offline installation on the [Releases page](https://github.com/FelisCatus/SwitchyOmega/releases).

Please [report issues on the issue tracker.](https://github.com/FelisCatus/SwitchyOmega/issues)

## 2026 技术栈现代化改造

项目已于 2026 年 5 月完成全面的技术栈现代化改造。详情请参阅 **[MIGRATION.md](./MIGRATION.md)**。

主要变更：
- **语言迁移:** CoffeeScript → TypeScript（4 个模块，0 个 .coffee 残留）
- **前端重构:** AngularJS 1.x + Jade → Vue 3 + SFC（39 个组件）
- **构建工具:** Grunt + Bower → pnpm workspaces + Vite + tsdown
- **平台升级:** Manifest V2 → V3（Service Worker + ESM）
- **依赖清理:** 清除 bluebird/xhr/heap/tldjs/po2json/lolex 等 6 个过时依赖
- **代码质量:** 42 个类型错误清零，60 个代码质量问题修复，25 处 .then() → async/await

---

## Project Architecture

### omega-pac (PAC generator)
Standalone module that handles the profiles model and compiles profiles into PAC
scripts. Built with TypeScript + tsdown, outputs ESM/CJS/UMD formats.

### omega-target (Options manager)
Browser-independent logic for managing options and applying profiles. Pure
TypeScript library, no browser dependencies. Provides abstract base classes
that are extended by platform-specific targets.

### omega-web (Configuration UI)
Web-based configuration interface built with Vue 3 + TypeScript + Vite. Contains
both the options page (full configuration) and the popup (quick switch). Uses
Pinia for state management and Vue Router for page navigation.

### omega-target-chromium-extension (Chromium Extension)
Chromium-specific implementation layer. Contains the Manifest V3 service worker,
Chrome API wrappers (`services/chrome/`), proxy implementation, and browser-dependent
code that connects `omega-web` with `omega-target`.

## Building the project

SwitchyOmega uses pnpm workspaces to manage all four modules.

To build the project:

```bash
# Install pnpm first, then:
pnpm install

# Build all modules:
cd omega-pac && pnpm build && cd ..
cd omega-target && pnpm build && cd ..
cd omega-web && pnpm build && cd ..
cd omega-target-chromium-extension && pnpm build && cd ..

# The built extension will be in:
# omega-target-chromium-extension/build/
# Load it as an unpacked extension in Chromium.
```

For development with HMR:

```bash
cd omega-web
pnpm dev          # Starts Vite dev server with hot module replacement
```

## Translation

Translation is hosted on Weblate. If you want to help improve the translated
text or start translation for your language, please follow the link of the picture
below.

本项目翻译由Weblate托管。如果您希望帮助改进翻译，或将本项目翻译成一种新的语言，请
点击下方图片链接进入翻译。

[![Translation status](https://hosted.weblate.org/widgets/switchyomega/-/287x66-white.png)](https://hosted.weblate.org/engage/switchyomega/?utm_source=widget)

License
-------
![GPLv3](https://www.gnu.org/graphics/gplv3-127x51.png)

SwitchyOmega is licensed under [GNU General Public License](https://www.gnu.org/licenses/gpl.html) Version 3 or later.

SwitchyOmega is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

SwitchyOmega is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with SwitchyOmega.  If not, see <http://www.gnu.org/licenses/>.

Notice
------

SwitchyOmega currently does not have a dedicated project homepage. `switchyomega.com` and similar webites are NOT affiliated with the SwitchyOmega project in any way, nor are they maintained by SwitchyOmega project members. Please refer to this Github repository and wiki for official information.

SwitchyOmega is not cooperating with any proxy providers, VPN providers or ISPs at the moment. No advertisement is displayed in SwitchyOmega project or software. Proxy providers are welcome to recommend SwitchyOmega as part of the solution in tutorials, but it must be made clear that SwitchyOmega is an independent project, is not affiliated with the provider and therefore cannot provide any support on network connections or proxy technology.

重要声明
--------

SwitchyOmega 目前没有专门的项目主页。 `switchyomega.com` 等网站与 SwitchyOmega 项目并无任何关联，也并非由 SwitchyOmega 项目成员维护。一切信息请以 Github 上的项目和 wiki 为准。

SwitchyOmega 目前未与任何代理提供商、VPN提供商或 ISP 达成任何合作协议，项目或软件中不包含任何此类广告。欢迎代理提供商在教程或说明中推荐 SwitchyOmega ，但请明确说明此软件是独立项目，与代理提供商无关，且不提供任何关于网络连接或代理技术的支持。
