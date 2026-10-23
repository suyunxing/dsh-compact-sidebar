# dsh-compact-sidebar

Two fixes for the DSH sidebar, in one small browser-only bundle.

## 1. Compact navigation

The sidebar's global navigation (Plugins / Market / Automations / Task board / Skills / SSH / MCP …) is redrawn as a compact two-column grid: 30px rows, 12px labels, 14px glyphs, ellipsised titles. The rules are deliberately **not** media-gated — a phone and a desktop window get the same density — and on viewports where vertical room actually runs out (`max-width: 820px`, `max-height: 700px`, or a coarse pointer) the navigation is additionally capped at `34vh` and allowed to scroll, while the workspace / session history region underneath keeps a `38vh` floor.

The point is that the history list — the thing you actually navigate — stops being squeezed out by the nav above it.

## 2. Resource-record repair

Some browsers parse `dsh-resource://<protocol>/…` with the native URL parser and report an **empty hostname**. The resource registry reads the protocol from that hostname, so it pins every record to status `none` even though the protocol's provider is registered. The visible symptom is *文件资源服务不可用* on document and image tabs and *计划预览不可用* on plan tabs, and reloading does not help because the parse fails every time.

The address grammar is unambiguous, so this plugin re-derives the protocol from the address string itself: it patches the registry's record factory so every later record is created on the right protocol, and heals the records the registry already holds through its own attach path. Records whose protocol resolved correctly are left alone, so the repair is a no-op on engines that parse the authority properly.

## Install

```sh
dsh plugin --profile <your-profile> add dsh-compact-sidebar
```

Reload the DSH window afterwards — the whole capability is a stylesheet plus a patch applied in the browser; the host half registers nothing.

## Off switch

For A/B checking, set `localStorage['dsh-compact-sidebar'] = 'off'` and reload. Only the layout is affected; the resource repair runs either way.

## Notes

- No configuration keys, no host services, no network access.
- The repair only touches records whose protocol the registry failed to resolve.

## 中文

一个纯浏览器侧的插件，解决侧栏的两个问题。

**一、紧凑导航**：把侧栏的全局导航（插件 / 市场 / 自动化 / 任务看板 / 技能 / SSH / MCP……）重画成紧凑双列网格——行高 30px、标签 12px、图标 14px、标题省略号。这些规则**不按屏幕宽度区分**，手机和桌面同样密度；只在垂直空间真的不够时（`max-width: 820px`、`max-height: 700px` 或粗指针设备）额外把导航限制在 `34vh` 并允许滚动，同时给下面的工作区 / 会话历史留出 `38vh` 下限。

重点是：真正用来导航的历史列表，不再被上面的导航挤掉。

**二、资源记录修复**：部分浏览器用原生 URL 解析器解析 `dsh-resource://<protocol>/…` 时会报空 hostname，而资源注册表正是从 hostname 读协议，于是把每条记录都钉在 `none` 状态——表现为文档 / 图片页签提示「文件资源服务不可用」、计划页签提示「计划预览不可用」，刷新也无效，因为每次解析都失败。

地址语法本身是明确的，所以插件直接从地址字符串重新推出协议：改掉注册表的记录工厂，让之后新建的记录落在正确协议上，并通过注册表自己的 attach 路径把已有记录治好。协议解析本来正常的记录不受影响，因此在解析正常的引擎上这是空操作。

关闭方式：`localStorage['dsh-compact-sidebar'] = 'off'` 后刷新，只影响布局，资源修复照常运行。

## License

MIT