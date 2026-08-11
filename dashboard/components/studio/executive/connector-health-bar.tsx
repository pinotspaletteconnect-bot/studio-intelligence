import Link from "next/link"

import type { ConnectorHealthItem, ConnectorHealthState } from "@/lib/services/connector-health"
import { cn } from "@/lib/utils"

const stateStyles: Record<ConnectorHealthState, string> = {
  connected: "bg-emerald-500 ring-emerald-500/20",
  attention: "bg-amber-500 ring-amber-500/20",
  not_connected: "bg-slate-400 ring-slate-400/20",
}

export function ConnectorHealthBar({ connectors }: { connectors: ConnectorHealthItem[] }) {
  return <div className="flex min-h-9 items-center gap-2 overflow-x-auto rounded-lg border bg-card px-3 py-1.5" aria-label="Connector status">
    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Connections</span>
    <span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
    {connectors.map((connector) => <Link key={connector.key} href={connector.settingsHref} title={`${connector.name}: ${connector.label}. Open settings.`} className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className={cn("size-2 rounded-full ring-4", stateStyles[connector.state])} aria-hidden="true" />
      <span>{connector.name}</span><span className="sr-only">: {connector.label}</span>
    </Link>)}
  </div>
}
