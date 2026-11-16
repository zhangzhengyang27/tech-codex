# 12 FAQ 与故障排查

> 项目：interview-platform ｜ 版本：v1.1 ｜ 生成日期：2026-10-06 ｜ 修订：2026-10-06 一致性回刷 ｜ 依据：源码分析

本篇是排障手册：收录部署与开发中的高频报错与坑，给出可执行的排查决策树与日志入口。每一条都标注了根因所在的源码位置；与环境变量相关的完整清单见《14-配置与环境详解》，部署链路细节见《06-部署运行》。使用建议：先看第 0 节决策树定位故障层级，再到对应小节找解法；本篇的所有结论都遵循「现象 → 根因（源码位置）→ 解法」的三段式，遇到本篇未覆盖的新问题，建议按同样格式补充进来，让手册随运维经验一起生长。

排障的总体思路遵循「**由外向内、由廉价到昂贵**」：先看进程是否活着（health 探针），再看日志有无报错前缀（第 10 节速查表），然后核对环境变量（第 5 节矩阵），最后才考虑改代码。本项目的故障有一个显著特征：**大部分「功能坏了」其实是「功能降级了」**——AI、语音视频、上传、邮件都是可选依赖，缺失时以 503 或降级行为表现而非崩溃，因此排障第一步永远是确认「这是故障还是降级」，两者的处置路径完全不同（前者查日志与进程，后者查配置）。

## 0. 排查决策树

```mermaid
flowchart TD
    P["问题现象"] --> Q1{"服务能访问吗?<br/>GET /api/health"}
    Q1 -->|不通| A1["容器未起/端口不对<br/>→ 查 docker compose logs<br/>→ 见第 3 条"]
    Q1 -->|200 但页面白屏/报错| Q2{"哪个层级?"}
    Q2 -->|"pnpm dev 报类型错误<br/>Cannot find module generated/prisma"| A2["prisma generate 未执行<br/>→ 见第 2 条"]
    Q2 -->|"db:migrate / db seed 连不上库"| A3[".env 未配置 DATABASE_URL<br/>Prisma CLI 只读 .env<br/>→ 见第 1 条"]
    Q2 -->|"登录后一直跳回 /login"| A4["AUTH_SECRET 不一致或失效<br/>→ 见第 4 条"]
    Q2 -->|"接口 503"| A5["外部依赖未配置<br/>→ 对照第 5 条矩阵"]
    Q2 -->|"接口 429"| A6["限流<br/>→ 见第 6 条"]
    Q2 -->|"判题超时/报错"| A7["Piston 外部服务<br/>→ 见第 7 条"]
    Q2 -->|"注册收不到验证码"| A8["SMTP 未配置降级控制台<br/>→ 见第 8 条"]
    Q2 -->|"容器反复重启"| A9["迁移失败或健康检查不过<br/>→ 见第 3 条"]
```

## 1. 「.env 与 .env.local 加载者不同」——Prisma CLI 连不上数据库

**现象**：`pnpm dev` 一切正常，但 `pnpm db:migrate` / `pnpm db:studio` / `pnpm prisma db seed` 报错连不上库或 `DATABASE_URL` 为空；反过来只建了 `.env` 时，网站正常而 CLI 也正常——很多人因此误判为「玄学」。

**根因**：项目里有两套 env 加载器。Next.js 进程（`next dev` / `next start`）按 Next 约定加载，优先级 `.env.local` > `.env`；而 Prisma CLI 由 `prisma.config.ts` 驱动，其第一行 `import "dotenv/config"` 使用 dotenv 默认行为，**只加载根目录 `.env`，不读 `.env.local`**。因此「只建 `.env.local`」的本地环境会出现网站能跑、CLI 报错的割裂。

**解法**（任选其一）：把 `DATABASE_URL` 同时写进 `.env` 与 `.env.local`（最省心）；或始终在 shell 里 export 后再跑 CLI 命令；或统一只用 `.env`（接受它会进 Next 加载链的低风险差异）。注意 `.env` 与 `.env.local` 均被 `.gitignore` 排除，不会误提交。

## 2. 类型报错 Cannot find module '@/generated/prisma/client'——prisma generate 无 postinstall

**现象**：克隆仓库、`pnpm install` 完成后，全项目大面积类型报错（所有 import 生成客户端的文件），`pnpm dev` 也起不来。

