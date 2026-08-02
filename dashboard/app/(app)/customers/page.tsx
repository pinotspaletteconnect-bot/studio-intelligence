import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CustomersPage() {
  return <PlaceholderPage title="Customers" />
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This reporting area is planned and does not yet have a production data source.
        </CardContent>
      </Card>
    </div>
  )
}
