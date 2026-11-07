#!/usr/bin/env ego-browser nodejs
// bili-sub.mjs — 无插件版 B站 AI 字幕提取（只依赖 ego 浏览器）
// 用法: ego-browser nodejs /Users/zhangshuo12/Scripts/bili-sub/bili-sub.mjs --url <视频URL|BV号> [--out <目录>]
// 原理: 打开视频页 → 点开字幕菜单 → 点「中文(AI)」→ 播放器请求 aisubtitle.hdslb.com
//       → 从 performance 资源清单取该 URL → 页面内 fetch 拿 JSON → 转 SRT 落盘

const args = process.argv.slice(2);
const getOpt = (name) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : null;
};

const rawUrl = getOpt("url");
const outDir = getOpt("out") || process.env.HOME + "/Downloads";
if (!rawUrl) {
  console.error("用法: bili-sub.mjs --url <视频URL|BV号> [--out <目录>]");
  process.exit(1);
}
const url = rawUrl.startsWith("http")
  ? rawUrl
  : `https://www.bilibili.com/video/${rawUrl.match(/BV\w+/i)?.[0] || rawUrl}/`;
const bvid = url.match(/BV\w+/i)?.[0] || "video";

const spaceName = "bili-sub-" + bvid;

const task = await taskSpace(spaceName);
const page = task.page("p1");
await page.goto(url, { timeout: 30000 });
await page.waitForLoadState("load");
await page.waitForTimeout(2500);

// 1. 标题 + 登录态检查
const meta = await page.evaluate(() => ({
  title: document.title.replace("_哔哩哔哩_bilibili", ""),
  subList: (window.__INITIAL_STATE__?.videoData?.subtitle?.list || []).map(s => ({
    lan: s.lan, lan_doc: s.lan_doc, ai_status: s.ai_status, url: s.subtitle_url,
  })),
}));
console.log(`视频: ${meta.title} (${bvid})`);
if (!meta.subList.length) {
  console.error("该视频没有任何字幕轨（含AI），无法提取");
  await task.finish({ keep: [] });
  process.exit(1);
}

// 2. 打开字幕菜单
await page.click(".bpx-player-ctrl-subtitle", { label: "打开字幕菜单" });
await page.waitForTimeout(1000);

// 3. 点语言项（优先中文字幕；有 CC 用 CC，没有则点任意语言项触发 AI 字幕）
const clicked = await page.evaluate(() => {
  const pick = [...document.querySelectorAll(
    ".bpx-player-ctrl-subtitle-language-item, .bpx-player-subtitle-language-item"
  )];
  const zh = pick.find(e => (e.textContent || "").includes("中文"));
  const target = zh || pick[0];
  if (target) { target.click(); return (target.textContent || "").trim(); }
  return null;
});
if (!clicked) {
  console.error("字幕菜单里没有可点的语言项");
  await task.finish({ keep: [] });
  process.exit(1);
}
console.log(`已选择字幕轨: ${clicked}`);

// 4. 等播放器发起 aisubtitle 请求（performance 里出现）
let subUrl = null;
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(1000);
  const urls = await page.evaluate(() =>
    performance.getEntriesByType("resource").map(e => e.name)
      .filter(u => /aisubtitle\.hdslb\.com|\/bfs\/subtitle\//.test(u))
  );
  if (urls.length) { subUrl = urls[urls.length - 1]; break; }
}
if (!subUrl) {
  console.error("未捕获到字幕请求（AI字幕可能未生成或需登录）");
  await task.finish({ keep: [] });
  process.exit(1);
}

// 5. 页面内 fetch 拿 JSON（带页面 cookie/UA，auth_key 已在 URL 里）
const resp = await page.fetch(subUrl, { timeout: 15000 });
const data = JSON.parse(resp.body);
const body = data.body;
if (!Array.isArray(body) || !body.length) {
  console.error("字幕 JSON 无内容:", data.type, data.lang ?? "");
  await task.finish({ keep: [] });
  process.exit(1);
}

// 6. 转 SRT
const toSrtTime = (sec) => {
  const ms = Math.round(sec * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  const milli = String(ms % 1000).padStart(3, "0");
  return `${h}:${m}:${s},${milli}`;
};
const srt = body
  .filter(x => (x.content || "").trim())
  .map((x, i) => `${i + 1}\n${toSrtTime(x.from || 0)} --> ${toSrtTime(x.to || (x.from || 0) + 2)}\n${x.content.trim()}\n`)
  .join("\n");

// 7. 落盘
const fs = await import("node:fs/promises");
const safeTitle = meta.title.replace(/[\\/:*?"<>|]/g, "").trim();
const outPath = `${outDir}/${safeTitle}_${bvid}.srt`;
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(outPath, srt, "utf-8");
console.log(`完成: ${outPath} (${body.length} 条字幕)`);

await task.finish({ keep: [] });
