import { Alert, Button, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import { ErrorState, LoadingState } from '../../../components/feedback/QueryState';
import type { Page } from '../api/adminApi';

export function AdminPage({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return <Space direction="vertical" size="large" style={{ width: '100%' }}><Space style={{ width: '100%', justifyContent: 'space-between' }}><Typography.Title level={2} style={{ margin: 0 }}>{title}</Typography.Title>{actions}</Space>{children}</Space>;
}

export function ServerTable<T extends { uuid?: string; code?: string }>({ page, loading, error, columns, onChange }: { page?: Page<T>; loading: boolean; error: unknown; columns: ColumnsType<T>; onChange?: (page: number) => void }) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="The server request failed. Try again." />;
  return <Table<T> rowKey={(record) => record.uuid ?? record.code ?? ''} columns={columns} dataSource={page?.items ?? []} pagination={{ current: page?.page, pageSize: page?.perPage, total: page?.total, onChange }} locale={{ emptyText: <Alert type="info" message="No records found." /> }} scroll={{ x: true }} />;
}

export const ReloadButton = ({ onClick }: { onClick: () => void }) => <Button onClick={onClick}>Refresh</Button>;
