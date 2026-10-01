# @nydsg/dsh-mindmap 测试运行记录

生成自 `node tools/make-report.mjs`。全部离线、确定性，无网络、无模型调用。

三条命令：

```
node tools/showcase.mjs     # 用例展示：引擎在给定会话上实际做出的判定 + 树几何
node tools/test.mjs         # 跑门禁，并逐个重放历史 bug 证明门禁会红
node tools/make-report.mjs  # 重新生成本文档
```

---

## 一、门禁

| 门禁 | 检查什么 | 结果 |
|---|---|---|
| `check.mjs` | bundle 可解析、`apply`/`inject` 面正确、CSS 令牌声明与消费一致、组件 CSS 零硬编码颜色 | PASS |
| `behaviour.mjs` | 分词、关键词 TF-IDF、分支判定（含评分分离性）、布局几何、投影适配器容错 | PASS |
| `registration.mjs` | `apply()`/`inject()` 契约、结构不变量（卡片只露提问、模块行归面板、布局不测 DOM） | PASS |

```
note: manifest: one loader row for @nydsg/dsh-mindmap
note: tokens: 16 declared, 16 consumed
check: PASS (0 problems)

behaviour: PASS (0 problems)

note: bundle: D:\Codex-workspace\dsh-mindmap\lib\client.js
note: locale keys: 93 zh / 93 en; view-referenced: 78
registration: PASS (0 problems)
```

---

## 二、用例展示

下面是**真实引擎输出**（与门禁断言的是同一份代码，不是重写的副本）：每轮接到哪个更早的提问、判定分数、以及算出的树几何。

