import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Clock, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface WorkSchedule {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  lunch_duration_minutes: number;
}

interface ScheduleForm {
  name: string;
  start_time: string;
  end_time: string;
  lunch_duration_minutes: number;
}

const WorkScheduleManagement = () => {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<WorkSchedule | null>(null);

  const [form, setForm] = useState<ScheduleForm>({
    name: '',
    start_time: '08:00',
    end_time: '17:00',
    lunch_duration_minutes: 60,
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('work_schedules')
      .select('*')
      .order('name');

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar jornadas',
        description: error.message,
      });
    } else {
      setSchedules(data || []);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setForm({
      name: '',
      start_time: '08:00',
      end_time: '17:00',
      lunch_duration_minutes: 60,
    });
    setEditingSchedule(null);
  };

  const openEditDialog = (schedule: WorkSchedule) => {
    setEditingSchedule(schedule);
    setForm({
      name: schedule.name,
      start_time: schedule.start_time.slice(0, 5),
      end_time: schedule.end_time.slice(0, 5),
      lunch_duration_minutes: schedule.lunch_duration_minutes,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (schedule: WorkSchedule) => {
    setScheduleToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Informe o nome da jornada.',
      });
      return;
    }

    setIsSaving(true);

    try {
      if (editingSchedule) {
        const { error } = await supabase
          .from('work_schedules')
          .update({
            name: form.name,
            start_time: form.start_time,
            end_time: form.end_time,
            lunch_duration_minutes: form.lunch_duration_minutes,
          })
          .eq('id', editingSchedule.id);

        if (error) throw error;

        toast({
          title: 'Jornada atualizada!',
          description: `A jornada "${form.name}" foi atualizada com sucesso.`,
        });
      } else {
        const { error } = await supabase
          .from('work_schedules')
          .insert({
            name: form.name,
            start_time: form.start_time,
            end_time: form.end_time,
            lunch_duration_minutes: form.lunch_duration_minutes,
          });

        if (error) throw error;

        toast({
          title: 'Jornada criada!',
          description: `A jornada "${form.name}" foi cadastrada com sucesso.`,
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchSchedules();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!scheduleToDelete) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('work_schedules')
        .delete()
        .eq('id', scheduleToDelete.id);

      if (error) throw error;

      toast({
        title: 'Jornada excluída!',
        description: `A jornada "${scheduleToDelete.name}" foi removida.`,
      });

      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
      fetchSchedules();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Gerenciar Jornadas de Trabalho
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Jornada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? 'Editar Jornada' : 'Nova Jornada'}
              </DialogTitle>
              <DialogDescription>
                {editingSchedule
                  ? 'Atualize as informações da jornada de trabalho.'
                  : 'Cadastre uma nova jornada de trabalho para os colaboradores.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="schedule_name">Nome da Jornada *</Label>
                <Input
                  id="schedule_name"
                  placeholder="Ex: Normal, Madrugada, Geral..."
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Hora de Entrada</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Hora de Saída</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lunch_duration">Intervalo de Almoço (minutos)</Label>
                <Input
                  id="lunch_duration"
                  type="number"
                  min="0"
                  max="180"
                  value={form.lunch_duration_minutes}
                  onChange={(e) => setForm(prev => ({ 
                    ...prev, 
                    lunch_duration_minutes: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSchedule ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma jornada cadastrada.</p>
            <p className="text-sm">Clique em "Nova Jornada" para começar.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Entrada</TableHead>
                  <TableHead className="text-center">Saída</TableHead>
                  <TableHead className="text-center">Almoço</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell className="text-center">{schedule.start_time.slice(0, 5)}</TableCell>
                    <TableCell className="text-center">{schedule.end_time.slice(0, 5)}</TableCell>
                    <TableCell className="text-center">{schedule.lunch_duration_minutes} min</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(schedule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(schedule)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir a jornada "{scheduleToDelete?.name}"?
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default WorkScheduleManagement;
