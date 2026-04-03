export interface CepResult {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export async function lookupCep(rawCep: string): Promise<CepResult> {
  const digits = rawCep.replace(/\D/g, '');
  if (digits.length !== 8) throw new Error('CEP deve ter 8 digitos');

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) throw new Error('Erro ao consultar CEP');

  const data = await res.json();
  if (data.erro) throw new Error('CEP nao encontrado');

  return data as CepResult;
}
