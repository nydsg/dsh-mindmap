# 发布指南（你要在终端里执行的命令）

仓库内容已经整理成可直接开源的状态。剩下三步——**建仓库、推送、发包**——必须由你本人执行：本机没有 git，也没有你的 GitHub / npm 凭据，我不应该也不能代持。

| 项 | 值 |
|---|---|
| 包名 | `@nydsg/dsh-mindmap` |
| 仓库 | `https://github.com/nydsg/dsh-mindmap` |
| 版本 | `1.1.0` |
| 提交身份 | `nydsg <274722888+nydsg@users.noreply.github.com>`（已核对：GitHub 账号 `nydsg` 的 id 是 274722888） |

> **为什么用 scope**：`dsh-mindmap` 这个裸名在 npm 上已被占用（不是本项目）。`@nydsg/dsh-mindmap` 已确认可用，且生态惯例如此（你已装的 `@furongjun1999/dsh-memory`、`@liustack/modlens` 都是 scope 包）。
>
> **为什么用 noreply 邮箱**：它把提交绑定到 GitHub 账号 `nydsg`，贡献图会计到你名下，同时不必公开真实邮箱。你本机 `.gitconfig` 里现在是 `liguanhua <508865804@qq.com>`，与账号名不一致——照下面第 1 步改掉。若你更想用真实邮箱，把 `user.email` 换成它即可（但要在 GitHub 账号里验证过该邮箱才会计入贡献图）。

---

## 第 0 步：装 git（一次性）

```powershell
winget install --id Git.Git -e --source winget
```

装完**新开一个终端**（让 PATH 生效），确认：

```powershell
git --version
```

## 第 1 步：设置提交身份（只需一次）

```powershell
git config --global user.name "nydsg"
git config --global user.email "274722888+nydsg@users.noreply.github.com"
```

## 第 2 步：推送前最后自检

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

## 第 3 步：建仓库并推送

先到 GitHub 建一个**空仓库**：<https://github.com/new> → 名字 `dsh-mindmap` → **Public** → 下面的 README / .gitignore / LICENSE **一个都不要勾**（勾了会产生一次初始提交，和本地历史冲突）→ Create。

然后：

```powershell
cd D:\Codex-workspace\dsh-mindmap
git init -b main
git add .
git commit -m "feat: DSH conversation mind map plugin (v1.1.0)"
git remote add origin https://github.com/nydsg/dsh-mindmap.git
git push -u origin main
```

推送时会弹出 GitHub 登录（浏览器或粘贴 Personal Access Token）。若用 token：Settings → Developer settings → Personal access tokens → 需要 `repo` 权限。

推送成功后，仓库首页的 test 徽章会在第一次 Actions 跑完后变绿（约 1 分钟）。

### 建完仓库后建议做两件事（网页上操作）

1. **仓库 About**（右上角齿轮）：
   - Description：`DSH 对话思维导图：左侧总标题起步、向右单向展开的横向层级树，扁平化简约风格。全部本地计算，零网络。`
   - Topics：`dsh` `dsh-plugin` `deepseek-harness` `mindmap` `visualization` `plugin`
2. **Social preview**（Settings → General → Social preview）：上传 `docs/screenshot.png`，这样链接分享出去有图。

## 第 4 步：发布到 npm

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

## 第 5 步：验证安装命令真的可用

在**另一台机器**上（或先清掉本机的开发安装）：

```powershell
dsh plugin --profile web add @nydsg/dsh-mindmap
```

重启 Harness，会话顶部应出现第三个页签「导图」。

> 本机现在装的是**开发目录版**（`file:D:/Codex-workspace/dsh-mindmap`）。想切换成正式包：
> ```powershell
> dsh plugin --profile desktop remove "@nydsg/dsh-mindmap"
> dsh plugin --profile desktop add @nydsg/dsh-mindmap
> ```
> 两者**不能并存**——同一个 id 出现两个 loader 条目会让启动失败。

## 第 6 步：提交到插件市场

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