```
──────────────────────────────────────────────────────────────────────────
A. Two topics that interleave
──────────────────────────────────────────────────────────────────────────
why: A later turn returns to the FIRST topic. It must rejoin that branch, not continue the turn immediately before it.
result: 5 turns → 2 branch root(s), 4 column(s), 5 connector(s), canvas 1288×190px

   #1 [root] col1
      插件安装到 dsh 的 web profile 需要重启吗
      └─ #2 [auto 0.56] col2
         dsh 插件安装失败怎么排查 profile 配置
         └─ #5 [auto 0.56] col3
            dsh 插件安装完了还是要重启 profile 吗
   #3 [root] col1
      思维导图的卡片配色能不能换成深色主题
      └─ #4 [auto 0.44] col2
         深色主题下卡片的对比度需要满足 4.5:1 吗

   connectors (parent right edge → child left edge):
     #2 → #5   (952,50) → (1008,50)   [auto]
     #1 → #2   (628,50) → (684,50)   [auto]
     #__title__ → #1   (280,95) → (360,50)   [root]
     #3 → #4   (628,140) → (684,140)   [auto]
     #__title__ → #3   (280,95) → (360,140)   [root]

   column occupancy: col0=1  col1=2  col2=2  col3=1

──────────────────────────────────────────────────────────────────────────
B. Four levels deep
──────────────────────────────────────────────────────────────────────────
why: A single thread that keeps narrowing. Each turn must attach to the previous one, producing one column per level.
result: 4 turns → 2 branch root(s), 4 column(s), 4 connector(s), canvas 1288×190px

   #1 [root] col1
      我要给 dsh 做一个插件
   #2 [root] col1
      这个 dsh 插件要加一个思维导图视图
      └─ #3 [auto 0.57] col2
         思维导图视图里分支连线怎么画
         └─ #4 [auto 0.44] col3
            分支连线的曲线控制点怎么算

   connectors (parent right edge → child left edge):
     #__title__ → #1   (280,95) → (360,50)   [root]
     #3 → #4   (952,140) → (1008,140)   [auto]
     #2 → #3   (628,140) → (684,140)   [auto]
     #__title__ → #2   (280,95) → (360,140)   [root]

   column occupancy: col0=1  col1=2  col2=1  col3=1

──────────────────────────────────────────────────────────────────────────
C. Wide fan-out from one question
──────────────────────────────────────────────────────────────────────────
why: One question answered by five follow-ups. All five must land in the same column and share one parent.
result: 6 turns → 1 branch root(s), 3 column(s), 6 connector(s), canvas 964×460px

   #1 [root] col1
      dsh 插件的客户端 bundle 要怎么写
      ├─ #2 [auto 1.00] col2
      │  dsh 插件的客户端 bundle 怎么注册插槽
      ├─ #3 [auto 1.00] col2
      │  dsh 插件的客户端 bundle 怎么读会话投影
      ├─ #4 [auto 1.00] col2
      │  dsh 插件的客户端 bundle 怎么写回输入框
      ├─ #5 [auto 1.00] col2
      │  dsh 插件的客户端 bundle 怎么持久化状态
      └─ #6 [auto 1.00] col2
         dsh 插件的客户端 bundle 怎么做主题适配

   connectors (parent right edge → child left edge):
     #1 → #2   (628,230) → (684,50)   [auto]
     #1 → #3   (628,230) → (684,140)   [auto]
     #1 → #4   (628,230) → (684,230)   [auto]
     #1 → #5   (628,230) → (684,320)   [auto]
     #1 → #6   (628,230) → (684,410)   [auto]
     #__title__ → #1   (280,230) → (360,230)   [root]

   column occupancy: col0=1  col1=1  col2=5

──────────────────────────────────────────────────────────────────────────
D. Manual override wins
──────────────────────────────────────────────────────────────────────────
why: The matcher would link #3 to #2; pinning it to #1 and forcing #2 to a new branch must survive.
result: 3 turns → 2 branch root(s), 3 column(s), 3 connector(s), canvas 964×190px
manual: {"turn:3":"turn:1","turn:2":null}

   #1 [root] col1
      插件安装到 dsh 的 web profile 需要重启吗
      └─ #3 [manual 1.00] col2
         dsh 插件安装完了还是要重启 profile 吗
   #2 [manual 0.00] col1
      dsh 插件安装失败怎么排查 profile 配置

   connectors (parent right edge → child left edge):
     #1 → #3   (628,50) → (684,50)   [manual]
     #__title__ → #1   (280,95) → (360,50)   [root]
     #__title__ → #2   (280,95) → (360,140)   [manual]

   column occupancy: col0=1  col1=2  col2=1

──────────────────────────────────────────────────────────────────────────
E. Nothing matches
──────────────────────────────────────────────────────────────────────────
why: Five unrelated questions. Every one must become its own branch root.
result: 5 turns → 5 branch root(s), 2 column(s), 5 connector(s), canvas 640×460px

   #1 [root] col1
      晚饭吃什么比较好
   #2 [root] col1
      明天天气怎么样
   #3 [root] col1
      推荐一部科幻电影
   #4 [root] col1
      怎么练习长跑
   #5 [root] col1
      咖啡因每天摄入上限是多少

   connectors (parent right edge → child left edge):
     #__title__ → #1   (280,230) → (360,50)   [root]
     #__title__ → #2   (280,230) → (360,140)   [root]
     #__title__ → #3   (280,230) → (360,230)   [root]
     #__title__ → #4   (280,230) → (360,320)   [root]
     #__title__ → #5   (280,230) → (360,410)   [root]

   column occupancy: col0=1  col1=5

──────────────────────────────────────────────────────────────────────────
F. Segmentation / keyword engine (the inputs to matching)
──────────────────────────────────────────────────────────────────────────
   text : 插件安装到 dsh 的 web profile 需要重启吗
   terms: ["插件","安装","dsh","web","profile","重启"]
   note : 2-char minimum, stopwords dropped, no invented compounds
```

---

## 三、变异验证：证明门禁会红

