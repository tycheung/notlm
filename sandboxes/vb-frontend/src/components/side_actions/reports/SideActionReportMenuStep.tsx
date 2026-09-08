import Button from '../../common/Button';
import type { ReportDef, SideActionReportKind } from './reportMenuDefs';

interface SideActionReportMenuStepProps {
  reports: ReportDef[];
  busy: boolean;
  onPick: (kind: SideActionReportKind) => void;
}

export default function SideActionReportMenuStep({
  reports,
  busy,
  onPick,
}: SideActionReportMenuStepProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        Print-ready layouts for the desk, walls, and shareable PDFs. Preview opens in-app — then
        Print → Save as PDF. Ink-light; readable in color or black &amp; white.
      </p>
      <ul className="space-y-2">
        {reports.map((report) => (
          <li
            key={report.id}
            className="rounded border border-border bg-surface-light px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <div>
              <p className="text-sm font-semibold text-text">{report.label}</p>
              <p className="text-xs text-text-muted mt-1">{report.description}</p>
              {!report.ready && (
                <p className="text-xs text-text-dim mt-1 uppercase tracking-wide">
                  Template coming next
                </p>
              )}
            </div>
            <Button
              variant={report.ready ? 'primary' : 'lightbackground'}
              size="small"
              disabled={!report.ready || busy}
              onClick={() => onPick(report.id)}
            >
              {report.actionLabel}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
