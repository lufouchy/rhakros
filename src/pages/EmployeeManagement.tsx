import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, Search, Plus, Users, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkSchedule {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_start_time: string | null;
  break_end_time: string | null;
  break_duration_minutes: number | null;
}

interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  cpf: string | null;
  birth_date: string | null;
  hire_date: string | null;
  termination_date: string | null;
  phone: string | null;
  sector: string | null;
  position: string | null;
  work_schedule_id: string | null;
  address_city: string | null;
  address_state: string | null;
}

interface EmployeeForm {
  full_name: string;
  email: string;
  cpf: string;
  birth_date: string;
  hire_date: string;
  termination_date: string;
  phone: string;
  address_cep: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  sector: string;
  position: string;
  work_schedule_id: string;
  password: string;
}

interface NewScheduleForm {
  name: string;
  start_time: string;
  end_time: string;
  break_start_time: string;
  break_end_time: string;
  break_duration_minutes: string;
}

const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

const EmployeeManagement = () => {
  const { user, userRole, loading } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  
  const initialForm: EmployeeForm = {
    full_name: '',
    email: '',
    cpf: '',
    birth_date: '',
    hire_date: '',
    termination_date: '',
    phone: '',
    address_cep: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    sector: '',
    position: '',
    work_schedule_id: '',
    password: '',
  };

  const [form, setForm] = useState<EmployeeForm>(initialForm);

  const [newSchedule, setNewSchedule] = useState<NewScheduleForm>({
    name: '',
    start_time: '08:00',
    end_time: '17:00',
    break_start_time: '',
    break_end_time: '',
    break_duration_minutes: '60',
  });

  useEffect(() => {
    fetchSchedules();
    fetchEmployees();
  }, []);

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from('work_schedules')
      .select('*')
      .order('name');
    
    if (data) {
      setSchedules(data);
    }
  };

  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    
    if (data) {
      setEmployees(data as Employee[]);
    }
    setIsLoadingEmployees(false);
  };

  const searchCep = async () => {
    const cep = form.address_cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast({
        variant: 'destructive',
        title: 'CEP inválido',
        description: 'O CEP deve conter 8 dígitos.',
      });
      return;
    }

    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          variant: 'destructive',
          title: 'CEP não encontrado',
          description: 'Verifique o CEP informado.',
        });
        return;
      }

      setForm(prev => ({
        ...prev,
        address_street: data.logradouro || '',
        address_neighborhood: data.bairro || '',
        address_city: data.localidade || '',
        address_state: data.uf || '',
      }));

      toast({
        title: 'Endereço encontrado!',
        description: 'Preencha o número e complemento.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar CEP',
        description: 'Não foi possível buscar o endereço.',
      });
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.name) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Informe o nome da jornada.',
      });
      return;
    }

    const { data, error } = await supabase
      .from('work_schedules')
      .insert({
        name: newSchedule.name,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        break_start_time: newSchedule.break_start_time || null,
        break_end_time: newSchedule.break_end_time || null,
        break_duration_minutes: parseInt(newSchedule.break_duration_minutes) || 60,
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar jornada',
        description: error.message,
      });
    } else {
      toast({
        title: 'Jornada criada!',
        description: 'A nova jornada foi cadastrada.',
      });
      setSchedules(prev => [...prev, data]);
      setForm(prev => ({ ...prev, work_schedule_id: data.id }));
      setShowNewSchedule(false);
      setNewSchedule({
        name: '',
        start_time: '08:00',
        end_time: '17:00',
        break_start_time: '',
        break_end_time: '',
        break_duration_minutes: '60',
      });
    }
  };

  const handleSubmit = async () => {
    if (!form.full_name || !form.email || !form.password) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha nome, e-mail e senha.',
      });
      return;
    }

    if (form.password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create user via auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with additional data
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            cpf: form.cpf.replace(/\D/g, '') || null,
            birth_date: form.birth_date || null,
            hire_date: form.hire_date || null,
            termination_date: form.termination_date || null,
            phone: form.phone.replace(/\D/g, '') || null,
            address_cep: form.address_cep.replace(/\D/g, '') || null,
            address_street: form.address_street || null,
            address_number: form.address_number || null,
            address_complement: form.address_complement || null,
            address_neighborhood: form.address_neighborhood || null,
            address_city: form.address_city || null,
            address_state: form.address_state || null,
            sector: form.sector || null,
            position: form.position || null,
            work_schedule_id: form.work_schedule_id || null,
          } as any)
          .eq('user_id', authData.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      toast({
        title: 'Colaborador cadastrado!',
        description: `${form.full_name} foi cadastrado com sucesso.`,
      });

      setOpen(false);
      setForm(initialForm);
      fetchEmployees();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getScheduleName = (scheduleId: string | null) => {
    if (!scheduleId) return '-';
    const schedule = schedules.find(s => s.id === scheduleId);
    return schedule?.name || '-';
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SidebarLayout>
    );
  }

  if (!user || userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Cadastro de Colaboradores
            </h1>
            <p className="text-muted-foreground">
              Gerencie os colaboradores da empresa
            </p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Cadastrar Novo Colaborador
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo colaborador. Os campos marcados com * são obrigatórios.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                {/* Personal Data */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Dados Pessoais</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="full_name">Nome Completo *</Label>
                      <Input
                        id="full_name"
                        placeholder="João da Silva"
                        value={form.full_name}
                        onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={form.cpf}
                        onChange={(e) => setForm(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                        maxLength={14}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birth_date">Data de Nascimento</Label>
                      <Input
                        id="birth_date"
                        type="date"
                        value={form.birth_date}
                        onChange={(e) => setForm(prev => ({ ...prev, birth_date: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="joao@empresa.com"
                        value={form.email}
                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        placeholder="(00) 00000-0000"
                        value={form.phone}
                        onChange={(e) => setForm(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                        maxLength={15}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hire_date">Data de Admissão</Label>
                      <Input
                        id="hire_date"
                        type="date"
                        value={form.hire_date}
                        onChange={(e) => setForm(prev => ({ ...prev, hire_date: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="termination_date">Data de Desligamento</Label>
                      <Input
                        id="termination_date"
                        type="date"
                        value={form.termination_date}
                        onChange={(e) => setForm(prev => ({ ...prev, termination_date: e.target.value }))}
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="password">Senha Inicial *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Senha para o primeiro acesso (mín. 6 caracteres)"
                        value={form.password}
                        onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Endereço</h3>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="cep"
                          placeholder="00000-000"
                          value={form.address_cep}
                          onChange={(e) => setForm(prev => ({ ...prev, address_cep: e.target.value }))}
                          maxLength={9}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={searchCep}
                          disabled={isSearchingCep}
                        >
                          {isSearchingCep ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="street">Rua</Label>
                    <Input
                      id="street"
                      placeholder="Nome da rua"
                      value={form.address_street}
                      readOnly
                      className="bg-muted/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        placeholder="123"
                        value={form.address_number}
                        onChange={(e) => setForm(prev => ({ ...prev, address_number: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        placeholder="Apto 101"
                        value={form.address_complement}
                        onChange={(e) => setForm(prev => ({ ...prev, address_complement: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={form.address_neighborhood}
                        readOnly
                        className="bg-muted/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={form.address_city}
                        readOnly
                        className="bg-muted/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={form.address_state}
                        readOnly
                        className="bg-muted/50"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Data */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Dados Profissionais</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sector">Setor/Departamento</Label>
                      <Input
                        id="sector"
                        placeholder="Ex: Administrativo, TI, RH..."
                        value={form.sector}
                        onChange={(e) => setForm(prev => ({ ...prev, sector: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Cargo/Função</Label>
                      <Input
                        id="position"
                        placeholder="Ex: Analista, Gerente, Assistente..."
                        value={form.position}
                        onChange={(e) => setForm(prev => ({ ...prev, position: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Work Schedule */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Jornada de Trabalho</h3>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Label>Selecionar Jornada</Label>
                      <Select
                        value={form.work_schedule_id}
                        onValueChange={(value) => setForm(prev => ({ ...prev, work_schedule_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma jornada" />
                        </SelectTrigger>
                        <SelectContent>
                          {schedules.map((schedule) => (
                            <SelectItem key={schedule.id} value={schedule.id}>
                              {schedule.name} ({schedule.start_time} - {schedule.end_time})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowNewSchedule(!showNewSchedule)}
                        title="Adicionar nova jornada"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {showNewSchedule && (
                    <Card className="border-dashed">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Nova Jornada</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome da Jornada</Label>
                          <Input
                            placeholder="Ex: Turno Comercial"
                            value={newSchedule.name}
                            onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Entrada</Label>
                            <Input
                              type="time"
                              value={newSchedule.start_time}
                              onChange={(e) => setNewSchedule(prev => ({ ...prev, start_time: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Saída</Label>
                            <Input
                              type="time"
                              value={newSchedule.end_time}
                              onChange={(e) => setNewSchedule(prev => ({ ...prev, end_time: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Ent. Intervalo</Label>
                            <Input
                              type="time"
                              value={newSchedule.break_start_time}
                              onChange={(e) => setNewSchedule(prev => ({ ...prev, break_start_time: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Saí. Intervalo</Label>
                            <Input
                              type="time"
                              value={newSchedule.break_end_time}
                              onChange={(e) => setNewSchedule(prev => ({ ...prev, break_end_time: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Intervalo (min)</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="60"
                              value={newSchedule.break_duration_minutes}
                              onChange={(e) => setNewSchedule(prev => ({ ...prev, break_duration_minutes: e.target.value }))}
                            />
                          </div>
                        </div>
                        <Button onClick={handleCreateSchedule} size="sm" className="w-full">
                          Criar Jornada
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar Colaborador'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Colaboradores Cadastrados</CardTitle>
            <CardDescription>Lista de todos os colaboradores da empresa</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEmployees ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum colaborador cadastrado ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Jornada</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.full_name}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.sector || '-'}</TableCell>
                        <TableCell>{employee.position || '-'}</TableCell>
                        <TableCell>{getScheduleName(employee.work_schedule_id)}</TableCell>
                        <TableCell>
                          {employee.termination_date ? (
                            <Badge variant="destructive">Desligado</Badge>
                          ) : (
                            <Badge variant="default">Ativo</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default EmployeeManagement;
