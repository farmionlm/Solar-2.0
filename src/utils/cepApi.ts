export interface CepAddressResult {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  cityDisplay: string;
  erro?: boolean;
}

/**
 * Busca endereço completo a partir de um CEP (8 dígitos) via ViaCEP API.
 */
export async function fetchAddressByCep(cep: string): Promise<CepAddressResult | null> {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.erro) {
      return { logradouro: "", bairro: "", localidade: "", uf: "", cityDisplay: "", erro: true };
    }

    const cityDisplay = data.localidade && data.uf ? `${data.localidade} / ${data.uf}` : data.localidade || "";

    return {
      logradouro: data.logradouro || "",
      bairro: data.bairro || "",
      localidade: data.localidade || "",
      uf: data.uf || "",
      cityDisplay,
      erro: false,
    };
  } catch (err) {
    console.error("Erro ao buscar CEP no ViaCEP:", err);
    return null;
  }
}
