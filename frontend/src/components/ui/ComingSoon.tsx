import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";

// Placeholder for pages that are not built yet
export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <main className="page">
      <PageHeader title={title} />
      <Card className="mt-6">
        <p className="py-10 text-center text-muted">{description}</p>
      </Card>
    </main>
  );
}
