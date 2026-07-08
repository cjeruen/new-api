/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import {
  CheckCircle,
  Clock,
  FileText,
  HelpCircle,
  ImageIcon,
  Images,
  Layers,
  List,
  Loader,
  Music,
  Pause,
  Play,
  Shuffle,
  Type,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

import type { StatusVariant } from '@/components/status-badge'
import { CHANNEL_TYPES } from '@/features/channels/constants'

import { TASK_ACTIONS, TASK_STATUS } from '../constants'
import type { TaskLog } from '../types'
import { taskActionMapper, taskPlatformMapper } from './mappers'

/** Channel-type colors aligned with classic task logs (CHANNEL_OPTIONS). */
const TASK_PLATFORM_VARIANTS: Record<string, StatusVariant> = {
  suno: 'green',
  '36': 'purple',
  '17': 'orange',
  '24': 'orange',
  '41': 'blue',
  '48': 'blue',
  '50': 'green',
  '51': 'blue',
  '52': 'purple',
  '54': 'blue',
  '55': 'green',
  kling: 'blue',
  runway: 'violet',
  luma: 'orange',
  viggle: 'pink',
}

const TASK_PLATFORM_PILL_CLASS: Partial<Record<StatusVariant, string>> = {
  green:
    'border border-emerald-200/40 bg-emerald-50/40 !text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:!text-emerald-400',
  blue: 'border border-sky-200/40 bg-sky-50/40 !text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:!text-sky-400',
  purple:
    'border border-violet-200/40 bg-violet-50/40 !text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/20 dark:!text-violet-400',
  orange:
    'border border-amber-200/45 bg-amber-50/40 !text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:!text-amber-400',
  pink: 'border border-pink-200/40 bg-pink-50/40 !text-pink-700 dark:border-pink-900/40 dark:bg-pink-950/20 dark:!text-pink-400',
  violet:
    'border border-violet-200/40 bg-violet-50/40 !text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/20 dark:!text-violet-400',
  neutral:
    'border-border/60 bg-muted/35 !text-foreground',
}

const TASK_ACTION_ICONS: Record<string, LucideIcon> = {
  [TASK_ACTIONS.MUSIC]: Music,
  [TASK_ACTIONS.LYRICS]: FileText,
  [TASK_ACTIONS.GENERATE]: ImageIcon,
  [TASK_ACTIONS.TEXT_GENERATE]: Type,
  [TASK_ACTIONS.FIRST_TAIL_GENERATE]: Images,
  [TASK_ACTIONS.REFERENCE_GENERATE]: Layers,
  [TASK_ACTIONS.REMIX_GENERATE]: Shuffle,
}

const TASK_ACTION_PILL_CLASS: Record<string, string> = {
  [TASK_ACTIONS.MUSIC]:
    'rounded-full border border-border/60 bg-muted/35 px-2.5 !text-muted-foreground',
  [TASK_ACTIONS.LYRICS]:
    'rounded-full border border-pink-200/40 bg-pink-50/35 px-2.5 !text-pink-700 dark:border-pink-900/40 dark:bg-pink-950/15 dark:!text-pink-400',
  [TASK_ACTIONS.TEXT_GENERATE]:
    'rounded-full border border-violet-200/40 bg-violet-50/35 px-2.5 !text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/15 dark:!text-violet-400',
  [TASK_ACTIONS.GENERATE]:
    'rounded-full border border-amber-200/45 bg-amber-50/35 px-2.5 !text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/15 dark:!text-amber-400',
  [TASK_ACTIONS.FIRST_TAIL_GENERATE]:
    'rounded-full border border-teal-200/40 bg-teal-50/35 px-2.5 !text-teal-700 dark:border-teal-900/40 dark:bg-teal-950/15 dark:!text-teal-400',
  [TASK_ACTIONS.REFERENCE_GENERATE]:
    'rounded-full border border-purple-200/40 bg-purple-50/35 px-2.5 !text-purple-700 dark:border-purple-900/40 dark:bg-purple-950/15 dark:!text-purple-400',
  [TASK_ACTIONS.REMIX_GENERATE]:
    'rounded-full border border-cyan-200/40 bg-cyan-50/35 px-2.5 !text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/15 dark:!text-cyan-400',
}

const TASK_STATUS_ICONS: Record<string, LucideIcon> = {
  [TASK_STATUS.SUCCESS]: CheckCircle,
  [TASK_STATUS.NOT_START]: Pause,
  [TASK_STATUS.SUBMITTED]: Clock,
  [TASK_STATUS.IN_PROGRESS]: Play,
  [TASK_STATUS.FAILURE]: XCircle,
  [TASK_STATUS.QUEUED]: List,
  [TASK_STATUS.UNKNOWN]: HelpCircle,
  '': Loader,
}

export function resolveTaskPlatformLabel(
  platform: string,
  t: (key: string) => string
): string {
  const normalized = platform.trim()
  if (!normalized) return ''

  const channelType = Number(normalized)
  if (!Number.isNaN(channelType)) {
    const channelLabel =
      CHANNEL_TYPES[channelType as keyof typeof CHANNEL_TYPES]
    if (channelLabel) {
      return t(channelLabel)
    }
  }

  return taskPlatformMapper.getLabel(normalized, normalized)
}

export function resolveTaskPlatformVariant(platform: string): StatusVariant {
  const normalized = platform.trim().toLowerCase()
  return (
    TASK_PLATFORM_VARIANTS[normalized] ??
    taskPlatformMapper.getVariant(platform)
  )
}

export function taskPlatformPillClass(variant: StatusVariant): string {
  return TASK_PLATFORM_PILL_CLASS[variant] ?? TASK_PLATFORM_PILL_CLASS.neutral!
}

export function resolveTaskActionIcon(action: string): LucideIcon {
  return TASK_ACTION_ICONS[action] ?? HelpCircle
}

export function resolveTaskActionPillClass(action: string): string {
  return (
    TASK_ACTION_PILL_CLASS[action] ??
    'rounded-full border border-sky-200/40 bg-sky-50/35 px-2.5 !text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/15 dark:!text-sky-400'
  )
}

function isVideoProxyContentPath(pathname: string): boolean {
  return pathname.includes('/v1/videos/') && pathname.endsWith('/content')
}

export function isAuthenticatedVideoProxyUrl(url: string): boolean {
  const pathname = url.startsWith('http')
    ? (() => {
        try {
          return new URL(url).pathname
        } catch {
          return url
        }
      })()
    : url.split('?')[0] ?? url

  return isVideoProxyContentPath(pathname)
}

export function resolveVideoPreviewUrl(
  log: Pick<TaskLog, 'task_id' | 'result_url' | 'fail_reason'>
): string | null {
  const resultUrl = log.result_url?.trim()
  if (resultUrl) {
    if (/^https?:\/\//i.test(resultUrl)) {
      try {
        const parsed = new URL(resultUrl)
        if (isVideoProxyContentPath(parsed.pathname)) {
          return `${parsed.pathname}${parsed.search}`
        }
      } catch {
        // fall through to direct URL
      }
      return resultUrl
    }

    if (isVideoProxyContentPath(resultUrl.split('?')[0] ?? resultUrl)) {
      return resultUrl
    }
  }

  const legacyUrl = log.fail_reason?.trim()
  if (legacyUrl && /^https?:\/\//i.test(legacyUrl)) {
    return legacyUrl
  }

  const taskId = log.task_id?.trim()
  if (taskId) {
    return `/v1/videos/${taskId}/content`
  }

  return null
}

export function resolveTaskStatusIcon(status: string): LucideIcon {
  if (!status) {
    return TASK_STATUS_ICONS['']
  }
  return TASK_STATUS_ICONS[status] ?? HelpCircle
}

export function resolveTaskActionLabel(
  action: string,
  t: (key: string) => string
): string {
  return t(taskActionMapper.getLabel(action, action))
}