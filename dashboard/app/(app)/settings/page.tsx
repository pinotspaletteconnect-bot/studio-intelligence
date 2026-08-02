import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Settings will be added when authenticated organization administration is available.
        </CardContent>
      </Card>
    </div>
  )
}
