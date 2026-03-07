import * as React from 'react'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

type TextareaProps = React.ComponentProps<'textarea'> & {
  label?: string
  hideLabel?: boolean
}

function normalizeLabelText(value: string) {
  const text = value.trim()
  if (!text) return ''
  return text.replace(/\s*\(.*?\)\s*$/, '').trim()
}

function Textarea({ className, id, label, hideLabel = false, placeholder, ...props }: TextareaProps) {
  const autoLabel = !hideLabel ? normalizeLabelText(label || (typeof placeholder === 'string' ? placeholder : '')) : ''
  const generatedId = React.useId()
  const resolvedId = id || (autoLabel ? `textarea-${generatedId}` : undefined)

  return (
    <div className="relative">
   
      <textarea
        id={resolvedId}
        data-slot="textarea"
        aria-label={props['aria-label'] || autoLabel || undefined}
        placeholder={placeholder}
        className={cn(
          'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        {...props}
      />
    </div>
  )
}

export { Textarea }