每个用例把**一个历史 bug** 重新塞回一份一次性副本，然后断言指名的那道门禁变红。全绿的门禁没有意义，除非它能失败 —— 这一节就是它能失败的证据。

```
══════════════════════════════════════════════════════════════════════════
1. GATES
══════════════════════════════════════════════════════════════════════════

  PASS  check.mjs
        note: manifest: one loader row for @nydsg/dsh-mindmap
        note: tokens: 16 declared, 16 consumed
        check: PASS (0 problems)

  PASS  behaviour.mjs
        behaviour: PASS (0 problems)

  PASS  registration.mjs
        note: bundle: D:\Codex-workspace\dsh-mindmap\lib\client.js
        note: locale keys: 93 zh / 93 en; view-referenced: 78
        registration: PASS (0 problems)

══════════════════════════════════════════════════════════════════════════
2. SHOWCASE — what the engine produces
══════════════════════════════════════════════════════════════════════════

── interleaved topics (install / styling) ──────────────────────────────
   5 turns · 2 branch root(s) · 4 column(s) · 5 connector(s)
   canvas 1288×190px

  #1 [root]   col 1  y   12  h 76
     插件安装到 dsh 的 web profile 需要重启吗
  │  ├─ #2 [auto 0.56]   col 2  y   12  h 76
  │  │     dsh 插件安装失败怎么排查 profile 配置
  │  │  ├─ #5 [auto 0.56]   col 3  y   12  h 76
  │  │  │     dsh 插件安装完了还是要重启 profile 吗
  #3 [root]   col 1  y  102  h 76
     思维导图的卡片配色能不能换成深色主题
  │  ├─ #4 [auto 0.44]   col 2  y  102  h 76
  │  │     深色主题下卡片的对比度需要满足 4.5:1 吗

   connector  2 →  5  (952,50) → (1008,50)  [auto]
   connector  1 →  2  (628,50) → (684,50)  [auto]
   connector __title__ →  1  (280,95) → (360,50)  [root]
   connector  3 →  4  (628,140) → (684,140)  [auto]
   connector __title__ →  3  (280,95) → (360,140)  [root]

── single chain (every turn continues the last) ────────────────────────
   3 turns · 1 branch root(s) · 4 column(s) · 3 connector(s)
   canvas 1288×100px

  #1 [root]   col 1  y   12  h 76
     我要做一个 DSH 插件
  │  ├─ #2 [auto 0.60]   col 2  y   12  h 76
  │  │     这个 DSH 插件怎么做思维导图视图
  │  │  ├─ #3 [auto 0.60]   col 3  y   12  h 76
  │  │  │     思维导图视图的分支连线怎么画

   connector  2 →  3  (952,50) → (1008,50)  [auto]
   connector  1 →  2  (628,50) → (684,50)  [auto]
   connector __title__ →  1  (280,50) → (360,50)  [root]

── manual override: pin #3 under #1 and force #2 to a new branch ───────
   3 turns · 2 branch root(s) · 3 column(s) · 3 connector(s)
   canvas 964×190px

  #1 [root]   col 1  y   12  h 76
     插件安装到 dsh 的 web profile 需要重启吗
  │  ├─ #3 [manual 1.00]   col 2  y   12  h 76
  │  │     dsh 插件安装完了还是要重启 profile 吗
  #2 [manual 0.00]   col 1  y  102  h 76
     dsh 插件安装失败怎么排查 profile 配置

   connector  1 →  3  (628,50) → (684,50)  [manual]
   connector __title__ →  1  (280,95) → (360,50)  [root]
   connector __title__ →  2  (280,95) → (360,140)  [manual]

   manual overrides applied: {"turn:3":"turn:1","turn:2":null}

══════════════════════════════════════════════════════════════════════════
3. MUTATION — break one behaviour, prove a gate catches it
══════════════════════════════════════════════════════════════════════════

  ✓  revert the inject face: pass the raw source as `useChat` instead of declaring it under `hooks`
       expected registration.mjs to FAIL → it failed
         - inject() must declare sources under `hooks`; without it the renderer passes the face through verbatim and the view receives raw source objects instead of Hooks
         - the bound face must expose useChat as a callable Hook
       other gates: check.mjs:pass  behaviour.mjs:pass

  ✓  let a pinned branch root be re-linked by the matcher (the manual-vs-auto bug)
       expected behaviour.mjs to FAIL → it failed
         - a pinned root must be labelled manual, not mistaken for an unmatched turn
         - a pinned link must be labelled manual
       other gates: check.mjs:pass  registration.mjs:pass

  ✓  assign rows by a pre-order walk instead of centering a parent on its children
       expected behaviour.mjs to FAIL → it failed
         - parent turn:2 must sit between its children (top 50, parent 140, bottom 50)
         - parent turn:1 must sit between its children (top 140, parent 230, bottom 140)
         - parent __title__ must sit between its children (top 230, parent 410, bottom 320)
         - parent __title__ must sit between its children (top 230, parent 410, bottom 320)
       other gates: check.mjs:pass  registration.mjs:pass

  ✓  allow a connector to be omitted (draw no line for a linked node)
       expected behaviour.mjs to FAIL → it failed
         - one connector per turn, none for the title: got 2, expected 4
       other gates: check.mjs:pass  registration.mjs:pass

  ✓  collapse the shared-signal ratio to a raw cosine (the matcher's original scoring)
       expected behaviour.mjs to FAIL → it failed
         - background-only overlap must fall under the threshold, got 0.511
         - similarity must be a fraction
       other gates: check.mjs:pass  registration.mjs:pass

  ✓  let the depth limit fold the title node itself (the whole map collapsed into one card)
       expected behaviour.mjs to FAIL → it failed
         - at limit 1 the title and the first level are drawn: got 4, expected 3
       other gates: check.mjs:pass  registration.mjs:pass

  ✓  skip the title's outgoing connectors (the branch roots end up floating)
       expected behaviour.mjs to FAIL → it failed
         - one connector per turn, none for the title: got 2, expected 4
         - every branch root must be connected to the title, not merely listed after it: got 0, expected 2
       other gates: check.mjs:pass  registration.mjs:pass

  ✓  substitute the anchor text with a generic caption instead of the first question
       expected behaviour.mjs to FAIL → it failed
         - the title must carry the first question
       other gates: check.mjs:pass  registration.mjs:pass

  ✓  unquote the loader row's package scalars (the manifest that aborted installation)
       expected check.mjs to FAIL → it failed
         - cordis.patch.yml is not valid YAML: line 20: a plain scalar may not start with "@" — quote it
       other gates: behaviour.mjs:pass  registration.mjs:pass

  ✓  insert the loader row twice under the same id (duplicate loader entry id)
       expected check.mjs to FAIL → it failed
         - cordis.patch.yml inserts loader id "@nydsg/dsh-mindmap" more than once — duplicate loader entry ids abort startup
         - cordis.patch.yml must insert exactly one loader row for @nydsg/dsh-mindmap; saw ["@nydsg/dsh-mindmap","@nydsg/dsh-mindmap"]
       other gates: behaviour.mjs:pass  registration.mjs:pass

══════════════════════════════════════════════════════════════════════════
SUMMARY
══════════════════════════════════════════════════════════════════════════
  13 passed, 0 failed

test: PASS (all gates green, all mutations caught)
```

---

## 四、诚实边界

- 以上全部是**机检**。我没有截图能力，所以**渲染后的视觉观感、连线弧度、卡片宽度是否合适，仍需你亲眼确认**。
- 变异验证只能证明「门禁能抓住这些特定类型的退化」，不能证明它抓住了所有退化。
- 用例里的会话是我构造的形状，不是真实使用中全部的语言分布；中文分词与相似度阈值在真实长会话上的表现可能有偏差。
