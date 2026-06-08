export default function DevUIPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 space-y-8">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Sifex ERP — Design System</h1>
        <p className="text-sm text-muted-foreground">Brand identity: Red · White · Black · Blue accent · Slate neutrals</p>
      </div>

      {/* Brand Color Swatches */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Brand Palette</h2>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-lg bg-primary border border-border" />
            <span className="text-[10px] text-muted-foreground">Primary</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-lg bg-primary/80 border border-border" />
            <span className="text-[10px] text-muted-foreground">80%</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-lg bg-primary/60 border border-border" />
            <span className="text-[10px] text-muted-foreground">60%</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-lg bg-primary/20 border border-border" />
            <span className="text-[10px] text-muted-foreground">20%</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-lg bg-accent border border-border" />
            <span className="text-[10px] text-muted-foreground">Accent</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-lg bg-destructive border border-border" />
            <span className="text-[10px] text-muted-foreground">Destructive</span>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-border/50 bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Typography</h3>
          <div className="space-y-3">
            <p className="text-4xl font-bold">Display</p>
            <p className="text-2xl font-bold">Heading 2</p>
            <p className="text-xl font-semibold">Heading 3</p>
            <p className="text-lg font-medium">Heading 4</p>
            <p className="text-base">Base body text for content</p>
            <p className="text-sm text-muted-foreground">Small muted text for secondary info</p>
            <p className="text-xs text-muted-foreground/60">Extra small caption text</p>
            <p className="text-sm font-mono text-muted-foreground">Monospace: STK-2024-03921</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="p-6 rounded-xl border border-border/50 bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Buttons</h3>
          <div className="space-y-3">
            <button className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 active:bg-primary/80 transition-all">
              Primary Action
            </button>
            <button className="w-full h-10 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 active:bg-accent/80 transition-all">
              Accent Action
            </button>
            <button className="w-full h-10 rounded-lg border border-border bg-background text-foreground font-medium text-sm hover:bg-muted/50 active:bg-muted transition-all">
              Secondary Action
            </button>
            <button className="w-full h-10 rounded-lg bg-destructive text-destructive-foreground font-medium text-sm hover:bg-destructive/90 active:bg-destructive/80 transition-all">
              Destructive Action
            </button>
            <button className="w-full h-10 rounded-lg border border-border text-foreground font-medium text-sm opacity-50 cursor-not-allowed">
              Disabled Action
            </button>
          </div>
        </div>
      </section>

      {/* Cards & Inputs */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-border/50 bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Form Elements</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input type="email" placeholder="employee@company.com"
                className="w-full h-10 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <input type="password" placeholder="••••••••"
                className="w-full h-10 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border accent-primary" />
              <label className="text-sm text-foreground/70">Remember session</label>
            </div>
            <select className="w-full h-10 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option>Select option</option>
              <option>Export Operations</option>
              <option>Import Clearance</option>
            </select>
          </div>
        </div>

        {/* Cards */}
        <div className="p-6 rounded-xl border border-border/50 bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Cards</h3>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <p className="font-medium text-sm">Standard Card</p>
              <p className="text-xs text-muted-foreground mt-1">With default card background</p>
            </div>
            <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
              <p className="font-medium text-sm">Muted Card</p>
              <p className="text-xs text-muted-foreground mt-1">Used for secondary surfaces</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-medium text-sm text-primary">Primary Highlight Card</p>
              <p className="text-xs text-muted-foreground mt-1">Used for important info panels</p>
            </div>
          </div>
        </div>
      </section>

      {/* Badges & Status */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-border/50 bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Status Badges</h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Active</span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">In Transit</span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Customs Hold</span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Exception</span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">Pending</span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Documentation</span>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border/50 bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Alerts</h3>
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">Error Alert</p>
              <p className="text-xs text-destructive/70">Critical system notification</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/30">
              <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">Warning Alert</p>
              <p className="text-xs text-amber-700 dark:text-amber-400/70">Operational notification</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/30">
              <p className="text-sm text-blue-800 dark:text-blue-400 font-medium">Info Alert</p>
              <p className="text-xs text-blue-700 dark:text-blue-400/70">Informational message</p>
            </div>
          </div>
        </div>
      </section>

      {/* Shadows */}
      <section className="p-6 rounded-xl border border-border/50 bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Elevation & Shadows</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <div className="h-16 rounded-lg bg-card border border-border shadow-sm" />
            <span className="text-xs text-muted-foreground">shadow-sm</span>
          </div>
          <div className="space-y-1.5">
            <div className="h-16 rounded-lg bg-card border border-border shadow-md" />
            <span className="text-xs text-muted-foreground">shadow-md</span>
          </div>
          <div className="space-y-1.5">
            <div className="h-16 rounded-lg bg-card border border-border shadow-lg" />
            <span className="text-xs text-muted-foreground">shadow-lg</span>
          </div>
          <div className="space-y-1.5">
            <div className="h-16 rounded-lg bg-card border border-border shadow-xl" />
            <span className="text-xs text-muted-foreground">shadow-xl</span>
          </div>
        </div>
      </section>

      {/* Responsive Grid */}
      <section className="p-6 rounded-xl border border-border/50 bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Responsive Layout</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {["1", "2", "3", "4"].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-xs text-primary font-medium">Col {i}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Dark Mode Note */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-sm text-primary font-medium">Design System Verified</p>
        <p className="text-xs text-muted-foreground mt-1">
          Brand: Red primary · Gray/Graphite dark mode · Blue accent · Enterprise neutrals.
          Toggle system dark mode to verify .dark variables.
        </p>
      </div>
    </div>
  );
}
