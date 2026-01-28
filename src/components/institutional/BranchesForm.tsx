import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Building2, MapPin } from 'lucide-react';
import { validateCNPJ, formatCNPJ, formatPhone } from '@/utils/cnpjValidation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BranchesFormProps {
  companyId: string;
  hasBranches: boolean;
}

interface Branch {
  id?: string;
  cnpj: string;
  address_cep: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  phone: string;
  whatsapp: string;
  financial_email: string;
}

const emptyBranch: Branch = {
  cnpj: '',
  address_cep: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  phone: '',
  whatsapp: '',
  financial_email: '',
};

const BranchesForm = ({ companyId, hasBranches }: BranchesFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch>(emptyBranch);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [cnpjError, setCnpjError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<number | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      if (!companyId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('company_branches')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        if (data) {
          setBranches(data.map(b => ({
            id: b.id,
            cnpj: formatCNPJ(b.cnpj || ''),
            address_cep: b.address_cep || '',
            address_street: b.address_street || '',
            address_number: b.address_number || '',
            address_complement: b.address_complement || '',
            address_neighborhood: b.address_neighborhood || '',
            address_city: b.address_city || '',
            address_state: b.address_state || '',
            phone: formatPhone(b.phone || ''),
            whatsapp: formatPhone(b.whatsapp || ''),
            financial_email: b.financial_email || '',
          })));
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [companyId]);

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    setCurrentBranch({ ...currentBranch, cnpj: formatted });
    
    const cleanCNPJ = value.replace(/\D/g, '');
    if (cleanCNPJ.length === 14) {
      if (!validateCNPJ(cleanCNPJ)) {
        setCnpjError('CNPJ inválido');
      } else {
        setCnpjError('');
      }
    } else {
      setCnpjError('');
    }
  };

  const handleCEPChange = async (value: string) => {
    const cleanCEP = value.replace(/\D/g, '');
    const formattedCEP = cleanCEP.length > 5 
      ? `${cleanCEP.slice(0, 5)}-${cleanCEP.slice(5, 8)}`
      : cleanCEP;
    
    setCurrentBranch({ ...currentBranch, address_cep: formattedCEP });

    if (cleanCEP.length === 8) {
      setFetchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setCurrentBranch(prev => ({
            ...prev,
            address_cep: formattedCEP,
            address_street: data.logradouro || '',
            address_neighborhood: data.bairro || '',
            address_city: data.localidade || '',
            address_state: data.uf || '',
          }));
        }
      } catch (error) {
        console.error('Error fetching CEP:', error);
      } finally {
        setFetchingCep(false);
      }
    }
  };

  const handleSaveBranch = async () => {
    const cleanCNPJ = currentBranch.cnpj.replace(/\D/g, '');
    if (!validateCNPJ(cleanCNPJ)) {
      setCnpjError('CNPJ inválido');
      return;
    }

    setLoading(true);
    try {
      const branchData = {
        company_id: companyId,
        cnpj: cleanCNPJ,
        address_cep: currentBranch.address_cep.replace(/\D/g, '') || null,
        address_street: currentBranch.address_street || null,
        address_number: currentBranch.address_number || null,
        address_complement: currentBranch.address_complement || null,
        address_neighborhood: currentBranch.address_neighborhood || null,
        address_city: currentBranch.address_city || null,
        address_state: currentBranch.address_state || null,
        phone: currentBranch.phone.replace(/\D/g, '') || null,
        whatsapp: currentBranch.whatsapp.replace(/\D/g, '') || null,
        financial_email: currentBranch.financial_email || null,
      };

      if (editingIndex !== null && branches[editingIndex]?.id) {
        const { error } = await supabase
          .from('company_branches')
          .update(branchData)
          .eq('id', branches[editingIndex].id);

        if (error) throw error;

        const updatedBranches = [...branches];
        updatedBranches[editingIndex] = { ...currentBranch, id: branches[editingIndex].id };
        setBranches(updatedBranches);
        
        toast({
          title: 'Filial atualizada',
          description: 'Os dados da filial foram atualizados com sucesso',
        });
      } else {
        const { data, error } = await supabase
          .from('company_branches')
          .insert(branchData)
          .select('id')
          .single();

        if (error) throw error;

        setBranches([...branches, { ...currentBranch, id: data.id }]);
        
        toast({
          title: 'Filial cadastrada',
          description: 'A filial foi adicionada com sucesso',
        });
      }

      setCurrentBranch(emptyBranch);
      setEditingIndex(null);
      setCnpjError('');
    } catch (error: any) {
      console.error('Error saving branch:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar a filial',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditBranch = (index: number) => {
    setCurrentBranch(branches[index]);
    setEditingIndex(index);
  };

  const handleDeleteBranch = async () => {
    if (branchToDelete === null) return;
    
    const branch = branches[branchToDelete];
    if (!branch.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_branches')
        .delete()
        .eq('id', branch.id);

      if (error) throw error;

      setBranches(branches.filter((_, i) => i !== branchToDelete));
      toast({
        title: 'Filial excluída',
        description: 'A filial foi removida com sucesso',
      });
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir a filial',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setBranchToDelete(null);
    }
  };

  if (!hasBranches) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Você indicou que não possui filiais. Para cadastrar filiais, 
            volte à aba "Dados da Empresa" e selecione "Sim" na pergunta sobre filiais.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* List of existing branches */}
      {branches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Filiais Cadastradas</CardTitle>
            <CardDescription>
              {branches.length} filial(is) registrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {branches.map((branch, index) => (
              <div
                key={branch.id || index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{branch.cnpj}</p>
                  <p className="text-sm text-muted-foreground">
                    {branch.address_city && branch.address_state
                      ? `${branch.address_city} - ${branch.address_state}`
                      : 'Endereço não informado'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditBranch(index)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setBranchToDelete(index);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Branch form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {editingIndex !== null ? 'Editar Filial' : 'Nova Filial'}
          </CardTitle>
          <CardDescription>
            Preencha os dados da filial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch_cnpj">CNPJ da Filial *</Label>
              <Input
                id="branch_cnpj"
                value={currentBranch.cnpj}
                onChange={(e) => handleCNPJChange(e.target.value)}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
              {cnpjError && (
                <p className="text-sm text-destructive">{cnpjError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_cep">CEP</Label>
              <div className="relative">
                <Input
                  id="branch_cep"
                  value={currentBranch.address_cep}
                  onChange={(e) => handleCEPChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {fetchingCep && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="branch_street">Logradouro</Label>
              <Input
                id="branch_street"
                value={currentBranch.address_street}
                onChange={(e) => setCurrentBranch({ ...currentBranch, address_street: e.target.value })}
                placeholder="Rua, Avenida, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_number">Número</Label>
              <Input
                id="branch_number"
                value={currentBranch.address_number}
                onChange={(e) => setCurrentBranch({ ...currentBranch, address_number: e.target.value })}
                placeholder="123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_complement">Complemento</Label>
              <Input
                id="branch_complement"
                value={currentBranch.address_complement}
                onChange={(e) => setCurrentBranch({ ...currentBranch, address_complement: e.target.value })}
                placeholder="Sala, Andar, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_neighborhood">Bairro</Label>
              <Input
                id="branch_neighborhood"
                value={currentBranch.address_neighborhood}
                onChange={(e) => setCurrentBranch({ ...currentBranch, address_neighborhood: e.target.value })}
                placeholder="Bairro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_city">Cidade</Label>
              <Input
                id="branch_city"
                value={currentBranch.address_city}
                onChange={(e) => setCurrentBranch({ ...currentBranch, address_city: e.target.value })}
                placeholder="Cidade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_state">UF</Label>
              <Input
                id="branch_state"
                value={currentBranch.address_state}
                onChange={(e) => setCurrentBranch({ ...currentBranch, address_state: e.target.value.toUpperCase() })}
                placeholder="UF"
                maxLength={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="branch_phone">Telefone Comercial</Label>
              <Input
                id="branch_phone"
                value={currentBranch.phone}
                onChange={(e) => setCurrentBranch({ ...currentBranch, phone: formatPhone(e.target.value) })}
                placeholder="(00) 0000-0000"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_whatsapp">WhatsApp</Label>
              <Input
                id="branch_whatsapp"
                value={currentBranch.whatsapp}
                onChange={(e) => setCurrentBranch({ ...currentBranch, whatsapp: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_email">E-mail Financeiro</Label>
              <Input
                id="branch_email"
                type="email"
                value={currentBranch.financial_email}
                onChange={(e) => setCurrentBranch({ ...currentBranch, financial_email: e.target.value })}
                placeholder="financeiro@filial.com"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {editingIndex !== null && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCurrentBranch(emptyBranch);
                  setEditingIndex(null);
                  setCnpjError('');
                }}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSaveBranch}
              disabled={loading || !!cnpjError || !currentBranch.cnpj}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : editingIndex !== null ? (
                'Atualizar Filial'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Filial
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir filial?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A filial será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBranch}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BranchesForm;
