import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Clock, 
  FileText, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Loader2,
  Calendar as CalendarIcon,
  Stethoscope,
  Briefcase,
  Palmtree,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

type RecordType = 'entry' | 'lunch_out' | 'lunch_in' | 'exit';
type RequestStatus = 'pending' | 'approved' | 'rejected';
type RequestType = 'adjustment' | 'medical_consultation' | 'medical_leave' | 'justified_absence' | 'vacation';

interface AdjustmentRequest {
  id: string;
  user_id: string;
  request_type: string;
  requested_time: string;
  record_type: RecordType;
  reason: string;
  status: RequestStatus;
  created_at: string;
  userName?: string;
  start_time?: string;
  end_time?: string;
  absence_dates?: string[];
  absence_reason?: string;
}

const recordTypeLabels: Record<RecordType, string> = {
  entry: 'Entrada',
  lunch_out: 'Saída Almoço',
  lunch_in: 'Volta Almoço',
  exit: 'Saída',
};

const requestTypeLabels: Record<RequestType, { label: string; icon: typeof Clock }> = {
  adjustment: { label: 'Ajuste de Ponto', icon: AlertCircle },
  medical_consultation: { label: 'Atestado Médico - Consulta', icon: Stethoscope },
  medical_leave: { label: 'Atestado Médico - Afastamento', icon: Stethoscope },
  justified_absence: { label: 'Ausência Justificada', icon: Briefcase },
  vacation: { label: 'Solicitação de Férias', icon: Palmtree },
};

const statusConfig: Record<RequestStatus, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: typeof Clock }> = {
  pending: { label: 'Pendente', variant: 'secondary', icon: Clock },
  approved: { label: 'Aprovado', variant: 'default', icon: CheckCircle },
  rejected: { label: 'Reprovado', variant: 'destructive', icon: XCircle },
};

