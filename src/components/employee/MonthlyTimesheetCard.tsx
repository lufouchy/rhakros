import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type TimeRecordType = 'entry' | 'lunch_out' | 'lunch_in' | 'exit';

interface TimeRecord {
  id: string;
  record_type: TimeRecordType;
  recorded_at: string;
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const MonthlyTimesheetCard = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!user?.id) return;
      setIsLoading(true);

      const { data, error } = await supabase
        .from('time_records')
        .select('id, record_type, recorded_at')
        .eq('user_id', user.id)
        .gte('recorded_at', monthStart.toISOString())
        .lte('recorded_at', monthEnd.toISOString())
        .order('recorded_at', { ascending: true });

      if (!error && data) setRecords(data as TimeRecord[]);
      setIsLoading(false);
    };

    fetchRecords();
  }, [user?.id]);

  const days = useMemo(() => {
    const allDays = eachDayOfInterval({ start: monthStart, end: now > monthEnd ? monthEnd : now });

    return allDays.map(day => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dayRecords = records.filter(r => {
        const d = new Date(r.recorded_at);
        return d >= dayStart && d <= dayEnd;
      });

      const entry = dayRecords.find(r => r.record_type === 'entry');
      const lunchOut = dayRecords.find(r => r.record_type === 'lunch_out');
      const lunchIn = dayRecords.find(r => r.record_type === 'lunch_in');
      const exit = dayRecords.find(r => r.record_type === 'exit');

      let workedMinutes = 0;
      if (entry && lunchOut) {
        workedMinutes += differenceInMinutes(new Date(lunchOut.recorded_at), new Date(entry.recorded_at));
      }
      if (lunchIn && exit) {
        workedMinutes += differenceInMinutes(new Date(exit.recorded_at), new Date(lunchIn.recorded_at));
      }

      return {
        date: day,
        isWeekendDay: isWeekend(day),
        entry: entry ? format(new Date(entry.recorded_at), 'HH:mm') : null,
        lunchOut: lunchOut ? format(new Date(lunchOut.recorded_at), 'HH:mm') : null,
        lunchIn: lunchIn ? format(new Date(lunchIn.recorded_at), 'HH:mm') : null,
        exit: exit ? format(new Date(exit.recorded_at), 'HH:mm') : null,
        workedMinutes,
        hasRecords: dayRecords.length > 0,
      };
    });
  }, [records, monthStart, monthEnd]);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 h-8">
                <TableHead className="w-[90px] py-1 text-xs">Dia</TableHead>
                <TableHead className="py-1 text-xs">Entrada</TableHead>
                <TableHead className="py-1 text-xs">Saída Alm.</TableHead>
                <TableHead className="py-1 text-xs">Volta Alm.</TableHead>
                <TableHead className="py-1 text-xs">Saída</TableHead>
                <TableHead className="text-right py-1 text-xs">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map(day => (
                <TableRow
                  key={day.date.toISOString()}
                  className={cn(
                    day.isWeekendDay && 'bg-muted/30 text-muted-foreground'
                  )}
                >
                  <TableCell className="font-medium whitespace-nowrap py-1 text-xs">
                    <span className="capitalize">
                      {format(day.date, 'EEE', { locale: ptBR })}
                    </span>
                    {' '}
                    {format(day.date, 'dd/MM')}
                  </TableCell>
                  <TableCell className="tabular-nums py-1 text-xs">{day.entry || '-'}</TableCell>
                  <TableCell className="tabular-nums py-1 text-xs">{day.lunchOut || '-'}</TableCell>
                  <TableCell className="tabular-nums py-1 text-xs">{day.lunchIn || '-'}</TableCell>
                  <TableCell className="tabular-nums py-1 text-xs">{day.exit || '-'}</TableCell>
                  <TableCell className="tabular-nums text-right font-medium py-1 text-xs">
                    {day.workedMinutes > 0 ? formatMinutes(day.workedMinutes) : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {days.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum registro encontrado neste mês.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyTimesheetCard;
