import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { YesNoAggregation } from '@shared/schema';

interface YesNoChartProps {
  data: YesNoAggregation;
}

export function YesNoChart({ data }: YesNoChartProps) {
  const chartData = [
    { name: 'Yes', value: data.yes },
    { name: 'No', value: data.no }
  ];

  const total = data.yes + data.no;
  const colors = {
    Yes: 'hsl(var(--success))',
    No: 'hsl(var(--destructive))'
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="name"
            className="text-sm"
          />
          <YAxis className="text-sm" />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0];
                const percentage = total > 0 ? ((data.value as number / total) * 100).toFixed(1) : 0;
                return (
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                    <p className="font-medium">{data.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Count: {data.value}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {percentage}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[entry.name as keyof typeof colors]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
