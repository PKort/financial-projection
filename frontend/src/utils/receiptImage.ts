const MAX_RECEIPT_EDGE = 1800;
const MAX_RECEIPT_BYTES = 900 * 1024;
const JPEG_QUALITIES = [0.85, 0.75, 0.65, 0.55];

export const prepareReceiptImage = async (file: File): Promise<Blob> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Wybrany plik nie jest obrazem.');
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_RECEIPT_EDGE / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Przeglądarka nie może przygotować zdjęcia.');

  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.filter = 'grayscale(1) contrast(1.2)';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  for (const quality of JPEG_QUALITIES) {
    const blob = await canvasToJpeg(canvas, quality);
    if (blob.size <= MAX_RECEIPT_BYTES || quality === JPEG_QUALITIES[JPEG_QUALITIES.length - 1]) {
      return blob;
    }
  }

  throw new Error('Nie udało się skompresować zdjęcia.');
};

const canvasToJpeg = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('Nie udało się przygotować zdjęcia.')),
    'image/jpeg',
    quality,
  );
});

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Nie udało się odczytać zdjęcia.'));
  };
  image.src = url;
});
