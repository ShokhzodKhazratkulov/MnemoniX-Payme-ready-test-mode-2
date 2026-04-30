
export const generateLogoDataUrl = (size: number = 1080): string => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  
  // Rounded square
  const rectSize = size * 0.6;
  const x = (size - rectSize) / 2;
  const y = (size - rectSize) / 2;
  const radius = rectSize * 0.25;
  
  ctx.fillStyle = '#D97706'; // Accent color
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + rectSize - radius, y);
  ctx.quadraticCurveTo(x + rectSize, y, x + rectSize, y + radius);
  ctx.lineTo(x + rectSize, y + rectSize - radius);
  ctx.quadraticCurveTo(x + rectSize, y + rectSize, x + rectSize - radius, y + rectSize);
  ctx.lineTo(x + radius, y + rectSize);
  ctx.quadraticCurveTo(x, y + rectSize, x, y + rectSize - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  
  // Text "M"
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${rectSize * 0.6}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', size / 2, size / 2);
  
  return canvas.toDataURL('image/png');
};

export const downloadLogo = (size: number = 1080, filename: string = 'mnemonix-logo.png') => {
  const dataUrl = generateLogoDataUrl(size);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