const Requests = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AdjustmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [requestType, setRequestType] = useState<RequestType>('adjustment');
  const [recordType, setRecordType] = useState<RecordType>('entry');
  const [requestedTime, setRequestedTime] = useState('');
  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [absenceDates, setAbsenceDates] = useState<Date[]>([]);
  const [absenceReason, setAbsenceReason] = useState('');
  const [vacationRange, setVacationRange] = useState<DateRange | undefined>();

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    fetchRequests();
  }, [user, isAdmin]);

  const fetchRequests = async () => {
    setLoading(true);
    
    let query = supabase
      .from('adjustment_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', user?.id);
    }

    const { data, error } = await query;

    if (!error && data) {
      if (isAdmin) {
        const userIds = [...new Set(data.map((r) => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);
        
        setRequests(data.map((r) => ({
          ...r,
          userName: profileMap.get(r.user_id) || 'Usuário',
        })) as AdjustmentRequest[]);
      } else {
        setRequests(data as AdjustmentRequest[]);
      }
    }
    
    setLoading(false);
  };

  const resetForm = () => {
    setRequestType('adjustment');
    setRecordType('entry');
    setRequestedTime('');
    setReason('');
    setStartTime('');
    setEndTime('');
    setAbsenceDates([]);
    setAbsenceReason('');
    setVacationRange(undefined);
  };

  const handleCreateRequest = async () => {
    // Validation based on request type
    if (requestType === 'adjustment') {
      if (!requestedTime || !reason) {
        toast({
          variant: 'destructive',
          title: 'Campos obrigatórios',
          description: 'Preencha todos os campos.',
        });
        return;
      }
    } else if (requestType === 'medical_consultation' || requestType === 'justified_absence') {
      if (!startTime || !endTime || !reason) {
        toast({
          variant: 'destructive',
          title: 'Campos obrigatórios',
          description: 'Preencha horário de início, término e motivo.',
        });
        return;
      }
    } else if (requestType === 'medical_leave') {
      if (absenceDates.length === 0 || !reason) {
        toast({
          variant: 'destructive',
          title: 'Campos obrigatórios',
          description: 'Selecione os dias de afastamento e adicione o motivo.',
        });
        return;
      }
    } else if (requestType === 'vacation') {
      if (!vacationRange?.from || !vacationRange?.to) {
        toast({
          variant: 'destructive',
          title: 'Campos obrigatórios',
          description: 'Selecione o período de férias.',
        });
        return;
      }
    }

    setSubmitting(true);

    // Handle vacation request separately
    if (requestType === 'vacation') {
      const daysCount = differenceInDays(vacationRange!.to!, vacationRange!.from!) + 1;
      
      const { data: profileData } = await supabase.from('profiles').select('organization_id').eq('user_id', user?.id).single();
      const { error } = await supabase
        .from('vacation_requests')
        .insert({
          user_id: user?.id,
          vacation_type: 'individual',
          start_date: format(vacationRange!.from!, 'yyyy-MM-dd'),
          end_date: format(vacationRange!.to!, 'yyyy-MM-dd'),
          days_count: daysCount,
          reason: reason || null,
          status: 'pending',
          created_by: user?.id,
          is_admin_created: false,
          organization_id: profileData?.organization_id,
        });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao solicitar férias',
          description: error.message,
        });
      } else {
      toast({
          title: 'Solicitação de férias enviada!',
          description: `Aguarde a aprovação para ${daysCount} dias de férias.`,
        });
        setShowNewDialog(false);
        resetForm();
        fetchRequests();
      }
      setSubmitting(false);
      return;
    }

    // Regular adjustment requests
    const { data: adjProfileData } = await supabase.from('profiles').select('organization_id').eq('user_id', user?.id).single();
    const insertData: any = {
      user_id: user?.id,
      request_type: requestType,
      requested_time: requestType === 'adjustment' 
        ? new Date(requestedTime).toISOString()
        : new Date().toISOString(),
      record_type: recordType,
      reason: reason,
      status: 'pending',
      organization_id: adjProfileData?.organization_id,
    };

    if (requestType === 'medical_consultation' || requestType === 'justified_absence') {
      insertData.start_time = startTime;
      insertData.end_time = endTime;
      insertData.absence_reason = requestType === 'justified_absence' ? absenceReason : null;
    }

    if (requestType === 'medical_leave') {
      insertData.absence_dates = absenceDates.map(d => format(d, 'yyyy-MM-dd'));
    }

    const { error } = await supabase
      .from('adjustment_requests')
      .insert(insertData);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar solicitação',
        description: error.message,
      });
    } else {
      toast({
        title: 'Solicitação enviada!',
        description: 'Aguarde a análise do gestor.',
      });
      setShowNewDialog(false);
      resetForm();
      fetchRequests();
    }

    setSubmitting(false);
  };

  const handleUpdateStatus = async (requestId: string, newStatus: RequestStatus) => {
    const { error } = await supabase
      .from('adjustment_requests')
      .update({
        status: newStatus,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message,
      });
    } else {
      toast({
        title: newStatus === 'approved' ? 'Solicitação aprovada!' : 'Solicitação reprovada',
        description: newStatus === 'approved' 
          ? 'O registro foi ajustado.'
          : 'O colaborador será notificado.',
      });
      fetchRequests();
    }
  };

  const getRequestTypeInfo = (type: string) => {
    return requestTypeLabels[type as RequestType] || { label: type, icon: FileText };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAdmin ? 'Solicitações de Ajuste' : 'Minhas Solicitações'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? 'Gerencie as solicitações dos colaboradores'
              : 'Solicite ajustes, férias ou envie atestados'}
          </p>
        </div>

        {!isAdmin && (
          <Dialog open={showNewDialog} onOpenChange={(open) => { setShowNewDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Solicitação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Solicitação</DialogTitle>
                <DialogDescription>
                  Solicite ajuste de ponto, férias ou envie um atestado.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Tipo de Solicitação</Label>
                  <Select
                    value={requestType}
                    onValueChange={(value) => setRequestType(value as RequestType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adjustment">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Ajuste de Ponto
                        </div>
                      </SelectItem>
                      <SelectItem value="vacation">
                        <div className="flex items-center gap-2">
                          <Palmtree className="h-4 w-4" />
                          Solicitação de Férias
                        </div>
                      </SelectItem>
                      <SelectItem value="medical_consultation">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4" />
                          Atestado Médico - Consulta
                        </div>
                      </SelectItem>
                      <SelectItem value="medical_leave">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4" />
                          Atestado Médico - Afastamento Dia
                        </div>
                      </SelectItem>
                      <SelectItem value="justified_absence">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Ausência Justificada
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Adjustment fields */}
                {requestType === 'adjustment' && (
                  <>
                    <div className="space-y-2">
                      <Label>Tipo de Registro</Label>
                      <Select
                        value={recordType}
                        onValueChange={(value) => setRecordType(value as RecordType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">Entrada</SelectItem>
                          <SelectItem value="lunch_out">Saída Almoço</SelectItem>
                          <SelectItem value="lunch_in">Volta Almoço</SelectItem>
                          <SelectItem value="exit">Saída</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Data e Hora Correta</Label>
                      <Input
                        type="datetime-local"
                        value={requestedTime}
                        onChange={(e) => setRequestedTime(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Motivo</Label>
                      <Textarea
                        placeholder="Descreva o motivo da solicitação..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
                )}

                {/* Vacation fields */}
                {requestType === 'vacation' && (
                  <>
                    <div className="space-y-2">
                      <Label>Período das Férias</Label>
                      <div className="border rounded-lg p-3">
                        <Calendar
                          mode="range"
                          selected={vacationRange}
                          onSelect={setVacationRange}
                          locale={ptBR}
                          numberOfMonths={1}
                        />
                      </div>
                      {vacationRange?.from && vacationRange?.to && (
                        <p className="text-sm text-muted-foreground">
                          {differenceInDays(vacationRange.to, vacationRange.from) + 1} dias selecionados
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Observação (opcional)</Label>
                      <Textarea
                        placeholder="Adicione uma observação..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {/* Medical consultation and justified absence fields */}
                {(requestType === 'medical_consultation' || requestType === 'justified_absence') && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Horário de Início</Label>
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horário de Término</Label>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {requestType === 'justified_absence' ? 'Motivo da Ausência' : 'Descrição'}
                      </Label>
                      <Textarea
                        placeholder={requestType === 'justified_absence' 
                          ? "Descreva o motivo da ausência..."
                          : "Descreva os detalhes da consulta..."}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
                )}

                {/* Medical leave (full day) fields */}
                {requestType === 'medical_leave' && (
                  <>
                    <div className="space-y-2">
                      <Label>Dias de Afastamento</Label>
                      <div className="border rounded-lg p-3">
                        <Calendar
                          mode="multiple"
                          selected={absenceDates}
                          onSelect={(dates) => setAbsenceDates(dates || [])}
                          locale={ptBR}
                        />
                      </div>
                      {absenceDates.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {absenceDates.length} dia(s) selecionado(s)
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Motivo do Afastamento</Label>
                      <Textarea
                        placeholder="Descreva o motivo do afastamento..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
                )}

                <Button onClick={handleCreateRequest} className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Solicitação'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {requests.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">
              Nenhuma solicitação encontrada
            </p>
            <p className="text-muted-foreground text-sm">
              {isAdmin 
                ? 'Não há solicitações pendentes no momento.'
                : 'Você ainda não fez nenhuma solicitação.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const StatusIcon = statusConfig[request.status].icon;
            const typeInfo = getRequestTypeInfo(request.request_type);
            const TypeIcon = typeInfo.icon;
            
            return (
              <Card key={request.id} className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                          <TypeIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {typeInfo.label}
                          </h3>
                          {isAdmin && request.userName && (
                            <p className="text-sm text-muted-foreground">
                              {request.userName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {request.request_type === 'adjustment' && (
                          <>
                            <div>
                              <p className="text-muted-foreground">Tipo de Registro</p>
                              <p className="font-medium">{recordTypeLabels[request.record_type]}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Horário Solicitado</p>
                              <p className="font-medium">
                                {format(new Date(request.requested_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </>
                        )}
                        
                        {(request.request_type === 'medical_consultation' || request.request_type === 'justified_absence') && request.start_time && request.end_time && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Horário de Afastamento</p>
                            <p className="font-medium">
                              {request.start_time} às {request.end_time}
                            </p>
                          </div>
                        )}

                        {request.request_type === 'medical_leave' && request.absence_dates && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Dias de Afastamento</p>
                            <p className="font-medium">
                              {request.absence_dates.length} dia(s)
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="text-sm">
                        <p className="text-muted-foreground">Motivo</p>
                        <p className="text-foreground">{request.reason}</p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Solicitado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <Badge 
                        variant={statusConfig[request.status].variant}
                        className="gap-1.5"
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig[request.status].label}
                      </Badge>

                      {isAdmin && request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => handleUpdateStatus(request.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                            Reprovar
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleUpdateStatus(request.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Aprovar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Requests;
