import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminData } from '@/hooks/useAdminData';

interface DataTableProps {
  title: string;
  endpoint: 'users' | 'transactions' | 'wallets';
  enabled?: boolean;
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
  }>;
}

export const DataTable = ({ title, endpoint, columns, enabled = true }: DataTableProps) => {
  const { data, pagination, loading, error, loadData } = useAdminData(endpoint, enabled);
  const [currentPage, setCurrentPage] = useState(1);
  const rows = Array.isArray(data) ? data : [];

  useEffect(() => {
    if (pagination?.page) {
      setCurrentPage(pagination.page);
    }
  }, [pagination?.page]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    void loadData(page);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-destructive">{error}</p>
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <Card className="p-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">
            No records are available yet for this section.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="secondary">
          {pagination?.total || 0} total
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th key={col.key} className="text-left py-3 px-4 font-medium text-muted-foreground">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, index: number) => (
              <tr key={row.id || index} className="border-b hover:bg-muted/50">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= pagination.pages}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
