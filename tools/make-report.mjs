/**
 * Generate tools/TEST-REPORT.md: the captured output of the showcase and the
 * gate/mutation suite, so the evidence is a reviewable artifact rather than a
 * terminal session someone had to be watching.
 *
 * Run: node tools/make-report.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Run one script in this repo and capture its output.
 * @param script - file name under tools/.
 * @returns exit status and combined output.
 */
function run(script) {
	const result = spawnSync(process.execPath, [join(REPO, "tools", script)], { encoding: "utf8" });
	return { status: result.status, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

const showcase = run("showcase.mjs");
const tests = run("test.mjs");
const gates = ["check.mjs", "behaviour.mjs", "registration.mjs"].map((name) => ({ name, ...run(name) }));

const lines = [];
lines.push("# @nydsg/dsh-mindmap 测试运行记录");
lines.push("");
lines.push(`生成自 \`node tools/make-report.mjs\`。全部离线、确定性，无网络、无模型调用。`);
lines.push("");
lines.push("三条命令：");
lines.push("");
lines.push("```");
lines.push("node tools/showcase.mjs     # 用例展示：引擎在给定会话上实际做出的判定 + 树几何");
lines.push("node tools/test.mjs         # 跑门禁，并逐个重放历史 bug 证明门禁会红");
lines.push("node tools/make-report.mjs  # 重新生成本文档");
lines.push("```");
lines.push("");
lines.push("---");
lines.push("");
lines.push("## 一、门禁");
lines.push("");
lines.push("| 门禁 | 检查什么 | 结果 |");
lines.push("|---|---|---|");
lines.push("| `check.mjs` | bundle 可解析、`apply`/`inject` 面正确、CSS 令牌声明与消费一致、组件 CSS 零硬编码颜色 | " + (gates[0].status === 0 ? "PASS" : "FAIL") + " |");
lines.push("| `behaviour.mjs` | 分词、关键词 TF-IDF、分支判定（含评分分离性）、布局几何、投影适配器容错 | " + (gates[1].status === 0 ? "PASS" : "FAIL") + " |");
lines.push("| `registration.mjs` | `apply()`/`inject()` 契约、结构不变量（卡片只露提问、模块行归面板、布局不测 DOM） | " + (gates[2].status === 0 ? "PASS" : "FAIL") + " |");
lines.push("");
lines.push("```");
lines.push(gates.map((gate) => gate.out.trim()).join("\n\n"));
lines.push("```");
lines.push("");
lines.push("---");
lines.push("");
lines.push("## 二、用例展示");
lines.push("");
lines.push("下面是**真实引擎输出**（与门禁断言的是同一份代码，不是重写的副本）：每轮接到哪个更早的提问、判定分数、以及算出的树几何。");
lines.push("");
lines.push("```");
lines.push(showcase.out.trim());
lines.push("```");
lines.push("");
lines.push("---");
lines.push("");
lines.push("## 三、变异验证：证明门禁会红");
lines.push("");
lines.push("每个用例把**一个历史 bug** 重新塞回一份一次性副本，然后断言指名的那道门禁变红。全绿的门禁没有意义，除非它能失败 —— 这一节就是它能失败的证据。");
lines.push("");
lines.push("```");
lines.push(tests.out.trim());
lines.push("```");
lines.push("");
lines.push("---");
lines.push("");
lines.push("## 四、诚实边界");
lines.push("");
lines.push("- 以上全部是**机检**。我没有截图能力，所以**渲染后的视觉观感、连线弧度、卡片宽度是否合适，仍需你亲眼确认**。");
lines.push("- 变异验证只能证明「门禁能抓住这些特定类型的退化」，不能证明它抓住了所有退化。");
lines.push("- 用例里的会话是我构造的形状，不是真实使用中全部的语言分布；中文分词与相似度阈值在真实长会话上的表现可能有偏差。");
lines.push("");

const report = lines.join("\n");
writeFileSync(join(REPO, "tools", "TEST-REPORT.md"), report, "utf8");
console.log(`report: tools/TEST-REPORT.md (${report.length} bytes, ${report.split("\n").length} lines)`);
console.log(`showcase exit=${showcase.status}  test exit=${tests.status}  gates=${gates.map((gate) => `${gate.name}:${gate.status}`).join(" ")}`);
process.exit(showcase.status === 0 && tests.status === 0 && gates.every((gate) => gate.status === 0) ? 0 : 1);
