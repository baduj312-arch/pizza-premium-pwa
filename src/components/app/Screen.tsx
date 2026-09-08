import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { BottomNav } from "@/components/app/BottomNav";
import { cn } from "@/lib/utils";

export function Screen({
  children,
  nav = true,
  className,
}: {
  children: ReactNode;
  nav?: boolean;
  className?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className={cn("mx-auto max-w-md px-5 pb-32 pt-6", className)}>{children}</main>
      {nav && <BottomNav />}
    </div>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start gap-3">
      {back && (
        <Link
          to={back}
          className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-card text-foreground"
          aria-label="Go back"
        >
          <ChevronLeft className="size-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="grid size-16 place-items-center rounded-3xl bg-card text-primary">{icon}</div>
      <h2 className="mt-5 font-display text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
