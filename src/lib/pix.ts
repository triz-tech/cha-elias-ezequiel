function tlv(id: string, value: string) {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

function crc16ccitt(input: string) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Gera um Pix Copia e Cola estático/dinâmico simples para uma chave Pix.
 * O valor é incluído no payload para o QR já abrir com o valor da compra.
 */
export function buildPixPayload({
  key,
  name,
  city,
  amount,
  txid = "***"
}: {
  key: string;
  name: string;
  city: string;
  amount: number;
  txid?: string;
}) {
  if (!key) return "";
  const merchantName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 25);
  const merchantCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 15);
  const gui = tlv("00", "BR.GOV.BCB.PIX");
  const chave = tlv("01", key);
  const merchantAccount = tlv("26", gui + chave);
  const amountText = amount.toFixed(2);
  const additional = tlv("05", txid.slice(0, 25));
  const body =
    tlv("00", "01") +
    merchantAccount +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", amountText) +
    tlv("58", "BR") +
    tlv("59", merchantName) +
    tlv("60", merchantCity) +
    tlv("62", additional);
  return body + "6304" + crc16ccitt(body + "6304");
}