**根因**：Prisma 7 的客户端生成到 `src/generated/prisma/`（`prisma/schema.prisma` 头部 generator 配置），该目录被 `.gitignore` 排除且 `package.json` **没有 postinstall 钩子**自动生成，克隆后必然不存在。

**解法**：`pnpm exec prisma generate`。每次**拉取包含 schema 变更的代码后**都要重新执行（SOP 见《11-扩展开发指南》SOP 二）。Docker 构建不受影响（Dockerfile 构建阶段显式执行了 generate）。

## 3. 容器反复重启 / 一直不健康

**现象**：`docker compose up -d` 后容器不断重启，或 `docker ps` 显示 unhealthy。

**排查顺序**：
1. `docker compose logs mianshi` 看启动日志。CMD 是 `prisma migrate deploy && pnpm start -p 4300`，**迁移失败会导致容器退出**，restart 策略 `unless-stopped` 又拉起，形成循环。常见迁移失败原因：数据库不可达（`DATABASE_URL` 错误/网络不通）、历史迁移与库状态冲突（手工改过库结构）。
2. 健康检查：镜像 HEALTHCHECK 与 compose healthcheck 都探 `GET /api/health`（30 秒间隔、5 秒超时、20 秒启动宽限、3 次重试）。该探针无外部依赖，**它失败说明进程本身有问题**（如 start 还没完成就超时——首次启动含迁移回放，20 秒宽限内未就绪属正常，多等一轮）；反之探针通过但业务接口 5xx，是数据库等依赖问题。
3. 端口核对：容器内固定 4300，compose 映射 `4300:4300`；宿主端口被占用会启动失败。

**构建期特别提醒**：`Dockerfile` 构建阶段注入的是**假连接串** `postgresql://build:build@localhost:5432/build_dummy` 与 `AUTH_SECRET=build-only-dummy`（注释明确「绝不通过 build-arg 传入真实连接串」）。若有人把真实密钥通过 build-arg 传入，会被记录进镜像层历史，属安全事故；构建报「连不上数据库」则方向反了——构建期本就不该连库，检查是否误删了这两个 ENV。

## 4. 登录后一直被踢回 /login 或权限丢失

**现象**：登录成功，访问受保护页面立刻跳回 `/login?callbackUrl=...`；或后台接口全部 401/403。

**根因与解法**：
- **AUTH_SECRET 不一致**：会话 JWT 的签名密钥在 `src/lib/auth.ts`（显式 `AUTH_SECRET`）、`src/proxy.ts`（`NEXTAUTH_SECRET ?? AUTH_SECRET` 兜底）、`src/lib/jwt.ts`（后台 Bearer）三处出现。compose 中 `NEXTAUTH_SECRET` 注入为 `${AUTH_SECRET}` 同值兜底；若手工部署漏配其一，proxy 验签失败即视为未登录。对齐三者即可。
- **更换过 AUTH_SECRET**：所有旧会话立即失效（这是《08-安全与权限设计》第 10 节的标准应急处置手段），全部用户需重新登录——不是故障。
- **被封禁**：`session` 回调查到 `banned=true` 返回 null 会话，前端表现为「登录成功但任何请求都 401 并自动登出」。查库 `SELECT banned FROM users WHERE email=...`。
- **admin 页面 302 首页**：proxy 校验的是 JWT 里的 `token.role`（登录时写入），刚被提升为 admin 的旧会话要**重新登录**才携带新角色；且 RBAC 权限有 30 秒缓存。

## 5. 接口 503：外部依赖未配置对照矩阵

503 是本项目的「功能级降级」语义，按响应消息对照下表补配置（变量详情见《14-配置与环境详解》第 3 节）：

| 响应消息关键词 | 缺失变量 | 影响范围 |
| --- | --- | --- |
| DEEPSEEK_API_KEY 未配置 | `DEEPSEEK_API_KEY`（占位值 `sk-your...`/`fake` 视同未配） | AI 对话/模拟面试/渐进提示/评分/代码点评 |
| 视频面试未配置 | `VOLC_S2S_APP_ID/VOLC_S2S_ACCESS_TOKEN/VOLC_RTC_APP_ID/VOLC_RTC_APP_KEY/VOLC_ACCESS_KEY/VOLC_SECRET_KEY` 六项 | 视频面试（前端 HEAD 探测 503 会直接隐藏入口） |
| 火山引擎语音未配置 | `VOLC_API_KEY` | ASR 语音转文字 / TTS 朗读 |
| 环境变量 OSS_xxx 未配置 | `OSS_ACCESS_KEY_ID/OSS_ACCESS_KEY_SECRET/OSS_ROLE_ARN`（强校验三件套） | 图片/头像上传 |
| CRON_SECRET 未配置，摘要端点不可用 | `CRON_SECRET` | 仅 `/api/reminders/digest` |

