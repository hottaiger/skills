#!/bin/zsh
# 用法: run.sh <视频URL|BV号> [输出目录]  （无插件，仅 ego 浏览器）
if [[ -z "$1" ]]; then echo "用法: run.sh <URL|BV号> [输出目录]"; exit 1; fi
ARGS=/tmp/bili-sub-args.txt
printf '%s\n%s\n' "$1" "${2:-$HOME/Downloads}" > "$ARGS"
ego-browser nodejs -e '
const fs0 = await import("node:fs");
const [url, out] = fs0.readFileSync("/tmp/bili-sub-args.txt", "utf8").split("\n");
process.argv = [process.argv[0], "bili-sub", "--url", url, "--out", out];
await import("file:///Users/zhangshuo12/.agents/skills/bili-subtitle-download/scripts/bili-sub.mjs");
'
