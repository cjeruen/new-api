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
import type { ColumnDef } from '@tanstack/react-table'
import { CircleAlert, Music, Play } from 'lucide-react'
/* eslint-disable react-refresh/only-export-components */
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import { formatTimestampToDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { TASK_ACTIONS, TASK_STATUS } from '../../constants'
import { taskActionMapper, taskStatusMapper } from '../../lib/mappers'
import {
  resolveTaskActionIcon,
  resolveTaskActionLabel,
  resolveTaskActionPillClass,
  resolveTaskPlatformLabel,
  resolveTaskPlatformVariant,
  resolveTaskStatusIcon,
  resolveVideoPreviewUrl,
  taskPlatformPillClass,
} from '../../lib/task-logs-cells'
import type { TaskLog } from '../../types'
import {
  AudioPreviewDialog,
  type AudioClip,
} from '../dialogs/audio-preview-dialog'
import { FailReasonDialog } from '../dialogs/fail-reason-dialog'
import { VideoPreviewDialog } from '../dialogs/video-preview-dialog'
import { useUsageLogsContext } from '../usage-logs-provider'
import {
  createDurationColumn,
  createChannelColumn,
  createProgressColumn,
} from './column-helpers'

function parseTaskData(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function isVideoTaskAction(action: string): boolean {
  return (
    action === TASK_ACTIONS.GENERATE ||
    action === TASK_ACTIONS.TEXT_GENERATE ||
    action === TASK_ACTIONS.FIRST_TAIL_GENERATE ||
    action === TASK_ACTIONS.REFERENCE_GENERATE ||
    action === TASK_ACTIONS.REMIX_GENERATE
  )
}

function VideoPreviewCell({ videoUrl }: { videoUrl: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='size-8 rounded-full border border-emerald-200/50 bg-emerald-50/45 text-emerald-600 hover:bg-emerald-100/70 dark:border-emerald-900/45 dark:bg-emerald-950/25 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
        title={t('Click to preview video')}
        aria-label={t('Click to preview video')}
        onClick={() => setOpen(true)}
      >
        <Play className='size-4 fill-current' />
      </Button>
      <VideoPreviewDialog
        open={open}
        onOpenChange={setOpen}
        videoUrl={videoUrl}
      />
    </>
  )
}

function ErrorDetailCell({ failReason }: { failReason: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='size-8 rounded-full border border-rose-200/55 bg-rose-50/45 text-red-600 hover:bg-rose-100/70 dark:border-rose-900/45 dark:bg-rose-950/25 dark:text-red-400 dark:hover:bg-rose-950/40'
        title={t('Click to view full error message')}
        aria-label={t('Click to view full error message')}
        onClick={() => setOpen(true)}
      >
        <CircleAlert className='size-4' />
      </Button>
      <FailReasonDialog
        failReason={failReason}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

function AudioPreviewCell({ log }: { log: TaskLog }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const clips = useMemo(() => {
    const data = parseTaskData(log.data)
    return data.filter(
      (c) =>
        c && typeof c === 'object' && (c as Record<string, unknown>).audio_url
    )
  }, [log.data])

  if (clips.length === 0) return null

  return (
    <>
      <button
        type='button'
        className='group flex items-center gap-1 text-left text-xs'
        onClick={() => setOpen(true)}
      >
        <Music className='text-muted-foreground size-3' />
        <span className='text-foreground leading-snug group-hover:underline'>
          {t('Click to preview audio')}
        </span>
      </button>
      <AudioPreviewDialog
        open={open}
        onOpenChange={setOpen}
        clips={clips as AudioClip[]}
      />
    </>
  )
}

export function useTaskLogsColumns(isAdmin: boolean): ColumnDef<TaskLog>[] {
  const { t } = useTranslation()
  const columns: ColumnDef<TaskLog>[] = [
    {
      accessorKey: 'submit_time',
      header: t('Submit Time'),
      cell: ({ row }) => {
        const log = row.original
        const submitTime = row.getValue('submit_time') as number

        return (
          <div className='flex min-w-0 flex-col gap-0.5'>
            <span className='truncate font-mono text-xs tabular-nums'>
              {formatTimestampToDate(submitTime, 'seconds')}
            </span>
            {log.finish_time ? (
              <span className='text-muted-foreground/60 truncate font-mono text-[11px] tabular-nums'>
                {formatTimestampToDate(log.finish_time, 'seconds')}
              </span>
            ) : (
              <span className='text-muted-foreground/50 text-[11px]'>-</span>
            )}
          </div>
        )
      },
      size: 180,
    },
  ]

  if (isAdmin) {
    columns.push(createChannelColumn<TaskLog>({ headerLabel: t('Channel') }), {
      id: 'user',
      header: t('User'),
      accessorFn: (row) => row.username || row.user_id,
      cell: function UserCell({ row }) {
        const { sensitiveVisible, setSelectedUserId, setUserInfoDialogOpen } =
          useUsageLogsContext()
        const log = row.original
        const displayName = log.username || String(log.user_id || '?')

        return (
          <button
            type='button'
            className='flex items-center gap-1.5 text-left'
            onClick={(e) => {
              e.stopPropagation()
              setSelectedUserId(log.user_id)
              setUserInfoDialogOpen(true)
            }}
          >
            <Avatar className='ring-border/60 size-6 ring-1 max-sm:hidden'>
              <AvatarFallback
                className={cn(
                  'text-[11px] font-semibold',
                  !sensitiveVisible && 'bg-muted text-muted-foreground'
                )}
                style={
                  sensitiveVisible ? getUserAvatarStyle(displayName) : undefined
                }
              >
                {sensitiveVisible ? getUserAvatarFallback(displayName) : '•'}
              </AvatarFallback>
            </Avatar>
            <span className='text-muted-foreground truncate text-sm hover:underline'>
              {sensitiveVisible ? displayName : '••••'}
            </span>
          </button>
        )
      },
    })
  }

  columns.push(
    {
      accessorKey: 'platform',
      header: t('Platform'),
      cell: ({ row }) => {
        const platform = String(row.getValue('platform') ?? '').trim()
        if (!platform) {
          return <span className='text-muted-foreground/60 text-xs'>-</span>
        }
        const variant = resolveTaskPlatformVariant(platform)
        return (
          <StatusBadge
            label={resolveTaskPlatformLabel(platform, t)}
            variant={variant}
            size='sm'
            copyable={false}
            className={cn(
              '-ml-1.5 max-w-[150px] truncate rounded-full px-2.5',
              taskPlatformPillClass(variant)
            )}
          />
        )
      },
      size: 130,
    },
    {
      accessorKey: 'action',
      header: t('Type'),
      cell: ({ row }) => {
        const action = String(row.getValue('action') ?? '').trim()
        if (!action) {
          return <span className='text-muted-foreground/60 text-xs'>-</span>
        }
        const variant = taskActionMapper.getVariant(action)

        return (
          <StatusBadge
            label={resolveTaskActionLabel(action, t)}
            icon={resolveTaskActionIcon(action)}
            variant={variant}
            size='sm'
            copyable={false}
            className={cn(
              '-ml-1.5 max-w-[170px] truncate',
              resolveTaskActionPillClass(action)
            )}
          />
        )
      },
      size: 150,
    },
    {
      accessorKey: 'task_id',
      header: t('Task ID'),
      cell: ({ row }) => {
        const taskId = row.getValue('task_id') as string
        if (!taskId) {
          return <span className='text-muted-foreground/60 text-xs'>-</span>
        }
        return (
          <StatusBadge
            label={taskId}
            copyText={taskId}
            variant='neutral'
            size='sm'
            className='border-border/60 bg-muted/30 !text-foreground max-w-[220px] truncate rounded-md border px-2 py-0.5 font-mono text-xs'
          />
        )
      },
      size: 220,
      meta: { mobileTitle: true },
    },
    createDurationColumn<TaskLog>({
      submitTimeKey: 'submit_time',
      finishTimeKey: 'finish_time',
      unit: 'seconds',
      headerLabel: t('Duration'),
      warningThresholdSec: 300,
    }),
    {
      accessorKey: 'status',
      header: t('Status'),
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const statusLabel = taskStatusMapper.getLabel(
          status,
          status || 'Submitting'
        )
        const variant = taskStatusMapper.getVariant(status)
        const statusPillClass =
          variant === 'green'
            ? 'rounded-full border border-emerald-200/40 bg-emerald-50/35 px-2.5 !text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/15 dark:!text-emerald-400'
            : variant === 'red' || variant === 'danger'
              ? 'rounded-full border border-rose-200/50 bg-rose-50/35 px-2.5 !text-red-600 dark:border-rose-900/40 dark:bg-rose-950/15 dark:!text-red-400'
              : variant === 'blue'
                ? 'rounded-full border border-sky-200/40 bg-sky-50/35 px-2.5 !text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/15 dark:!text-sky-400'
                : variant === 'yellow' || variant === 'orange'
                  ? 'rounded-full border border-amber-200/45 bg-amber-50/35 px-2.5 !text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/15 dark:!text-amber-400'
                  : 'rounded-full border border-border/60 bg-muted/30 px-2.5'

        return (
          <StatusBadge
            label={t(statusLabel)}
            icon={resolveTaskStatusIcon(status)}
            variant={variant}
            size='sm'
            copyable={false}
            className={cn('-ml-1.5 max-w-[140px] truncate', statusPillClass)}
          />
        )
      },
    },
    createProgressColumn<TaskLog>({ headerLabel: t('Progress') }),
    {
      accessorKey: 'fail_reason',
      header: t('Details'),
      cell: function DetailsCell({ row }) {
        const log = row.original
        const failReason = row.getValue('fail_reason') as string
        const status = log.status

        const isSunoSuccess =
          log.platform === 'suno' && status === TASK_STATUS.SUCCESS
        if (isSunoSuccess) {
          const data = parseTaskData(log.data)
          if (
            data.some(
              (c) =>
                c &&
                typeof c === 'object' &&
                (c as Record<string, unknown>).audio_url
            )
          ) {
            return <AudioPreviewCell log={log} />
          }
        }

        const isVideoTask = isVideoTaskAction(log.action)
        const isSuccess = status === TASK_STATUS.SUCCESS
        const isFailure = status === TASK_STATUS.FAILURE

        if (isSuccess && isVideoTask) {
          const videoUrl = resolveVideoPreviewUrl(log)
          if (videoUrl) {
            return <VideoPreviewCell videoUrl={videoUrl} />
          }
        }

        if (failReason && (isFailure || !isSuccess)) {
          return <ErrorDetailCell failReason={failReason} />
        }

        if (!failReason) {
          return <span className='text-muted-foreground/60 text-xs'>-</span>
        }

        return <ErrorDetailCell failReason={failReason} />
      },
      size: 200,
      maxSize: 220,
    }
  )

  return columns
}
