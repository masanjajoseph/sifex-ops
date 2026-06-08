const ENV = process.env.NEXT_PUBLIC_APP_ENV || "production";
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "2.1.0";

const envLabels: Record<string, { label: string; color: string }> = {
  production: { label: "Production", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  staging: { label: "Staging", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  development: { label: "Development", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
};

const envConfig = envLabels[ENV] ?? envLabels.production;

export function AuthFooter() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground/60">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-medium tracking-wide uppercase ${envConfig.color}`}>
            {envConfig.label}
          </span>
          <span>v{VERSION}</span>
        </div>
        <span>&copy; {new Date().getFullYear()} Sifex ERP</span>
      </div>
      <p className="text-[11px] text-muted-foreground/40 text-center">
        Enterprise air cargo operations platform. Support: ops@sifex.io
      </p>
    </div>
  );
}
