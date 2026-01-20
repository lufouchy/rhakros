import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Coffee, 
  LogIn, 
  LogOut,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TimeRecordType = 'entry' | 'lunch_out' | 'lunch_in' | 'exit';

interface TimeRecord {
  id: string;
  record_type: TimeRecordType;
  recorded_at: string;
}

const recordTypeLabels: Record<TimeRecordType, { label: string; icon: typeof LogIn }> = {
  entry: { label: 'Entrada', icon: LogIn },
  lunch_out: { label: 'Saída Almoço', icon: Coffee },
  lunch_in: { label: 'Volta Almoço', icon: Coffee },
  exit: { label: 'Saída', icon: LogOut },
};

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayRecords, setTodayRecords] = useState<TimeRecord[]>([]);
  const [hoursBalance, setHoursBalance] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastRegisteredTime, setLastRegisteredTime] = useState<string | null>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's records
  useEffect(() => {
    if (user) {
      fetchTodayRecords();
      fetchHoursBalance();
    }
  }, [user]);

  const fetchTodayRecords = async () => {
    if (!user?.id) return;

    // Use local day boundaries converted to ISO to avoid timezone mismatches with timestamptz
    const start = startOfDay(new Date()).toISOString();
    const end = endOfDay(new Date()).toISOString();

    const { data, error } = await supabase
      .from('time_records')
      .select('*')
      .eq('user_id', user.id)
      .gte('recorded_at', start)
      .lte('recorded_at', end)
      .order('recorded_at', { ascending: true });

    if (!error && data) {
      setTodayRecords(data as TimeRecord[]);
    }
  };
  const fetchHoursBalance = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('hours_balance')
      .select('balance_minutes')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setHoursBalance(data.balance_minutes);
    }
  };

  const getNextRecordType = (): TimeRecordType => {
    if (todayRecords.length === 0) return 'entry';
    const lastRecord = todayRecords[todayRecords.length - 1];
    switch (lastRecord.record_type) {
      case 'entry': return 'lunch_out';
      case 'lunch_out': return 'lunch_in';
      case 'lunch_in': return 'exit';
      case 'exit': return 'entry'; // Next day entry
      default: return 'entry';
    }
  };

  const handlePunchClock = async () => {
    setIsRegistering(true);
    
    // Simulate geolocation capture
    let latitude = null;
    let longitude = null;
    
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (e) {
        // Geolocation not available, continue without it
      }
    }

    const recordType = getNextRecordType();
    const recordedAt = new Date().toISOString();

    const { error } = await supabase
      .from('time_records')
      .insert({
        user_id: user?.id,
        record_type: recordType,
        recorded_at: recordedAt,
        latitude,
        longitude,
      });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar ponto',
        description: error.message,
      });
    } else {
      const timeStr = format(new Date(recordedAt), 'HH:mm');
      setLastRegisteredTime(timeStr);
      setShowSuccess(true);

      // Optimistic UI: update list immediately so "Próximo registro" muda na hora
      setTodayRecords((prev) =>
        [...prev, { id: crypto.randomUUID(), record_type: recordType, recorded_at: recordedAt }]
          .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()),
      );

      toast({
        title: 'Ponto registrado!',
        description: `${recordTypeLabels[recordType].label} às ${timeStr}`,
      });

      await fetchTodayRecords();

      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    }

    setIsRegistering(false);
  };

  const formatBalance = (minutes: number) => {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    const sign = minutes >= 0 ? '+' : '-';
    return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const nextRecordType = getNextRecordType();
  const NextIcon = recordTypeLabels[nextRecordType].icon;

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Current time display */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8 text-center">
          <p className="text-sm opacity-90 mb-2">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          <p className="time-display text-primary-foreground">
            {format(currentTime, 'HH:mm:ss')}
          </p>
        </div>
      </Card>

      {/* Punch button */}
      <div className="text-center py-4">
        {showSuccess ? (
          <div className="animate-scale-in space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success/10">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <p className="text-lg font-medium text-foreground">
              Ponto registrado às {lastRegisteredTime}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Próximo registro: <span className="font-medium text-foreground">{recordTypeLabels[nextRecordType].label}</span>
            </p>
            <Button
              className="btn-punch h-32 w-32 rounded-full"
              onClick={handlePunchClock}
              disabled={isRegistering}
            >
              {isRegistering ? (
                <Clock className="h-10 w-10 animate-spin" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <NextIcon className="h-8 w-8" />
                  <span className="text-sm font-medium">Registrar</span>
                </div>
              )}
            </Button>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Localização será capturada</span>
            </div>
          </div>
        )}
      </div>

      {/* Hours balance card */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            Saldo de Banco de Horas
            {hoursBalance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-3xl font-bold ${hoursBalance >= 0 ? 'balance-positive' : 'balance-negative'}`}>
            {formatBalance(hoursBalance)} horas
          </p>
        </CardContent>
      </Card>

      {/* Today's records */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Registros de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {todayRecords.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhum registro ainda hoje
            </p>
          ) : (
            <div className="space-y-3">
              {todayRecords.map((record) => {
                const RecordIcon = recordTypeLabels[record.record_type].icon;
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <RecordIcon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">
                        {recordTypeLabels[record.record_type].label}
                      </span>
                    </div>
                    <span className="text-lg font-semibold tabular-nums">
                      {format(new Date(record.recorded_at), 'HH:mm')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDashboard;

