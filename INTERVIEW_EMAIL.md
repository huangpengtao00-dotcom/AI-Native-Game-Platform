# 面试官邮件正文

主题：AI Native 游戏生成平台项目提交 - ForgePlay

老师/您好：

这是我的 AI Native 全栈系统设计项目提交，项目名称为 ForgePlay 智能体游戏平台。

GitHub 仓库：
https://github.com/huangpengtao00-dotcom/AI-Native-Game-Platform

项目定位：
这是一个 AI 原生互动游戏生成平台 MVP。用户可以注册/登录、输入游戏创意、上传参考素材，由 Agent 编排生成任务、产出可运行 HTML 游戏 bundle 与 manifest，保存到对象存储，并在游戏大厅发布后通过沙盒 iframe 试玩。

核心亮点：

- 完整业务闭环：游戏大厅 -> 登录/注册 -> 创作工坊 -> Agent 生成任务 -> 日志与产物持久化 -> 预览 -> 发布 -> 试玩。
- 可运行游戏产物：生成 bundle 是 16:9 Canvas 横版游戏，包含键盘控制、收集物、机关、终点、分数、计时和重开。
- 工程化后端：Node.js 原生 HTTP、Node 24 `node:sqlite`、SQLite、对象存储适配层、任务日志、审计事件、manifest 合约。
- 安全边界：HttpOnly SameSite Cookie、CSRF、上传类型限制、对象 key 清洗、CSP、iframe sandbox、提示词注入筛查。
- AI 接入边界：默认本地确定性 Agent 可离线运行，也支持 OpenAI 兼容模型供应商生成设计 JSON。
- 展示完整度：新版浅色高级前端包含 Opall / 黄澎涛 作者封面页、Steam 式 15 类游戏类型橱窗，以及 15 个通过网站 Create-flow 预生产的可试玩游戏。

本地运行方式：

```bash
cd AI-Native-Game-Platform
npm.cmd start
```

打开：
http://127.0.0.1:4173

演示账号：

- creator@example.com / password123
- player@example.com / password123

验证命令：

```bash
npm.cmd test
npm.cmd run audit:local
npm.cmd run package:delivery
```

交付证据：

- `INTERVIEW_SUBMISSION.md`：提交说明与检查入口
- `delivery/media/`：作者封面、大厅、15 类型橱窗、创作、任务、试玩截图与 walkthrough 视频
- `docs/delivery.md`：交付清单
- `docs/system-design.md`：系统设计
- `docs/security.md`：安全设计
- `docs/verification.md`：验证记录

说明：
这个版本是面向面试评审的 MVP，不依赖 Docker 或外部服务即可启动。真实模型 API 可以通过环境变量接入；未配置时，系统会使用本地确定性 Agent 跑通完整生成、预览、发布和试玩链路。

谢谢您抽时间查看，期待进一步交流。

黄鹏涛
