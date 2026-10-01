# 发布指南（你要在终端里执行的命令）

**仓库已经上线了。** `https://github.com/nydsg/dsh-mindmap` 上现在有 32 个文件、两个提交，CI 双版本（Node 20 / 22）全绿，README 顶部的 test 徽章显示 `passing`。

```text
70e98eb  feat: DSH conversation mind map plugin (v1.1.0)   <- nydsg <274722888+nydsg@users.noreply.github.com>
1ae7b8a  Initial commit                                    <- 你建库时勾 README 产生的
```

剩下的是 **npm 发布**与**市场收录**，那两步必须由你本人执行：需要你的 npm 凭据，我不应该也不能代持。

| 项 | 值 |
|---|---|
| 包名 | `@nydsg/dsh-mindmap` |
| 仓库 | `https://github.com/nydsg/dsh-mindmap` |
| 版本 | `1.1.0` |
| 提交身份 | `nydsg <274722888+nydsg@users.noreply.github.com>`（仓库级配置，**没有动你的全局 `.gitconfig`**） |

> **为什么用 scope**：`dsh-mindmap` 这个裸名在 npm 上已被占用（不是本项目）。`@nydsg/dsh-mindmap` 已确认可用，且生态惯例如此（你已装的 `@furongjun1999/dsh-memory`、`@liustack/modlens` 都是 scope 包）。
>
> **为什么用 noreply 邮箱**：它把提交绑定到 GitHub 账号 `nydsg`，贡献图计入你名下，同时不必公开真实邮箱。你全局配置里仍是 `liguanhua <508865804@qq.com>`——本仓库单独覆盖了，所以不影响你其它项目。

---

## 关于 git 的两个坑（已在本机验证过）

1. **git 不在 PATH 上。** 实际可用的是 `D:\git\Git\cmd\git.exe`；而用户 PATH 里那条 `D:\GItHub\Git\cmd` 指向一个**不存在的目录**（注册表 `HKLM\SOFTWARE\GitForWindows\InstallPath` 也是这个旧路径 `D:\GItHub\Git`，所以 `winget list` 会显示 Git 已安装，但直接敲 `git` 会报找不到）。要用的话：

   ```powershell
   # 临时（当前窗口有效）
   $env:PATH += ";D:\git\Git\cmd"

   # 或永久修正用户 PATH（把坏的那条换掉）
   [Environment]::SetEnvironmentVariable("PATH", (($env:PATH -split ';' | Where-Object { $_ -ne 'D:\GItHub\Git\cmd' }) -join ';'), "User")
   ```

2. **凭据已经在 Windows 凭据管理器里了**（`git push` 认证通过，不需要重新登录）。Git Credential Manager 位于 `D:\git\Git\mingw64\bin\git-credential-manager.exe`，git 的 system 配置里已挂上。

## 之后推送（仓库已就绪，这是日常流程）

```powershell
cd D:\Codex-workspace\dsh-mindmap
node tools/test.mjs                       # 必须绿
git add -A
git commit -m "fix: ..."
git push
```

## 第 1 步：发包前最后自检

```powershell
cd D:\Codex-workspace\dsh-mindmap
node tools/test.mjs
```

必须看到 `test: PASS (all gates green, all mutations caught)`。
这一条也是 `prepack` 钩子，`npm publish` 会自动先跑它，红着发不出去。

再看一眼实际会被发出去的文件清单（确认没有多余文件、没有少文件）：

```powershell
npm pack --dry-run
```

应当只包含 `lib/`、`cordis.patch.yml`、`README.md`、`README.en.md`、`CHANGELOG.md`、`LICENSE`、`package.json`。

## 第 2 步：仓库页面上的两件收尾（网页操作，还没做）

1. **About**（仓库右上角齿轮）：
   - Description 已经帮你填好了（用文案包里的 60 字版）；若想改：
     `DSH 对话思维导图：左侧总标题起步、向右单向展开的横向层级树，扁平化简约，零网络。`
   - Topics 建议加：`dsh` `dsh-plugin` `deepseek-harness` `mindmap` `mind-map` `visualization` `plugin`
2. **Social preview**（Settings → General → Social preview）：上传 `docs/screenshot.png`，链接分享出去才有图。

## 第 3 步：发布到 npm

先登录：

```powershell
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
```

> 首次发布 scope 包，需要先在 <https://www.npmjs.com/org/create> 建好 `nydsg` 这个 organization（免费）；否则 `--access public` 会报 `404 Scope not found`。

发布（**必须显式指定官方 registry**：本机 `.npmrc` 默认指向 `registry.npmmirror.com`，那是只读镜像，发不上去）：

```powershell
cd D:\Codex-workspace\dsh-mindmap
npm publish --registry=https://registry.npmjs.org/ --access public
```

`--access public` 对 scope 包是必需的，否则会按私有包处理而失败。

发布后验证：

```powershell
npm view @nydsg/dsh-mindmap version --registry=https://registry.npmjs.org/
```

## 第 4 步：验证安装命令真的可用

在**另一台机器**上（或先清掉本机的开发安装）：

```powershell
dsh plugin --profile <你的 profile> add @nydsg/dsh-mindmap
# 本机是 desktop：dsh plugin --profile desktop add @nydsg/dsh-mindmap
```

重启 Harness，会话顶部应出现第三个页签「导图」。

> 本机现在装的是**开发目录版**（`file:D:/Codex-workspace/dsh-mindmap`）。想切换成正式包：
> ```powershell
> dsh plugin --profile desktop remove "@nydsg/dsh-mindmap"
> dsh plugin --profile desktop add @nydsg/dsh-mindmap
> ```
> 两者**不能并存**——同一个 id 出现两个 loader 条目会让启动失败。

## 第 5 步：提交到插件市场

市场**不直接收录仓库**：它的清单来自策展仓库 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)（站点与市场都从 `awesome-dsh-plugin.com/plugins.json` 实时拉取）。

所以：到 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) **提一个 PR**，在列表里加**一条**条目（包名 + 仓库地址）。不要往市场本体仓库提——那边明确写了不要。

市场侧校验会看这三件事，本包都已满足：

- `package.json` 有 `dsh` 声明（`dsh.bundle.patch` + `dsh.client.platform`）；
- `keywords` 含 `dsh-plugin`；
- 仓库公开、README 有安装说明。

---

## 之后发新版

```powershell
node tools/test.mjs                       # 必须绿
# 更新 package.json 的 version 与 CHANGELOG.md
git add . && git commit -m "fix: ..." && git push
npm publish --registry=https://registry.npmjs.org/ --access public
```

版本号按语义化版本：修 bug 发 `1.1.1`，加功能发 `1.2.0`，破坏性改动发 `2.0.0`。

改了视觉（卡片、连线、间距）之后，顺手重新生成 README 里的截图：

```powershell
npm run screenshot        # 需要 Edge 或 Chrome；写入 docs/screenshot.png
```

`tools/TEST-REPORT.md` 是生成物，改了门禁后重新生成，不要手改：

```powershell
npm run report
```
