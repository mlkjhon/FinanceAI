/*
 * Foto de perfil: recorta o centro em quadrado e reduz para 256x256 no próprio
 * navegador (JPEG ~85%). Fica com poucos KB, então pode ir direto para o banco.
 */
const LADO = 256;
const MAX_ARQUIVO = 15 * 1024 * 1024; // 15 MB antes de reduzir

export async function prepararFoto(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith('image/')) {
    throw new Error('Escolha uma imagem (JPG, PNG ou WebP).');
  }
  if (arquivo.size > MAX_ARQUIVO) throw new Error('Imagem grande demais (máximo 15 MB).');

  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error('Não deu para abrir essa imagem. Tente outra (JPG ou PNG).'));
      i.src = url;
    });
    const lado = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - lado) / 2;
    const sy = (img.naturalHeight - lado) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = LADO;
    canvas.height = LADO;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO, LADO);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
