import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: DashboardPlaceholder,
});

function DashboardPlaceholder() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-8">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Engine Online</h2>
      <p className="text-slate-500 text-sm">Phase 1 Complete.</p>
    </div>
  );
}