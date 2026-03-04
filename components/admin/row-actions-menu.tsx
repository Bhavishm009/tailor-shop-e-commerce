"use client"

import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type RowActionItem = {
  label: string
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
  separatorBefore?: boolean
}

type RowActionsMenuProps = {
  items: RowActionItem[]
  triggerLabel?: string
  align?: "start" | "center" | "end"
}

export function RowActionsMenu({ items, triggerLabel = "Actions", align = "end" }: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span>{triggerLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`}>
            {item.separatorBefore ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              disabled={item.disabled}
              className={item.destructive ? "text-destructive focus:text-destructive" : undefined}
              onClick={(event) => {
                event.stopPropagation()
                item.onSelect()
              }}
            >
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