## 6. 接口 429：限流触发

**现象**：请求返回 429 + `X-RateLimit-*` 头，或前端提示「请求过于频繁」。

**要点**：限流器（`src/lib/rate-limit.ts`）是**进程内存**滑动窗口——重启进程即清零（排障时「重启后好了」就是限流而非权限问题）；多实例部署配额不共享；限流键大多按 userId，同一用户多标签页共享配额。各接口配额矩阵见《08-安全与权限设计》第 4 节（AI 对话 20/分、模拟面试 10/分 + 每日 20 场等）。模拟面试的「今日次数已达上限（20 场）」按上海时区自然日统计（`mock-interview/route.ts` 手工推算 UTC+8 零点），UTC 服务器上跨 16:00（北京时间零点）才重置——用户在「深夜」被限额而服务器日期未变属预期行为。

## 7. 判题超时或报错

**现象**：提交代码返回 `time_limit_exceeded`、`runtime_error`，或「代码执行服务错误: 5xx」。

**排查**：判题走公共 Piston API（`src/lib/code-runner.ts` 的 `https://emkc.org/api/v2/piston/execute`），单用例 15 秒超时（`src/lib/judge.ts` 的 `Promise.race`）。服务报 5xx 通常是 Piston 限流或抖动（公共免费服务，无 SLA）；`time_limit_exceeded` 可能是算法真的慢，也可能是 Piston 排队挤占了 15 秒预算。语言支持以 `LANGUAGE_MAP` 为准（JS 18.15/TS 5.0.3/Python 3.10/Java 15.0.2/C++ 10.2.0），其余语言直接报「不支持的语言」。Java/C++ 未自带 main 的代码只会得到提示文案（包装器局限，见《07-模块详解》第 2.2 节）。内网隔离环境判题整体不可用，源码未提供自建 Piston 端点切换配置 ⚠️ 待确认。

## 8. 注册收不到验证码

**现象**：注册页提交邮箱后收不到邮件。

**排查**：第一步看服务端日志有没有 `[mailer] 未配置 SMTP，验证码降级输出到控制台`——SMTP 三件套（`SMTP_HOST/SMTP_USER/PASS`）任一缺失即降级打印（`src/lib/mailer.ts`），验证码就在日志里，本地联调可直接取用。第二步若已配置 SMTP，看 `[mailer] 邮件发送失败` 警告（收件人退信/网络/授权码过期），发送失败同样降级打印验证码，不阻断注册。第三步确认限流：发码 IP 5 次/分（429 提示）、同邮箱 60 秒重发窗口（`isRateLimited`，前端提示稍后再试）。**注意**：`.env.example` 里没有 SMTP 组变量，需对照 `mailer.ts` 手工补齐（《13-技术债务与演进建议》3.3）。

两个延伸细节有助于判断「码到底发没发出去」：其一，验证码落库先于发信（`saveCode` 写 `VerificationToken` 表成功后才调 `sendVerificationCode`），所以查库能看到码即代表生成环节正常，问题必然在传输侧；其二，验证码校验通过会删除该邮箱全部历史码（`verify-code.ts` 的一次性语义），若测试时「码用一次后就失效」是设计行为而非 bug——重新发码即可，不要试图复用旧码。生产环境长期收不到邮件时，优先排查云服务商的 25/465 端口出站封禁（多数云默认封锁 25 端口，mailer 固定 `secure: true` 走 465），这类问题在应用日志上表现为 `[mailer] 邮件发送失败` 伴随连接超时。

## 9. 其他高频坑速查

