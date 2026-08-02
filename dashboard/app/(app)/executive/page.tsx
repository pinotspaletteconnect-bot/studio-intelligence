import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ExecutivePage() {
  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader><CardTitle>Executive</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This reporting area is planned and does not yet have a production data source.
        </CardContent>
      </Card>
    </div>
  )
}
