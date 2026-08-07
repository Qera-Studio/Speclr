import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Package } from 'lucide-react';
import { SCHEDULES } from '@/lib/domain/contract/schedules';
import type { ContractService } from '@/lib/domain/contract/service';

/**
 * The services library, as cards grouped by Schedule.
 *
 * Grouped rather than listed flat because the grouping *is* the information: a
 * Service belongs to exactly one Schedule, and which one decides how the work
 * is paid for, approved and owned. The contract builder deliberately does the
 * opposite — there the list is flat and searchable with the Schedule as a quiet
 * label, because at build time you pick work, not legal frames
 * (contract-system.md §10).
 *
 * Read-only. Editing a Service is not in this milestone: the twenty-two are
 * seeded from the specs and there is nothing yet to correct.
 */
export default function ServiceCards({ services }: { services: ContractService[] }) {
  if (services.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Package />
          </EmptyMedia>
          <EmptyTitle>No services yet</EmptyTitle>
          <EmptyDescription>
            Run the contract seed to load the services library.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {SCHEDULES.map((schedule) => {
        const mine = services.filter((s) => s.scheduleKey === schedule.key);
        if (mine.length === 0) return null;

        return (
          <section key={schedule.key} className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-semibold">{schedule.name}</h3>
              <p className="text-xs text-muted-foreground">
                {mine.length} {mine.length === 1 ? 'service' : 'services'}
              </p>
            </div>

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mine.map((service) => (
                <li key={service.code}>
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm">{service.name}</CardTitle>
                        <Badge variant="outline" className="shrink-0 tabular-nums">
                          {service.code}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-3">
                        {service.overview[0]}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-3 gap-2 text-xs">
                        {[
                          ['Included', service.included.length],
                          ['Excluded', service.exclusionIds.length],
                          ['Client inputs', service.clientInputIds.length],
                        ].map(([label, count]) => (
                          <div key={label}>
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd className="font-medium tabular-nums">{count}</dd>
                          </div>
                        ))}
                      </dl>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
