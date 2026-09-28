import { execFileSync } from 'node:child_process';
import { allCategories } from './docs-config';

export interface RecentUpdate {
  type: 'new' | 'modified';
  /** 所属模块标签（分类标题兜底） */
  module: string;
  /** 文档标题（由文件名去掉序号前缀得到） */
  title: string;
  /** 变更说明（取自该文档最近一次提交的说明） */
  description: string;
  /** 可跳转的文档链接（无法解析分类时为空） */
  href?: string;
}

/** 缓存 5 分钟：避免开发模式每次请求都执行 git */
let cached: { at: number; data: RecentUpdate[] } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * 基于 git 提交历史产出"最近更新"流：
 * 每篇文档取其最近一次涉及 docs/ 的提交，新增文件标记 NEW，
 * 其余标记修订，按提交时间倒序输出。git 不可用或无历史时返回空数组。
 */
export function getRecentUpdates(limit = 12): RecentUpdate[] {
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data.slice(0, limit);

  let data: RecentUpdate[] = [];
  try {
    data = collectFromGit();
  } catch {
    data = [];
  }
  cached = { at: Date.now(), data };
  return data.slice(0, limit);
}

function collectFromGit(): RecentUpdate[] {
  const out = execFileSync(
    'git',
    ['-c', 'core.quotepath=false', 'log', '--name-status', '--pretty=format:@%cI|%s', '--', 'docs/'],
    { cwd: process.cwd(), encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }
  );

  // git log 按新→旧列出提交;每篇文档只保留首次出现(即最新)的记录
  const latest = new Map<string, { added: boolean; date: string; subject: string }>();
  let date = '';
  let subject = '';
  for (const line of out.split('\n')) {
    if (line.startsWith('@')) {
      const sep = line.indexOf('|');
      date = line.slice(1, sep);
      subject = line.slice(sep + 1);
      continue;
    }
    if (!date || !line.trim()) continue;
    const m = /^([ADMR])\d*\t(.+)$/.exec(line);
    if (!m) continue;
    const status = m[1];
    let file = m[2];
    if (status === 'R' || status === 'C') file = file.split('\t')[1] ?? file;
    if (status === 'D') {
      latest.delete(file);
      continue;
    }
    if (!latest.has(file)) latest.set(file, { added: status === 'A', date, subject });
  }

  const entries: (RecentUpdate & { date: string })[] = [];
  for (const [file, info] of latest) {
    const relPath = file.replace(/^docs\//, '').replace(/\.md$/, '');
    const basename = relPath.split('/').pop() ?? relPath;
    const title = basename.replace(/^\d+[-\s]*/, '');
    const category = allCategories
      .filter((c) => relPath === c.dir || relPath.startsWith(`${c.dir}/`))
      .sort((a, b) => b.dir.length - a.dir.length)[0];
    if (!category) continue;
    const rest = relPath.slice(category.dir.length).replace(/^\//, '');
    entries.push({
      type: info.added ? 'new' : 'modified',
      module: category.title,
      title,
      description: info.subject.replace(/^\w+(\(\w[^)]*\))?[：:]\s*/, ''),
      href: `/docs/${category.slug}/${rest}`,
      date: info.date,
    });
  }

  return entries
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(({ date: _date, ...u }) => u);
}
