import type { ReactNode } from 'react';
import {
  Info,
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  Flame,
  Pencil,
} from 'lucide-react';

interface StyleConfig {
  box: string;
  title: string;
  icon: ReactNode;
  label: string;
}

/** 各容器类型的样式与默认标题（静态类名，确保 Tailwind 能扫描生成） */
const CONFIG: Record<string, StyleConfig> = {
  tip: {
    box: 'border-green-500 bg-green-50',
    title: 'text-green-700',
    icon: <Lightbulb className="h-4 w-4 shrink-0" />,
    label: 'TIP',
  },
  warning: {
    box: 'border-yellow-500 bg-yellow-50',
    title: 'text-yellow-700',
    icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
    label: 'WARNING',
  },
  danger: {
    box: 'border-red-500 bg-red-50',
    title: 'text-red-700',
    icon: <AlertOctagon className="h-4 w-4 shrink-0" />,
    label: 'DANGER',
  },
  info: {
    box: 'border-blue-500 bg-blue-50',
    title: 'text-blue-700',
    icon: <Info className="h-4 w-4 shrink-0" />,
    label: 'INFO',
  },
  note: {
    box: 'border-gray-400 bg-gray-100',
    title: 'text-gray-700',
    icon: <Pencil className="h-4 w-4 shrink-0" />,
    label: 'NOTE',
  },
  important: {
    box: 'border-purple-500 bg-purple-50',
    title: 'text-purple-700',
    icon: <Flame className="h-4 w-4 shrink-0" />,
    label: 'IMPORTANT',
  },
  caution: {
    box: 'border-orange-500 bg-orange-50',
    title: 'text-orange-700',
    icon: <AlertCircle className="h-4 w-4 shrink-0" />,
    label: 'CAUTION',
  },
  details: {
    box: 'border-gray-300 bg-gray-50',
    title: 'text-gray-700',
    icon: <Info className="h-4 w-4 shrink-0" />,
    label: 'DETAILS',
  },
};

interface VpContainerProps {
  containerType?: string;
  containerTitle?: string;
  children?: ReactNode;
}

/** VitePress 自定义容器（::: tip / warning / danger / info / details 等） */
export function VpContainer({ containerType = 'tip', containerTitle, children }: VpContainerProps) {
  const cfg = CONFIG[containerType] || CONFIG.tip;
  const title = containerTitle || cfg.label;

  // details：可折叠
  if (containerType === 'details') {
    return (
      <details className={`my-4 rounded-md border-l-4 px-4 py-3 ${cfg.box}`}>
        <summary className={`flex cursor-pointer items-center gap-2 text-sm font-semibold ${cfg.title}`}>
          {cfg.icon}
          {title}
        </summary>
        <div className="vp-container-body mt-2">{children}</div>
      </details>
    );
  }

  return (
    <div className={`my-4 rounded-md border-l-4 px-4 py-3 ${cfg.box}`}>
      <div className={`mb-1 flex items-center gap-2 text-sm font-semibold ${cfg.title}`}>
        {cfg.icon}
        {title}
      </div>
      <div className="vp-container-body">{children}</div>
    </div>
  );
}
