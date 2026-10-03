# npm 发布手册（@nydsg/dsh-mindmap）

本机实测过的事实，先看这一段，它决定你按哪条路走：

| 事实 | 实测结果 |
|---|---|
| `registry.npmjs.org` 连通性 | **时好时坏**：5 次 ping 中 4 次成功（318–1340 ms），1 次超时（多为 DNS 冷启动） |
| 代理 | **没有任何代理在运行**，环境变量里也没有 —— 直连可用，只是偶尔慢 |
| `@nydsg/dsh-mindmap` 名字 | **可用**（HTTP 404） |
| npm 登录状态 | **未登录**（HTTP 401） |
| `npm login --auth-type=web` | **可用**，会打印一个 `https://www.npmjs.com/login?next=/login/cli/...` 授权链接 |
| 本机 `.npmrc` | `registry=https://registry.npmmirror.com`（只读镜像，**不能发布**） |

> **关于 `Automation` 令牌**：找不到它是正常的。npm 在 2025-11 停用了 Classic token 创建
> （见 [GitHub Changelog: npm security update](https://github.blog/changelog/2025-11-05-npm-security-update-classic-token-creation-disabled-and-granular-token-changes/)），
> 网页上现在只有 **Granular Access Token**。但**你不需要去网页上造令牌** —— 下面的方案 A 用浏览器登录即可，
> 方案 B 用 `npm token create` 命令直接生成。

---

## 第 0 步：指定官方 registry

你本机默认 registry 是**只读镜像**（`registry.npmmirror.com`），镜像**不能发布**，
所以每条发布命令都要显式指定官方 registry：

```powershell
# 指定官方 registry（只对这个终端窗口有效，不改你的全局配置）
$env:npm_config_registry = "https://registry.npmjs.org/"
```

**超时不用改。** 本机实测已经是宽裕值（可用 `npm config get <名字>` 自行复核）：

| 配置 | 本机实测值 | 是否需要动 |
|---|---|---|
| `fetch-timeout` | `300000`（5 分钟） | 不用 |
| `fetch-retries` | `2` | 不用 |
| `fetch-retry-maxtimeout` | `60000` | 不用 |

如果想永久把 registry 改成官方（不建议，会让国内装包变慢）：

```powershell
npm config set registry https://registry.npmjs.org/ --location=user
# 想改回镜像：
npm config set registry https://registry.npmmirror.com --location=user
```

**验证第 0 步成功**：

```powershell
npm ping --registry=https://registry.npmjs.org/
```

必须看到 `PONG` 或 ms 数，**实测约 2.2 秒**。
如果等了十几秒还没结果，是网络抖了：重试一次即可
（本机 5 次 ping 中 4 次成功，唯一的失败是第一次，属 DNS 冷启动）。

---

## 第 1 步：登录（两条路，选一条）

### 方案 A：浏览器登录（推荐，最省事）

```powershell
npm login --auth-type=web --registry=https://registry.npmjs.org/
```

它会打印一行：

```
Login at: https://www.npmjs.com/login?next=/login/cli/<一串 id>
```

**关键：把那个链接复制到浏览器打开，在页面上点授权/确认。** 授权完成后，终端才会继续并打印：

```
Logged in as <你的用户名> on https://registry.npmjs.org/.
```

看到这一行**才算成功**；终端会一直等着，直到你在浏览器里点完。
（上次卡住就是因为没点这一步。若链接过期，按 Ctrl+C 重新执行一次即可。）

### 方案 B：命令行生成 Granular 令牌（不依赖网页登录）

```powershell
npm token create --registry=https://registry.npmjs.org/
```

- 会要求输入 npm 密码；
- 如果账号开了 2FA，会要求输入一次性验证码（`--otp=123456`）；
- 想跳过 2FA 挑战可加 `--bypass-2fa`，但 **npm 正在收紧这种令牌**，
  用它可以登录、**发布时仍可能需要 `--otp`**。

生成的令牌请立刻保存到密码管理器（只显示一次）。之后两种用法：

```powershell
# 用法一：写进用户级 .npmrc（更持久，注意这是明文保存）
npm config set //registry.npmjs.org/:_authToken "npm_你的令牌" --location=user

# 用法二：只在当前终端窗口生效（更安全，关窗即失效）
$env:NODE_AUTH_TOKEN = "npm_你的令牌"
```

### 无论走哪条路，都要验证

```powershell
npm whoami --registry=https://registry.npmjs.org/
```

必须打印出你的 npm 用户名。**若报 `ENEEDAUTH`，不要继续往下发**，先回到第 1 步。

---

## 第 2 步：发包前检查

```powershell
cd D:\Codex-workspace\dsh-mindmap
node tools/test.mjs
```

必须看到 `test: PASS (all gates green, all mutations caught)`。
这一条也是 `prepack` 钩子，`npm publish` 会自动先跑它，**红着发不出去**。

看一眼实际会被发出去的文件（应该正好 8 个，不含 `tools/`）：

```powershell
npm pack --dry-run
```

---

## 第 3 步：发布

```powershell
cd D:\Codex-workspace\dsh-mindmap
npm publish --registry=https://registry.npmjs.org/ --access public
```

- `--access public` 对 scope 包（`@nydsg/...`）是**必需**的，否则会按私有包处理而失败；
- `--registry` 必须显式给出，否则会往只读镜像发；
- 若账号开了 2FA，可能要求验证码：`npm publish --otp=123456 --registry=https://registry.npmjs.org/ --access public`；
- `package.json` 里已经写了 `publishConfig: { access: "public", registry: "https://registry.npmjs.org/" }`，
  所以即使漏了参数也不会发错地方，但仍建议写全。

### `@nydsg` 这个 scope 能不能用？

npm 无法在未登录时告诉你用户名是否被占用（接口一律返回 401，这是刻意的防枚举行为）。
所以判断方法只有一个：**直接发**。

- 如果 `nydsg` 正好是你的 npm 用户名 → 直接成功；
- 否则会报 `404 Scope not found` 或 `403` → 先去
  <https://www.npmjs.com/org/create> 建一个免费的 `nydsg` organization，再发一次。

---

## 第 4 步：验证

```powershell
npm view @nydsg/dsh-mindmap version --registry=https://registry.npmjs.org/
npm view @nydsg/dsh-mindmap dist.tarball --registry=https://registry.npmjs.org/
```

然后到 <https://www.npmjs.com/package/@nydsg/dsh-mindmap> 看页面。

---

## 第 5 步：在干净的 profile 里验证安装命令真的成立

这一步才算证明 README 里那条命令可用（而不是从本机目录挂载）：

```powershell
dsh plugin --profile desktop add @nydsg/dsh-mindmap
```

装完重启 Harness，会话顶部应出现第三个页签「导图」。

> 本机当前装的是**开发目录版**（`file:D:/Codex-workspace/dsh-mindmap`）。
> 想换成正式包：
> ```powershell
> dsh plugin --profile desktop remove "@nydsg/dsh-mindmap"
> dsh plugin --profile desktop add @nydsg/dsh-mindmap
> ```
> **两者不能并存** —— 同一个 id 出现两个 loader 条目会让启动失败。

---

## 常见报错对照

| 报错 | 原因 | 处理 |
|---|---|---|
| 操作超时 / `ETIMEDOUT` | 你的直连时好时坏 | 先 `npm ping` 确认；失败就重试；按第 0 步调大超时 |
| `ENEEDAUTH` | 没登录或凭据没落盘 | 回第 1 步；`npm whoami` 必须打印用户名 |
| `EOTP` | 账号开了 2FA | 命令后加 `--otp=六位验证码` |
| `404 Scope not found` | `@nydsg` org 不存在或不属于你 | <https://www.npmjs.com/org/create> 建 `nydsg` |
| `403 Forbidden` | 令牌权限不足 / 不是包所有者 | 用 Granular token 并给 `read-write` + 该 scope 权限 |
| `402 Payment Required` | scope 包没加 `--access public` | 加上 `--access public` |
| `EPUBLISHCONFLICT` | 这个版本号已经发过了 | 改 `package.json` 的 version（npm 不允许覆盖已发布版本） |
| `ERR_PNPM_...` / 装包很慢 | 你的 `.npmrc` 指向镜像 —— 这是装包，不是发布 | 与本手册无关，发布请按第 0 步用官方 registry |

---

## 之后发新版

```powershell
cd D:\Codex-workspace\dsh-mindmap
node tools/test.mjs                                   # 必须绿
# 改 package.json 的 version 与 CHANGELOG.md
git add -A; git commit -m "fix: ..."; git push
npm publish --registry=https://registry.npmjs.org/ --access public
```

版本号按语义化版本：修 bug 发 `1.3.1`，加功能发 `1.4.0`，破坏性改动发 `2.0.0`。
