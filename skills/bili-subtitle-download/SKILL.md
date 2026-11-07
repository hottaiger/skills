---
name: bili-subtitle-download
description: Extract Bilibili video subtitles (AI subtitles and CC subtitles) as timestamped SRT files, using only the ego browser with no extensions and no API keys. Use when the user asks to "获取B站字幕" / "提取bilibili字幕" / "导出视频字幕" / "把这个视频的字幕拿下来" / "download bilibili subtitles" for a Bilibili video URL or BV number, typically as source material for distillation (cangjie-skill), summarization, or archiving into the knowledge vault.
metadata:
  version: "1.0.0"
  date: "2026-11-07"
---

# bili-subtitle-download — 无插件 B站视频字幕下载

把 Bilibili 视频的字幕（优先 CC 人工字幕，其次 AI 字幕）导出为带时间戳的 SRT 文件。
零浏览器扩展、零 API key，仅依赖 ego 浏览器（须处于 B 站登录态——AI 字幕的硬前提）。

## 用法

```bash
~/.agents/skills/bili-subtitle-download/scripts/run.sh <视频URL|BV号> [输出目录]
# 输出目录省略则落到 ~/Downloads
# 例:
~/.agents/skills/bili-subtitle-download/scripts/run.sh BV1d8H668Eak ~/Documents/ChatGPT/知识库/.raw/bili-subs
```

输出：`<视频标题>_<BV号>.srt`，每条字幕带 `HH:MM:SS,mmm --> HH:MM:SS,mmm` 时间戳。

## 失败场景与对策

| 现象 | 原因 | 对策 |
|---|---|---|
| `该视频没有任何字幕轨（含AI）` | UP 主关闭字幕且平台未生成 AI 字幕 | 无解；走音频转写（whisper / SILICONFLOW_API_KEY via video-downloader skill） |
| `未捕获到字幕请求` | 未登录（AI 字幕需登录态）；或 AI 字幕尚在生成 | 在 ego 浏览器里人工登录 bilibili.com 后重跑；或稍后重试 |
| `字幕菜单里没有可点的语言项` | 页面结构变化 / 播放器未就绪 | 重跑一次；仍失败则检查 `.bpx-player-ctrl-subtitle` 选择器是否仍有效 |

## 工作原理（维护时读）

逆向自「BiliBili 字幕提取器」扩展（id `mmekbkdnolpcbgbedcibicjhigkfdojg`），机制：

1. `__INITIAL_STATE__.videoData.subtitle.list` 判断有无字幕轨（含 AI 轨 `ai_status:2`）
2. 点开字幕菜单（`.bpx-player-ctrl-subtitle`）→ 点「中文」语言项 → 播放器请求
   `aisubtitle.hdslb.com/bfs/ai_subtitle/prod/<aid><cid><hash>?auth_key=…`
   —— auth_key 由播放器生成，**无法离线构造 URL，必须靠点击触发**
3. 轮询 `performance.getEntriesByType("resource")` 拿完整 URL
   （不钩 fetch/XHR：播放器可能走 worker 绕过，且钩子写坏会污染页面 fetch）
4. `page.fetch()`（ego 逃生舱，同页面 cookie/CORS 上下文）直下 JSON（`type:"AIsubtitle"`）
5. 照抄扩展的 `bodyToSrt` 转换逻辑落盘

传参注意：ego `nodejs` 不继承 shell 环境变量，`run.sh` 通过 `/tmp/bili-sub-args.txt`
固定路径文件传参给 `bili-sub.mjs`——改脚本时别把这个约定改掉。

## 关联

- 产物常作为 [cangjie-skill](../cangjie-skill/SKILL.md) 蒸馏的输入（SRT 即"书"）
- 依赖 [ego-browser](../ego-browser/SKILL.md) 的 taskSpace / page.fetch API
