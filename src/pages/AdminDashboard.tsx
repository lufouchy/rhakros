import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Clock, 
  Settings, 
  AlertTriangle,
  ChevronRight,
  Plus
} from 'lucide-react';
import { format, isWeekend, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface TimeRecord {
  id: string;
  user_id: string;
  record_type: 'entry' | 'lunch_out' | 'lunch_in' | 'exit';
  recorded_at: string;
}

interface HoursBalance {
  user_id: string;
  balance_minutes: number;
}

interface WorkSchedule {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  lunch_duration_minutes: number;
}

interface EmployeeStatus {
  profile: Profile;
  status: 'working' | 'absent' | 'break';
  todayMinutes: number;
  balance: number;
  hasAlert: boolean;
  todayRecords: TimeRecord[];
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeStatus | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    start_time: '08:00',
    end_time: '17:00',
    lunch_duration_minutes: 60,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchEmployees(),
      fetchSchedules(),
    ]);
    setLoading(false);
  };

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from('work_schedules')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (data) {
      setSchedules(data);
    }
  };

  const fetchEmployees = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Fetch all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (!profiles) return;

    // Fetch today's records for all users
    const { data: records } = await supabase
      .from('time_records')
      .select('*')
      .gte('recorded_at', `${today}T00:00:00`)
      .lte('recorded_at', `${today}T23:59:59`);

    // Fetch hours balance for all users
    const { data: balances } = await supabase
      .from('hours_balance')
      .select('*');

    // Build employee status list
    const employeeStatuses: EmployeeStatus[] = profiles.map((profile) => {
      const userRecords = (records || []).filter(r => r.user_id === profile.user_id) as TimeRecord[];
      const userBalance = (balances || []).find(b => b.user_id === profile.user_id);

      // Calculate today's worked minutes
      let todayMinutes = 0;
      if (userRecords.length >= 2) {
        const entry = userRecords.find(r => r.record_type === 'entry');
        const exit = userRecords.find(r => r.record_type === 'exit');
        const lunchOut = userRecords.find(r => r.record_type === 'lunch_out');
        const lunchIn = userRecords.find(r => r.record_type === 'lunch_in');

        if (entry) {
          const endTime = exit ? new Date(exit.recorded_at) : new Date();
          todayMinutes = Math.floor((endTime.getTime() - new Date(entry.recorded_at).getTime()) / 60000);
          
          // Subtract lunch time
          if (lunchOut && lunchIn) {
            const lunchMinutes = Math.floor(
              (new Date(lunchIn.recorded_at).getTime() - new Date(lunchOut.recorded_at).getTime()) / 60000
            );
            todayMinutes -= lunchMinutes;
          }
        }
      }

      // Determine status
      let status: 'working' | 'absent' | 'break' = 'absent';
      if (userRecords.length > 0) {
        const lastRecord = userRecords[userRecords.length - 1];
        if (lastRecord.record_type === 'entry' || lastRecord.record_type === 'lunch_in') {
          status = 'working';
        } else if (lastRecord.record_type === 'lunch_out') {
          status = 'break';
        }
      }

      // Check for alerts (overtime > 2h or inconsistencies)
      const hasAlert = todayMinutes > 600 || // More than 10h worked
        (userRecords.some(r => r.record_type === 'entry') && 
         !userRecords.some(r => r.record_type === 'exit') && 
         todayMinutes > 540); // No exit but > 9h

      return {
        profile,
        status,
        todayMinutes,
        balance: userBalance?.balance_minutes || 0,
        hasAlert,
        todayRecords: userRecords,
      };
    });

    setEmployees(employeeStatuses);
  };

  const handleCreateSchedule = async () => {
    const { error } = await supabase
      .from('work_schedules')
      .insert(newSchedule);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar regra',
        description: error.message,
      });
    } else {
      toast({
        title: 'Regra criada!',
        description: 'Nova regra de jornada cadastrada com sucesso.',
      });
      setShowScheduleDialog(false);
      setNewSchedule({
        name: '',
        start_time: '08:00',
        end_time: '17:00',
        lunch_duration_minutes: 60,
      });
      fetchSchedules();
    }
  };

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(Math.abs(minutes) / 60);
    const m = Math.abs(minutes) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const formatBalance = (minutes: number) => {
    const sign = minutes >= 0 ? '+' : '-';
    return `${sign}${formatMinutes(minutes)}`;
  };

  // Generate month days for the timesheet
  const getMonthDays = () => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return eachDayOfInterval({ start, end });
  };

  const getRecordTime = (records: TimeRecord[], type: string) => {
    const record = records.find(r => r.record_type === type);
    return record ? format(new Date(record.recorded_at), 'HH:mm') : '--:--';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Colaboradores</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-success/10">
                <Clock className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trabalhando Agora</p>
                <p className="text-2xl font-bold">
                  {employees.filter(e => e.status === 'working').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-warning/10">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alertas</p>
                <p className="text-2xl font-bold">
                  {employees.filter(e => e.hasAlert).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work schedules */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Regras de Jornada
          </CardTitle>
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Regra de Jornada</DialogTitle>
                <DialogDescription>
                  Configure uma nova regra de horário de trabalho.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome da Regra</Label>
                  <Input
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                    placeholder="Ex: Turno Comercial"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entrada</Label>
                    <Input
                      type="time"
                      value={newSchedule.start_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Saída</Label>
                    <Input
                      type="time"
                      value={newSchedule.end_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Duração do Almoço (minutos)</Label>
                  <Input
                    type="number"
                    value={newSchedule.lunch_duration_minutes}
                    onChange={(e) => setNewSchedule({ ...newSchedule, lunch_duration_minutes: parseInt(e.target.value) })}
                  />
                </div>
                <Button onClick={handleCreateSchedule} className="w-full">
                  Criar Regra
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {schedules.map((schedule) => (
              <Badge key={schedule.id} variant="secondary" className="py-2 px-3">
                {schedule.name}: {schedule.start_time} às {schedule.end_time}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Employees table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Colaboradores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Horas Hoje</TableHead>
                <TableHead className="text-right">Saldo Banco</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow 
                  key={employee.profile.id}
                  className={employee.hasAlert ? 'table-row-alert' : ''}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {employee.hasAlert && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      {employee.profile.full_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`status-badge ${
                      employee.status === 'working' ? 'status-working' :
                      employee.status === 'break' ? 'status-warning' :
                      'status-absent'
                    }`}>
                      {employee.status === 'working' ? 'Trabalhando' :
                       employee.status === 'break' ? 'Intervalo' :
                       'Ausente'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinutes(employee.todayMinutes)}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums font-semibold ${
                    employee.balance >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {formatBalance(employee.balance)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedEmployee(employee)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Employee detail dialog (Espelho de Ponto) */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Espelho de Ponto - {selectedEmployee?.profile.full_name}</DialogTitle>
            <DialogDescription>
              {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Dia</TableHead>
                  <TableHead className="text-center">Ent 1</TableHead>
                  <TableHead className="text-center">Sai 1</TableHead>
                  <TableHead className="text-center">Ent 2</TableHead>
                  <TableHead className="text-center">Sai 2</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getMonthDays().map((day) => {
                  const isWeekendDay = isWeekend(day);
                  const dayRecords = selectedEmployee?.todayRecords.filter(r => 
                    format(new Date(r.recorded_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                  ) || [];

                  return (
                    <TableRow 
                      key={day.toISOString()}
                      className={isWeekendDay ? 'table-row-weekend' : ''}
                    >
                      <TableCell>{format(day, 'dd/MM')}</TableCell>
                      <TableCell>{format(day, 'EEE', { locale: ptBR })}</TableCell>
                      <TableCell className="text-center tabular-nums">
                        {getRecordTime(dayRecords, 'entry')}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {getRecordTime(dayRecords, 'lunch_out')}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {getRecordTime(dayRecords, 'lunch_in')}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {getRecordTime(dayRecords, 'exit')}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">--:--</TableCell>
                      <TableCell className="text-right tabular-nums">--:--</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
