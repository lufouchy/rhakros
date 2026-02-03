import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2 } from 'lucide-react';
import { generateVacationReceiptPDF, downloadVacationReceiptPDF } from './VacationReceiptPDF';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VacationReceiptExportProps {
  vacationId: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  daysCount: number;
}

const VacationReceiptExport = ({
  vacationId,
  userId,
  userName,
  startDate,
  endDate,
  daysCount,
}: VacationReceiptExportProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);

    try {
      // Fetch employee profile for CPF
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, cpf')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch company info
      const { data: companyData, error: companyError } = await supabase
        .from('company_info')
        .select('logo_url, cnpj, nome_fantasia, address_city, address_state')
        .limit(1)
        .single();

      if (companyError && companyError.code !== 'PGRST116') {
        throw companyError;
      }

      const pdf = await generateVacationReceiptPDF({
        companyInfo: companyData,
        employeeInfo: {
          full_name: profileData.full_name || userName,
          cpf: profileData.cpf,
        },
        vacationData: {
          start_date: startDate,
          end_date: endDate,
          days_count: daysCount,
        },
      });

      const filename = `recibo-ferias-${userName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(startDate), 'yyyy-MM')}.pdf`;
      downloadVacationReceiptPDF(pdf, filename);

      toast({
        title: 'Recibo exportado!',
        description: `Recibo de férias de ${userName} exportado com sucesso.`,
      });

      setOpen(false);
    } catch (error: any) {
      console.error('Error generating vacation receipt:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao exportar',
        description: error.message || 'Erro ao gerar recibo de férias.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Exportar Recibo de Férias">
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Exportar Recibo de Férias
          </DialogTitle>
          <DialogDescription>
            Gere o recibo de férias de {userName} em PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-sm">
              <span className="font-medium">Colaborador:</span> {userName}
            </p>
            <p className="text-sm">
              <span className="font-medium">Período:</span>{' '}
              {format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })} a{' '}
              {format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
            <p className="text-sm">
              <span className="font-medium">Dias:</span> {daysCount}
            </p>
          </div>

          <Button onClick={handleExport} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Exportar Recibo PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VacationReceiptExport;
