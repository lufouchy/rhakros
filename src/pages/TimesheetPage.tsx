import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CalendarDays } from "lucide-react";
import { endOfDay, format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type TimeRecordType = "entry" | "lunch_out" | "lunch_in" | "exit";

interface TimeRecord {
  id: string;
  record_type: TimeRecordType;
  recorded_at: string;
}

const recordTypeLabel: Record<TimeRecordType, string> = {
  entry: "Entrada",
  lunch_out: "Saída Almoço",
  lunch_in: "Volta Almoço",
  exit: "Saída",
};

const TimesheetPage = () => {
  const { user, loading } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const dayRange = useMemo(() => {
    const start = startOfDay(date).toISOString();
    const end = endOfDay(date).toISOString();
    return { start, end };
  }, [date]);

  useEffect(() => {
    const run = async () => {
      if (!user?.id) return;
      setIsLoading(true);

      const { data, error } = await supabase
        .from("time_records")
        .select("id, record_type, recorded_at")
        .eq("user_id", user.id)
        .gte("recorded_at", dayRange.start)
        .lte("recorded_at", dayRange.end)
        .order("recorded_at", { ascending: true });

      if (!error && data) setRecords(data as TimeRecord[]);
      setIsLoading(false);
    };

    run();
  }, [user?.id, dayRange.start, dayRange.end]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Espelho do Ponto
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-[360px_1fr]">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Selecione um dia para ver as marcações.
              </p>
              <div className="rounded-lg border border-border bg-card p-3">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={ptBR}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-base font-semibold text-foreground">
                  {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h2>
                {isLoading && (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando
                  </span>
                )}
              </div>

              {records.length === 0 && !isLoading ? (
                <div className="rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  Nenhuma marcação encontrada para este dia.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Horário</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{recordTypeLabel[r.record_type]}</TableCell>
                          <TableCell className="tabular-nums">
                            {format(new Date(r.recorded_at), "HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TimesheetPage;
