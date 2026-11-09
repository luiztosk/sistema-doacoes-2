import { UFS } from "@/schemas/api/enums";

export type Uf = (typeof UFS)[number];

export type EnderecoViacep = {
	logradouro: string | null;
	bairro: string | null;
	cidade: string | null;
	uf: Uf | null;
};

type RespostaViacep = {
	logradouro?: string;
	bairro?: string;
	localidade?: string;
	uf?: string;
	erro?: boolean;
};

function textoOuNulo(valor: string | undefined): string | null {
	const texto = valor?.trim();
	return texto ? texto : null;
}

function ufOuNulo(valor: string | undefined): Uf | null {
	const texto = textoOuNulo(valor);
	if (!texto) {
		return null;
	}
	return (UFS as readonly string[]).includes(texto) ? (texto as Uf) : null;
}

export async function buscarEnderecoPorCep(
	cep: string,
): Promise<EnderecoViacep | null> {
	const digits = cep.replace(/\D/g, "");
	if (!/^\d{8}$/.test(digits)) {
		return null;
	}

	let response: Response;
	try {
		response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
	} catch {
		return null;
	}

	if (!response.ok) {
		return null;
	}

	const body = (await response.json()) as RespostaViacep;
	if (body.erro) {
		return null;
	}

	return {
		logradouro: textoOuNulo(body.logradouro),
		bairro: textoOuNulo(body.bairro),
		cidade: textoOuNulo(body.localidade),
		uf: ufOuNulo(body.uf),
	};
}
