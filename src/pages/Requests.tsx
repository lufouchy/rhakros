import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type RecordType = 'entry' | 'lunch_out' | 'lunch_in' | 'exit';
type RequestStatus = 'pending' | 'approved' | 'rejected';

interface AdjustmentRequest {
  id: string;
  user_id: string;
  request_type: string;
  requested_time: string;
  record_type: RecordType;
  reason: string;
  status: RequestStatus;
  created_at: string;
}

const recordTypeLabels: Record<RecordType, string> = {
  entry: 'Entrada',
  lunch_out: 'Saída Almoço',
  lunch_in: 'Volta Almoço',
  exit: 'Saída',
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
  const [newRequest, setNewRequest] = useState({
    request_type: 'adjustment',
    requested_time: '',
    record_type: 'entry' as RecordType,
    reason: '',
  });

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

    // Non-admins only see their own requests
    if (!isAdmin) {
      query = query.eq('user_id', user?.id);
    }

    const { data, error } = await query;

    if (!error && data) {
      setRequests(data as AdjustmentRequest[]);
    }
    
    setLoading(false);
  };

  const handleCreateRequest = async () => {
    if (!newRequest.requested_time || !newRequest.reason) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos.',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('adjustment_requests')
      .insert({
        user_id: user?.id,
        request_type: newRequest.request_type,
        requested_time: new Date(newRequest.requested_time).toISOString(),
        record_type: newRequest.record_type,
        reason: newRequest.reason,
        status: 'pending',
      });

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
      setNewRequest({
        request_type: 'adjustment',
        requested_time: '',
        record_type: 'entry',
        reason: '',
      });
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
          ? 'O ponto foi ajustado automaticamente.'
          : 'O colaborador será notificado.',
      });
      fetchRequests();
    }
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
              ? 'Gerencie as solicitações de ajuste dos colaboradores'
              : 'Solicite ajustes ou envie atestados'}
          </p>
        </div>

        {!isAdmin && (
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Solicitação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Solicitação</DialogTitle>
                <DialogDescription>
                  Solicite um ajuste de ponto ou envie um atestado médico.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Tipo de Solicitação</Label>
                  <Select
                    value={newRequest.request_type}
                    onValueChange={(value) => setNewRequest({ ...newRequest, request_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adjustment">Ajuste de Ponto</SelectItem>
                      <SelectItem value="medical_certificate">Atestado Médico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Registro</Label>
                  <Select
                    value={newRequest.record_type}
                    onValueChange={(value) => setNewRequest({ ...newRequest, record_type: value as RecordType })}
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
                    value={newRequest.requested_time}
                    onChange={(e) => setNewRequest({ ...newRequest, requested_time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Textarea
                    placeholder="Descreva o motivo da solicitação..."
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                    rows={3}
                  />
                </div>

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
            
            return (
              <Card key={request.id} className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                          {request.request_type === 'medical_certificate' ? (
                            <FileText className="h-5 w-5 text-primary" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {request.request_type === 'medical_certificate' 
                              ? 'Atestado Médico'
                              : 'Ajuste de Ponto'}
                          </h3>
                          {isAdmin && request.profiles && (
                            <p className="text-sm text-muted-foreground">
                              {request.profiles.full_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
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
