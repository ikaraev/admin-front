import type { Currency, CurrencyMetrics } from '../api/adminApi';
import { formatCount, formatMinor, formatPercent } from '../lib/metrics';
import { DataTable, type Column } from './AdminPage';

export function CurrencyMetricsTable({ rows, currencies, loading }: { rows: CurrencyMetrics[]; currencies: Map<string, Currency>; loading?: boolean }) {
  const money = (row: CurrencyMetrics, amount: number) => formatMinor(amount, row.currency, currencies.get(row.currency));
  const columns: Column<CurrencyMetrics>[] = [
    { key: 'currency', title: 'Currency', cellClassName: 'font-medium' },
    { key: 'bets_amount', title: 'Turnover', className: 'text-right tabular-nums', render: (row) => money(row, row.bets_amount) },
    { key: 'wins_amount', title: 'Wins', className: 'text-right tabular-nums', render: (row) => money(row, row.wins_amount) },
    { key: 'ggr', title: 'GGR', className: 'text-right tabular-nums', render: (row) => money(row, row.ggr) },
    { key: 'rtp', title: 'RTP', className: 'text-right tabular-nums', render: (row) => formatPercent(row.rtp) },
    { key: 'hold_percent', title: 'Hold', className: 'text-right tabular-nums', render: (row) => formatPercent(row.hold_percent) },
    { key: 'bets_count', title: 'Bets', className: 'text-right tabular-nums', render: (row) => formatCount(row.bets_count) },
    { key: 'players', title: 'Players', className: 'text-right tabular-nums', render: (row) => formatCount(row.players) },
  ];
  return <DataTable rows={rows} columns={columns} rowKey={(row) => row.currency} loading={loading} />;
}
