# hottaiger/skills

我的个人 Agent Skills 合集。每个子目录一个 skill，均可直接安装到 `~/.agents/skills/`（或对应 agent 的 skills 目录）使用。

## Skills

| Skill | 说明 |
|---|---|
| [bili-subtitle-download](skills/bili-subtitle-download/) | 无插件下载 B站视频字幕（AI/CC 字幕 → 带时间戳 SRT）。零浏览器扩展、零 API key，仅依赖 [ego 浏览器](https://github.com/nicepkg/ego)（需 B 站登录态）。用法：`scripts/run.sh <URL\|BV号> [输出目录]` |

## 安装

```bash
git clone https://github.com/hottaiger/skills.git
# 单个 skill：
cp -R skills/<skill-name> ~/.agents/skills/
```

## 收录原则

只收录我自己写的 skill。第三方 skill（cangjie-skill、ego-browser 等）去它们各自的上游仓库安装。
