import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Loader2, Search } from 'lucide-react';

type LocationMode = 'disabled' | 'log_only' | 'require_exact' | 'require_radius';

interface LocationSettingsData {
  id: string;
  location_mode: LocationMode;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  allowed_radius_meters: number | null;
}

const LocationSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<LocationSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('location_settings')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching location settings:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar configurações',
        description: error.message,
      });
    } else if (data) {
      setSettings(data as LocationSettingsData);
    }
    setIsLoading(false);
  };

  const handleModeChange = (value: string) => {
    setSettings(prev => prev ? { ...prev, location_mode: value as LocationMode } : null);
  };

  const searchCep = async () => {
    if (!settings?.address_cep) return;

    const cep = settings.address_cep.replace(/\D/g, '');
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

      setSettings(prev => prev ? {
        ...prev,
        address_street: data.logradouro || '',
        address_neighborhood: data.bairro || '',
        address_city: data.localidade || '',
        address_state: data.uf || '',
      } : null);

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

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('location_settings')
      .update({
        location_mode: settings.location_mode,
        address_cep: settings.address_cep,
        address_street: settings.address_street,
        address_number: settings.address_number,
        address_complement: settings.address_complement,
        address_neighborhood: settings.address_neighborhood,
        address_city: settings.address_city,
        address_state: settings.address_state,
        allowed_radius_meters: settings.allowed_radius_meters,
      })
      .eq('id', settings.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } else {
      toast({
        title: 'Configurações salvas!',
        description: 'As configurações de localização foram atualizadas.',
      });
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Configurações de Localização
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-medium">Modo de Localização</Label>
          <RadioGroup
            value={settings?.location_mode || 'disabled'}
            onValueChange={handleModeChange}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="disabled" id="disabled" className="mt-1" />
              <div>
                <Label htmlFor="disabled" className="font-medium cursor-pointer">Desativado</Label>
                <p className="text-sm text-muted-foreground">
                  Não exigir localização para registrar ponto (ideal para trabalho remoto)
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="log_only" id="log_only" className="mt-1" />
              <div>
                <Label htmlFor="log_only" className="font-medium cursor-pointer">Registrar sem bloquear</Label>
                <p className="text-sm text-muted-foreground">
                  Registrar a localização, mas permitir o ponto mesmo fora do endereço
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="require_exact" id="require_exact" className="mt-1" />
              <div>
                <Label htmlFor="require_exact" className="font-medium cursor-pointer">Endereço exato</Label>
                <p className="text-sm text-muted-foreground">
                  Exigir que o colaborador esteja no endereço exato cadastrado
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="require_radius" id="require_radius" className="mt-1" />
              <div>
                <Label htmlFor="require_radius" className="font-medium cursor-pointer">Raio de distância</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir registro dentro de um raio de distância do endereço
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {(settings?.location_mode === 'require_exact' || settings?.location_mode === 'require_radius' || settings?.location_mode === 'log_only') && (
          <>
            <div className="border-t border-border pt-6 space-y-4">
              <Label className="text-base font-medium">Endereço da Empresa</Label>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cep"
                      placeholder="00000-000"
                      value={settings.address_cep || ''}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, address_cep: e.target.value } : null)}
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
                  value={settings.address_street || ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, address_street: e.target.value } : null)}
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
                    value={settings.address_number || ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, address_number: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    placeholder="Sala 101"
                    value={settings.address_complement || ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, address_complement: e.target.value } : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    placeholder="Bairro"
                    value={settings.address_neighborhood || ''}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="Cidade"
                    value={settings.address_city || ''}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  placeholder="UF"
                  value={settings.address_state || ''}
                  readOnly
                  className="bg-muted/50"
                  maxLength={2}
                />
              </div>
            </div>

            {settings?.location_mode === 'require_radius' && (
              <div className="space-y-2">
                <Label htmlFor="radius">Raio permitido (metros)</Label>
                <Input
                  id="radius"
                  type="number"
                  placeholder="100"
                  value={settings.allowed_radius_meters || 100}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, allowed_radius_meters: parseInt(e.target.value) || 100 } : null)}
                  min={10}
                  max={5000}
                />
                <p className="text-xs text-muted-foreground">
                  Define a distância máxima permitida do endereço cadastrado (entre 10 e 5000 metros)
                </p>
              </div>
            )}
          </>
        )}

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default LocationSettings;
