import { clsx } from 'clsx'
import type { TunnelStatus } from '../api/types'

const statusConfig: Record<TunnelStatus, { label: string; classes: string; dot: string }> = {
  healthy:  { label: 'Healthy',  classes: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',   dot: 'bg-green-500' },
  degraded: { label: 'Degraded', classes: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500 animate-pulse' },
  inactive: { label: 'Inactive', classes: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',           dot: 'bg-gray-400' },
  down:     { label: 'Down',     classes: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',             dot: 'bg-red-500 animate-pulse' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = statusConfig[status as TunnelStatus] ?? {
    label: status,
    classes: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400',
  }
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
      cfg.classes,
      className,
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