- **局域网设备访问开发服务器被拒**：`next.config.ts` 的 `allowedDevOrigins` 白名单硬编码了 `192.168.1.4`，换网络需同步修改，否则手机联调语音面试被 Next 开发服务器拒绝。
- **改了头像/昵称导航栏不更新**：会话资料每次拉取都回查库刷新（`src/lib/auth.ts` session 回调），若仍不生效检查是否走了 SWR 缓存（2 秒去重窗口内）或客户端 session 缓存，可调 `useSession().update()`。
- **SSE 流式变成一次性输出**：生产反代缓冲了响应。Nginx 需对该路径 `proxy_buffering off`；应用侧已带 `Cache-Control: no-cache, no-transform` 但未带 `X-Accel-Buffering: no` ⚠️ 待确认（必要时在 SSE 响应头补上）。
- **改了 schema 但接口字段没变**：先确认 `prisma generate` 已重跑；再确认页面数据映射——模拟面试字段 `aiQuestion/userAnswer/aiFeedback` 前端映射为 `question/answer/feedback`（`AGENTS.md` 约定第 4 条），别在一边单独改名。
- **打卡/复习的「今天」不对**：业务日界硬编码 Asia/Shanghai（`src/lib/streak.ts`），与服务器 TZ 无关；若按 UTC 日期核对数据会对不上，统一用上海时区口径核对。
- **分享链接指向 localhost**：`NEXT_PUBLIC_APP_URL` 未配置，`/api/share`、sitemap、robots 用默认值（`http://localhost:3000` 或示例域名），生产必配真实域名。
- **页面统计脚本请求外部域名**：`src/app/layout.tsx` 硬编码了作者个人的 Umami 统计脚本，二次部署应删除或替换（详见《08-安全与权限设计》第 9 节第 10 条）。
- **后台改了用户角色但不生效**：两层延迟叠加——proxy 校验的 `token.role` 是登录时写入 JWT 的旧值（需重新登录），RBAC 权限点有 30 秒内存缓存（`src/lib/permission.ts`）。排障时先等 30 秒再让用户重登，两步都做了仍不行才查 Role/Permission 表数据。
- **`prisma db seed` 报错找不到 `../src/data/xxx.js`**：seed 脚本以 `.js` 后缀 import TS 数据文件（tsx 运行时解析），若新增数据文件后缀或路径不符 `prisma/seed.ts` 的 SOURCES 登记项即报错；对齐 import 路径与文件名即可。
- **视频面试入口不出现**：这是设计行为——前端先 `HEAD /api/video-interview/token` 探测，六项火山凭证任一缺失返回 503，入口直接隐藏。要让入口出现就补齐凭证，而不是找前端开关。
- **题解点赞数异常暴涨**：点赞接口无鉴权守卫且无去重（简单 +1），脚本可刷；数据修复需手工 `UPDATE solutions SET upvotes=...`，根治见《13-技术债务与演进建议》2.2。
- **同时改 `.env` 不生效**：Next dev 对 env 的热加载有限，部分变量（尤其 `next.config.ts` 构建期读取的 `OSS_HOSTNAME`）必须重启 dev server 甚至重新 build；生产环境则一律要重建镜像或重启容器。

## 10. 日志入口

应用没有结构化日志/APM，全部日志走 stdout/stderr（compose 侧 json-file 驱动，20MB × 5 个文件轮转），按前缀检索：

| 前缀/关键字 | 产生位置 | 含义 |
| --- | --- | --- |
| `[API Error] <METHOD /path>` | `src/lib/api-response.ts` `handleApiError` | 接口未捕获异常（伴随 500），含完整堆栈 |
| `[mailer] 未配置 SMTP...` / `[mailer] 邮件发送失败...` | `src/lib/mailer.ts` | 邮件降级/失败，降级时附带验证码 |
| `[jwt] 使用开发默认密钥...` | `src/lib/jwt.ts` | 生产出现即为致命配置错误（说明 AUTH_SECRET 缺失但未抛错前） |
| `[auth] session refresh user failed...` | `src/lib/auth.ts` | 会话回调查库失败（数据库抖动），降级用 token 旧值 |
| `DeepSeek API error: <status>` | `src/lib/deepseek.ts` | AI 上游错误（含上游响应体片段） |
| `ASR 识别失败` / `豆包 TTS 调用失败` / `StartVoiceChat 失败` | 对应路由/服务 | 语音视频上游故障 |
| `console.error` 各路由局部（如 `GET /api/stats error:`） | 各 Route Handler | 路由级 catch 的错误详情 |

排障命令速查：`docker compose logs -f mianshi`（跟随日志）、`docker compose logs mianshi | grep -i "API Error"`（错误检索）、`docker compose exec mianshi pnpm exec prisma studio`（容器内查库，需端口转发）⚠️ 待确认（容器内 Studio 的端口未在 compose 暴露，更稳妥的是宿主机直连数据库后 `pnpm db:studio`）。数据库侧慢查询建议开启 PostgreSQL 的 `pg_stat_statements` 扩展（性能观测缺口见《10-性能设计与优化》第 7 节）。
