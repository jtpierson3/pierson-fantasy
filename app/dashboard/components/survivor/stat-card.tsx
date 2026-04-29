function StatCard({title, value, subtitle, trend}: {
    title: string;
    value: string;
    subtitle?: string;
    trend?: string;
}) {
    return (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{value}</h3>
                {trend && <span className="text-xs font-medium text-green-600">{trend}</span>}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
    );
}