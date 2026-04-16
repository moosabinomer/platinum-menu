export async function extractThemeColors(imageFile: File): Promise<string[]> {
  try {
    // Create an image element to load the file
    const img = new Image();
    const imageUrl = URL.createObjectURL(imageFile);
    
    // Load the image
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    // Create a canvas to get image data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Set canvas size to match image
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Draw image on canvas
    ctx.drawImage(img, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Clean up
    URL.revokeObjectURL(imageUrl);
    
    // Extract colors using a simple color quantization algorithm
    const colors = extractDominantColors(imageData.data, 3);
    
    return colors;
  } catch (error) {
    console.error('Error extracting colors:', error);
    // Return default colors if extraction fails
    return ['#1a1a2e', '#e94560', '#f5a623'];
  }
}

function extractDominantColors(imageData: Uint8ClampedArray, numColors: number): string[] {
  // Simple color quantization using k-means clustering
  const pixels: number[][] = [];
  
  // Sample every 10th pixel to reduce computation
  for (let i = 0; i < imageData.length; i += 40) { // 4 channels (RGBA) * 10 pixels
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];
    
    // Skip transparent pixels
    if (a < 128) continue;
    
    pixels.push([r, g, b]);
  }
  
  if (pixels.length === 0) {
    return ['#1a1a2e', '#e94560', '#f5a623'];
  }
  
  // Initialize centroids randomly from existing pixels
  const centroids: number[][] = [];
  const usedIndices = new Set<number>();
  
  while (centroids.length < Math.min(numColors, pixels.length)) {
    const randomIndex = Math.floor(Math.random() * pixels.length);
    if (!usedIndices.has(randomIndex)) {
      usedIndices.add(randomIndex);
      centroids.push([...pixels[randomIndex]]);
    }
  }
  
  // K-means clustering
  for (let iteration = 0; iteration < 10; iteration++) {
    // Assign pixels to nearest centroid
    const clusters: number[][][] = Array(numColors).fill(null).map(() => []);
    
    for (const pixel of pixels) {
      let minDistance = Infinity;
      let closestCentroid = 0;
      
      for (let i = 0; i < centroids.length; i++) {
        const distance = Math.sqrt(
          Math.pow(pixel[0] - centroids[i][0], 2) +
          Math.pow(pixel[1] - centroids[i][1], 2) +
          Math.pow(pixel[2] - centroids[i][2], 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = i;
        }
      }
      
      clusters[closestCentroid].push(pixel);
    }
    
    // Update centroids
    for (let i = 0; i < centroids.length; i++) {
      if (clusters[i].length === 0) continue;
      
      const sum = clusters[i].reduce((acc, pixel) => [
        acc[0] + pixel[0],
        acc[1] + pixel[1],
        acc[2] + pixel[2]
      ], [0, 0, 0]);
      
      centroids[i] = [
        Math.round(sum[0] / clusters[i].length),
        Math.round(sum[1] / clusters[i].length),
        Math.round(sum[2] / clusters[i].length)
      ];
    }
  }
  
  // Convert centroids to hex colors and sort by dominance
  const hexColors = centroids.map(centroid => {
    const [r, g, b] = centroid;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  });
  
  // Sort colors by brightness and ensure good contrast
  return hexColors.sort((a, b) => {
    const brightnessA = getBrightness(a);
    const brightnessB = getBrightness(b);
    return brightnessB - brightnessA;
  });
}

function getBrightness(hexColor: string): number {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}
