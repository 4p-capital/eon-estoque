// Leitura de um certificado A1 (PKCS#12 / .pfx) para extrair os metadados que
// o cadastro precisa — sem o usuário digitar nada. Como `pkcs12FromAsn1` exige
// a senha correta, isto também SERVE DE VALIDAÇÃO: senha errada -> exceção.
//
// O CNPJ e a razão social de um e-CNPJ ICP-Brasil vêm no CN do titular no
// formato "RAZAO SOCIAL:CNPJ" (14 dígitos). A validade é o notAfter do cert.

import forge from "node-forge";

export type DadosCertificado = {
  cnpj: string; // 14 dígitos
  razaoSocial: string;
  validade: string; // YYYY-MM-DD (notAfter)
};

export function lerCertificado(pfx: Buffer, senha: string): DadosCertificado {
  const p12Der = forge.util.createBuffer(pfx.toString("binary"));
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);

  const cert = extrairCertificadoTitular(p12);
  const cn = String(cert.subject.getField("CN")?.value ?? "");

  return {
    cnpj: extrairCnpj(cn, cert),
    razaoSocial: cn.replace(/:\d{14}$/, "").trim() || cn,
    validade: cert.validity.notAfter.toISOString().slice(0, 10),
  };
}

// O .pfx traz o cert do titular + cadeia (CA). O titular é o que tem ":CNPJ" no CN.
function extrairCertificadoTitular(
  p12: forge.pkcs12.Pkcs12Pfx,
): forge.pki.Certificate {
  const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certs = (bags[forge.pki.oids.certBag] ?? [])
    .map((bag) => bag.cert)
    .filter((cert): cert is forge.pki.Certificate => Boolean(cert));

  if (certs.length === 0) {
    throw new Error("Certificado sem certificado utilizável no .pfx.");
  }

  const titular = certs.find((cert) =>
    /:\d{14}$/.test(String(cert.subject.getField("CN")?.value ?? "")),
  );
  return titular ?? certs[0];
}

function extrairCnpj(cn: string, cert: forge.pki.Certificate): string {
  const doCn = cn.match(/:(\d{14})$/);
  if (doCn) {
    return doCn[1];
  }
  for (const attr of cert.subject.attributes) {
    const encontrado = String(attr.value ?? "").match(/\b\d{14}\b/);
    if (encontrado) {
      return encontrado[0];
    }
  }
  throw new Error("Não foi possível extrair o CNPJ do certificado.");
}
