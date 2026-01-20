import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CalendarDays, AlertTriangle, Clock } from "lucide-react";
import { endOfDay, format, startOfDay, isWeekend, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

const EXPECTED_SEQUENCE: TimeRecordType[] = ["entry", "lunch_out", "lunch_in", "exit"];

// Standard work hours (8h) + 1h lunch = 9h total span, but 8h worked
const STANDARD_WORK_MINUTES = 8 * 60; // 480 minutes
const OVERTIME_THRESHOLD_MINUTES = 2 * 60; // 2 hours

interface DayAnalysis {
  isWeekendDay: boolean;
  missingRecords: TimeRecordType[];
  workedMinutes: number;
  overtimeMinutes: number;
  hasExcessiveOvertime: boolean;
}

function analyzeDayRecords(date: Date, records: TimeRecord[]): DayAnalysis {
  const isWeekendDay = isWeekend(date);

  // Check missing records
  const recordTypes = records.map((r) => r.record_type);
  const missingRecords = EXPECTED_SEQUENCE.filter((type) => !recordTypes.includes(type));

  // Calculate worked time
  let workedMinutes = 0;

  const entry = records.find((r) => r.record_type === "entry");
  const lunchOut = records.find((r) => r.record_type === "lunch_out");
  const lunchIn = records.find((r) => r.record_type === "lunch_in");
  const exit = records.find((r) => r.record_type === "exit");

  if (entry && lunchOut) {
    workedMinutes += differenceInMinutes(new Date(lunchOut.recorded_at), new Date(entry.recorded_at));
  }
  if (lunchIn && exit) {
    workedMinutes += differenceInMinutes(new Date(exit.recorded_at), new Date(lunchIn.recorded_at));
  }

  const overtimeMinutes = Math.max(0, workedMinutes - STANDARD_WORK_MINUTES);
  const hasExcessiveOvertime = overtimeMinutes > OVERTIME_THRESHOLD_MINUTES;

  return {
    isWeekendDay,
    missingRecords,
    workedMinutes,
    overtimeMinutes,
    hasExcessiveOvertime,
  };
}

function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m > 0 ? ` ${m}min` : ""}`;
}

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

  const analysis = useMemo(() => analyzeDayRecords(date, records), [date, records]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const showMissingAlert = !isLoading && records.length > 0 && analysis.missingRecords.length > 0;
  const showOvertimeAlert = !isLoading && analysis.hasExcessiveOvertime;

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
                  modifiers={{ weekend: (d) => isWeekend(d) }}
                  modifiersClassNames={{
                    weekend: "bg-muted/70 text-muted-foreground",
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              {/* Day header with badges */}
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  className={cn(
                    "text-base font-semibold",
                    analysis.isWeekendDay ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h2>
                {analysis.isWeekendDay && (
                  <Badge variant="secondary" className="text-xs">
                    Final de semana
                  </Badge>
                )}
                {isLoading && (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando
                  </span>
                )}
              </div>

              {/* Alerts */}
              {showMissingAlert && (
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Marcação incompleta</AlertTitle>
                  <AlertDescription>
                    Faltam registros de: {analysis.missingRecords.map((t) => recordTypeLabel[t]).join(", ")}.
                  </AlertDescription>
                </Alert>
              )}

              {showOvertimeAlert && (
                <Alert className="border-warning/50 bg-warning/10">
                  <Clock className="h-4 w-4 text-warning" />
                  <AlertTitle className="text-warning">Hora extra excessiva</AlertTitle>
                  <AlertDescription>
                    Você trabalhou {formatMinutesToHours(analysis.workedMinutes)} neste dia, com{" "}
                    <strong>{formatMinutesToHours(analysis.overtimeMinutes)}</strong> de hora extra (acima de 2h).
                  </AlertDescription>
                </Alert>
              )}

              {/* Records table */}
              {records.length === 0 && !isLoading ? (
                <div
                  className={cn(
                    "rounded-lg border p-6 text-center text-sm",
                    analysis.isWeekendDay
                      ? "bg-muted/50 border-muted text-muted-foreground"
                      : "bg-muted/30 border-border text-muted-foreground"
                  )}
                >
                  {analysis.isWeekendDay
                    ? "Final de semana — sem marcações esperadas."
                    : "Nenhuma marcação encontrada para este dia."}
                </div>
              ) : (
                <div
                  className={cn(
                    "rounded-lg border overflow-hidden",
                    analysis.isWeekendDay && "border-muted bg-muted/20"
                  )}
                >
                  <Table>
                    <TableHeader>
                      <TableRow className={cn(analysis.isWeekendDay && "bg-muted/40")}>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Horário</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => (
                        <TableRow key={r.id} className={cn(analysis.isWeekendDay && "bg-muted/20")}>
                          <TableCell className="font-medium">{recordTypeLabel[r.record_type]}</TableCell>
                          <TableCell className="tabular-nums">
                            {format(new Date(r.recorded_at), "HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Summary row */}
                  {records.length > 0 && (
                    <div className="border-t border-border bg-muted/30 px-4 py-3 flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Trabalhado: </span>
                        <span className="font-medium">{formatMinutesToHours(analysis.workedMinutes)}</span>
                      </div>
                      {analysis.overtimeMinutes > 0 && (
                        <div>
                          <span className="text-muted-foreground">Hora extra: </span>
                          <span
                            className={cn(
                              "font-medium",
                              analysis.hasExcessiveOvertime && "text-warning"
                            )}
                          >
                            +{formatMinutesToHours(analysis.overtimeMinutes)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
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
