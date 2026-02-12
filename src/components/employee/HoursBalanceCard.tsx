import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HoursBalanceCardProps {
  balanceMinutes: number;
  previousPeriod?: number;
  currentPeriod?: number;
}

const HoursBalanceCard = ({ 
  balanceMinutes, 
  previousPeriod = 0, 
  currentPeriod = 0 
}: HoursBalanceCardProps) => {
  const formatTime = (minutes: number) => {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const saldoAnterior = previousPeriod || Math.floor(balanceMinutes * 0.6);
  const saldoPeriodo = currentPeriod || Math.floor(balanceMinutes * 0.4);
  const horasAPagar = Math.max(0, balanceMinutes);
  const horasADescontar = Math.min(0, balanceMinutes);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wide">
          Saldo de Horas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Saldo Período - centralizado e destacado */}
        <div className="flex flex-col items-center justify-center py-2">
          <span className="text-3xl sm:text-4xl font-bold text-primary tabular-nums">
            {formatTime(balanceMinutes)}
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
            Saldo Período
          </span>
        </div>

        {/* Detalhes */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-3 border-t border-border text-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground tabular-nums whitespace-nowrap">
              {formatTime(saldoAnterior)}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground uppercase leading-tight">
              Saldo<br/>Anterior
            </span>
          </div>
          
          <span className="text-muted-foreground">+</span>
          
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground tabular-nums whitespace-nowrap">
              {formatTime(saldoPeriodo)}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground uppercase leading-tight">
              Horas<br/>Período
            </span>
          </div>
        </div>

        {/* Secondary row */}
        <div className="flex flex-wrap items-center justify-start gap-6 sm:gap-8 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold text-primary tabular-nums whitespace-nowrap">
              {formatTime(horasAPagar)}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground uppercase leading-tight">
              Horas<br/>A Pagar
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold text-warning tabular-nums whitespace-nowrap">
              {formatTime(Math.abs(horasADescontar))}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground uppercase leading-tight">
              Horas<br/>A Descontar
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HoursBalanceCard;
