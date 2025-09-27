import { Sidebar } from "@/components/ui/sidebar";
import { PromptTemplateManager } from "@/components/prompt-template-manager";

export default function Templates() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Prompt Templates</h1>
            <p className="text-sm text-muted-foreground">
              Manage AI prompt templates for consistent recruitment workflows
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <PromptTemplateManager />
        </main>
      </div>
    </div>
  );
}
