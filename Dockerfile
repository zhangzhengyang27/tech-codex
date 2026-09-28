# tech-codex Next.js 单容器多阶段构建
# 关键点：
# - 分类页 SSG + 详情页动态 SSR（运行时读 docs/），run 阶段必须带 docs/
# - redirects/ 由 next.config.ts 启动时读取，run 阶段必须带
# - ⚠️ rewrites 的 KB_BACKEND_ORIGIN 在 next build 时烘焙进 routes-manifest，
#   必须在构建期注入（值=kbnet 内后端容器名），运行期 env 只对 SSR 请求路径有效
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app
ENV CI=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
RUN pnpm install --no-frozen-lockfile
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=3072
ENV KB_BACKEND_ORIGIN=http://rag-backend:8081
RUN pnpm build

FROM node:22-slim AS run
ENV NODE_ENV=production
ENV CI=true
RUN corepack enable
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/docs ./docs
COPY --from=build /app/redirects ./redirects
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
EXPOSE 4200
CMD ["pnpm", "start", "-p", "4200"]
