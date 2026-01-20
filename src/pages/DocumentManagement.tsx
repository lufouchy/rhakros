import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  FileText,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type DocumentStatus = 'pending_signature' | 'signed' | 'expired';

interface Document {
  id: string;
  user_id: string;
  document_type: string;
  title: string;
  reference_month: string;
  status: DocumentStatus;
  signed_at: string | null;
  expires_at: string | null;
  created_at: string;
  userName?: string;
  userEmail?: string;
}

const statusConfig: Record<DocumentStatus, { label: string; className: string; icon: typeof Clock }> = {
  pending_signature: {
    label: 'Aguardando assinatura',
    className: 'bg-warning/10 text-warning border-warning/20',
    icon: Clock,
  },
  signed: {
    label: 'Ativo',
    className: 'bg-success/10 text-success border-success/20',
    icon: CheckCircle,
  },
  expired: {
    label: 'Vencido',
    className: 'bg-muted text-muted-foreground border-muted',
    icon: AlertTriangle,
  },
};

const DocumentManagement = () => {
  const { user, userRole, loading } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch user profiles
      const userIds = [...new Set(data.map((d) => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, { name: p.full_name, email: p.email }]) || []
      );

      setDocuments(
        data.map((d) => ({
          ...d,
          status: d.status as DocumentStatus,
          userName: profileMap.get(d.user_id)?.name || 'Usuário',
          userEmail: profileMap.get(d.user_id)?.email || '',
        }))
      );
    }
    setIsLoading(false);
  };

  const getExpirationInfo = (expiresAt: string | null, status: DocumentStatus) => {
    if (!expiresAt || status === 'expired') return null;
    const days = differenceInDays(parseISO(expiresAt), new Date());
    if (days < 0) return 'Vencido';
    if (days === 0) return 'Vence hoje';
    return `Vence em ${days} dias`;
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const pendingCount = documents.filter((d) => d.status === 'pending_signature').length;
  const expiredCount = documents.filter((d) => d.status === 'expired').length;
  const expiringCount = documents.filter((d) => {
    if (!d.expires_at || d.status !== 'signed') return false;
    const days = differenceInDays(parseISO(d.expires_at), new Date());
    return days > 0 && days <= 60;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Documentos</h1>
            <p className="text-muted-foreground">
              Gerencie os espelhos de ponto assinados dos colaboradores
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar documento
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-warning/10">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documentos a vencer</p>
                <p className="text-3xl font-bold text-foreground">{expiringCount}</p>
                <button className="text-sm text-primary hover:underline">Ver detalhes</button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documentos vencidos</p>
                <p className="text-3xl font-bold text-foreground">{expiredCount}</p>
                <button className="text-sm text-primary hover:underline">Ver detalhes</button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aguardando assinatura</p>
                <p className="text-3xl font-bold text-foreground">{pendingCount}</p>
                <button className="text-sm text-primary hover:underline">Ver detalhes</button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Buscar documentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pessoa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending_signature">Aguardando assinatura</SelectItem>
                  <SelectItem value="signed">Ativo</SelectItem>
                  <SelectItem value="expired">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-1">
                  Nenhum documento encontrado
                </p>
                <p className="text-muted-foreground text-sm">
                  Os espelhos de ponto assinados aparecerão aqui.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo do documento</TableHead>
                    <TableHead>Status do documento</TableHead>
                    <TableHead>Pessoa associada</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => {
                    const StatusIcon = statusConfig[doc.status].icon;
                    const expirationInfo = getExpirationInfo(doc.expires_at, doc.status);

                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            Espelho de ponto
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge className={statusConfig[doc.status].className}>
                              {statusConfig[doc.status].label}
                            </Badge>
                            {expirationInfo && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {expirationInfo}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {doc.userName?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{doc.userName}</p>
                              <p className="text-xs text-muted-foreground">{doc.userEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(doc.reference_month), "MMMM 'de' yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="gap-1.5">
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DocumentManagement;
