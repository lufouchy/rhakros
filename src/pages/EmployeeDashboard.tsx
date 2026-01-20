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
import LocationMapDialog from '@/components/employee/LocationMapDialog';
import { useLocationValidation } from '@/hooks/useLocationValidation';

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
  const { validateLocation, isValidating } = useLocationValidation();
  const [todayRecords, setTodayRecords] = useState<TimeRecord[]>([]);
  const [hoursBalance, setHoursBalance] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastRegisteredTime, setLastRegisteredTime] = useState<string | null>(null);
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [mapData, setMapData] = useState<{
    userLocation: { lat: number; lng: number } | null;
    companyLocation: { lat: number; lng: number } | null;
    allowedRadius: number | null;
    distanceMeters?: number;
    isValid?: boolean;
  }>({
    userLocation: null,
    companyLocation: null,
    allowedRadius: null,
  });

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
    
    // Validate location before allowing punch
    const locationResult = await validateLocation();
    
    // Update map data if we have location info
    if (locationResult.latitude !== null && locationResult.longitude !== null) {
      setMapData({
        userLocation: { lat: locationResult.latitude, lng: locationResult.longitude },
        companyLocation: locationResult.companyLatitude && locationResult.companyLongitude 
          ? { lat: locationResult.companyLatitude, lng: locationResult.companyLongitude }
          : null,
        allowedRadius: locationResult.allowedRadius || null,
        distanceMeters: locationResult.distanceMeters,
        isValid: locationResult.isValid,
      });
      setShowMapDialog(true);
    }
    
    if (!locationResult.isValid) {
      toast({
        variant: 'destructive',
        title: 'Localização inválida',
        description: locationResult.message,
      });
      setIsRegistering(false);
      return;
    }

    // Show location validation message if available
    if (locationResult.message && locationResult.latitude !== null) {
      toast({
        title: 'Localização verificada',
        description: locationResult.message,
      });
    }

    const recordType = getNextRecordType();
    const recordedAt = new Date().toISOString();

    const { error } = await supabase
      .from('time_records')
      .insert({
        user_id: user?.id,
        record_type: recordType,
        recorded_at: recordedAt,
        latitude: locationResult.latitude,
        longitude: locationResult.longitude,
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
        isRegistering={isRegistering || isValidating}
        showSuccess={showSuccess}
        lastRegisteredTime={lastRegisteredTime}
        onClick={handlePunchClock}
      />

      {/* Location map dialog */}
      <LocationMapDialog
        open={showMapDialog}
        onOpenChange={setShowMapDialog}
        userLocation={mapData.userLocation}
        companyLocation={mapData.companyLocation}
        allowedRadius={mapData.allowedRadius}
        distanceMeters={mapData.distanceMeters}
        isValid={mapData.isValid}
      />
    </div>
  );
};

export default EmployeeDashboard;
