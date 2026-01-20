import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, endOfDay } from 'date-fns';
import EmployeeHero from '@/components/employee/EmployeeHero';
import TodayRecordsCard from '@/components/employee/TodayRecordsCard';
import HoursBalanceCard from '@/components/employee/HoursBalanceCard';
import TodayScheduleCard from '@/components/employee/TodayScheduleCard';
import PunchButton from '@/components/employee/PunchButton';

type TimeRecordType = 'entry' | 'lunch_out' | 'lunch_in' | 'exit';

interface TimeRecord {
  id: string;
  record_type: TimeRecordType;
  recorded_at: string;
}

const recordTypeLabels: Record<TimeRecordType, string> = {
  entry: 'Entrada',
  lunch_out: 'Saída Almoço',
  lunch_in: 'Volta Almoço',
  exit: 'Saída',
};

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [todayRecords, setTodayRecords] = useState<TimeRecord[]>([]);
  const [hoursBalance, setHoursBalance] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastRegisteredTime, setLastRegisteredTime] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTodayRecords();
      fetchHoursBalance();
    }
  }, [user]);

  const fetchTodayRecords = async () => {
    if (!user?.id) return;

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
      case 'exit': return 'entry';
      default: return 'entry';
    }
  };

  const handlePunchClock = async () => {
    setIsRegistering(true);
    
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
        // Geolocation not available
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

      setTodayRecords((prev) =>
        [...prev, { id: crypto.randomUUID(), record_type: recordType, recorded_at: recordedAt }]
          .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()),
      );

      toast({
        title: 'Ponto registrado!',
        description: `${recordTypeLabels[recordType]} às ${timeStr}`,
      });

      await fetchTodayRecords();
      setTimeout(() => setShowSuccess(false), 3000);
    }

    setIsRegistering(false);
  };

  return (
    <div className="p-6 pb-32 animate-fade-in">
      {/* Hero section with employee info */}
      <EmployeeHero />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <TodayRecordsCard records={todayRecords} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <HoursBalanceCard balanceMinutes={hoursBalance} />
          <TodayScheduleCard />
        </div>
      </div>

      {/* Floating punch button */}
      <PunchButton
        isRegistering={isRegistering}
        showSuccess={showSuccess}
        lastRegisteredTime={lastRegisteredTime}
        onClick={handlePunchClock}
      />
    </div>
  );
};

export default EmployeeDashboard;
