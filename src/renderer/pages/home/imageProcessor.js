// Web Worker for image processing
self.onmessage = function(e) {
    const { imageData, settings, width, height } = e.data;

    try {
        const result = processImage(imageData, settings, width, height);
        self.postMessage({ success: true, data: result });
    } catch (error) {
        self.postMessage({ success: false, error: error.message });
    }
};

function processImage(data, settings, width, height) {
    // Create typed arrays for processing
    const grayscale = new Float32Array(width * height);
    const edges = new Float32Array(width * height);
    const finalData = new Uint8ClampedArray(data.length);

    // Enhanced grayscale conversion with gamma correction
    const gamma = 2.2;
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        // Apply gamma correction for better contrast
        const r = Math.pow(data[i] / 255, gamma);
        const g = Math.pow(data[i + 1] / 255, gamma);
        const b = Math.pow(data[i + 2] / 255, gamma);
        
        // Enhanced grayscale conversion with human perception weights
        let gray = (r * 0.2126 + g * 0.7152 + b * 0.0722);
        
        // Apply brightness with gamma correction
        gray = Math.pow(gray, 1 / gamma) * 255;
        gray += settings.brightness;

        // Apply contrast with enhanced algorithm
        const factor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));
        gray = factor * (gray - 128) + 128;

        grayscale[j] = Math.max(0, Math.min(255, gray));
    }

    // Apply advanced noise reduction if enabled
    if (settings.denoise > 0) {
        const radius = Math.max(1, Math.ceil(settings.denoise * 3));
        const sigma = settings.denoise * 2;
        applyGaussianBlur(grayscale, width, height, radius, sigma);
    }

    // Enhanced edge detection with multiple operators
    const sensitivity = settings.sensitivity * 1.5;
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;

            // Sobel operator
            const gx = applySobelX(grayscale, x, y, width);
            const gy = applySobelY(grayscale, x, y, width);
            
            // Calculate gradient magnitude
            let magnitude = Math.sqrt(gx * gx + gy * gy) * sensitivity;

            // Apply non-maximum suppression
            const angle = Math.atan2(gy, gx) * (180 / Math.PI);
            magnitude = nonMaxSuppression(magnitude, angle, x, y, edges, width);

            if (settings.enhanceDetails) {
                // Add Laplacian operator for fine detail enhancement
                const laplacian = applyLaplacian(grayscale, x, y, width);
                magnitude += Math.abs(laplacian) * settings.detailLevel;
            }

            edges[i] = magnitude;
        }
    }

    // Apply advanced line smoothing
    if (settings.lineSmoothing > 0) {
        const smoothRadius = Math.max(1, Math.ceil(settings.lineSmoothing * 2));
        const sigma = settings.lineSmoothing;
        applyGaussianBlur(edges, width, height, smoothRadius, sigma);
    }

    // Apply hysteresis thresholding for better line connectivity
    const highThreshold = settings.threshold;
    const lowThreshold = highThreshold * 0.5;
    applyHysteresisThresholding(edges, finalData, width, height, lowThreshold, highThreshold);

    // Apply line thickness with anti-aliasing
    if (settings.lineThickness > 1) {
        applyAntiAliasedThickness(finalData, width, height, settings.lineThickness);
    }

    // Apply final adjustments
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const value = settings.invertColors ? 255 - finalData[idx] : finalData[idx];
        
        if (settings.preserveShading) {
            const shade = Math.max(0, Math.min(255, grayscale[i]));
            const lineIntensity = value === 0 ? 0 : Math.max(value * 0.15, shade * 0.85);
            finalData[idx] = finalData[idx + 1] = finalData[idx + 2] = lineIntensity;
        } else {
            finalData[idx] = finalData[idx + 1] = finalData[idx + 2] = value;
        }
        finalData[idx + 3] = 255;
    }

    return finalData;
}

// Helper functions
function applySobelX(data, x, y, width) {
    return -data[(y - 1) * width + (x - 1)] + data[(y - 1) * width + (x + 1)] +
           -2 * data[y * width + (x - 1)] + 2 * data[y * width + (x + 1)] +
           -data[(y + 1) * width + (x - 1)] + data[(y + 1) * width + (x + 1)];
}

function applySobelY(data, x, y, width) {
    return -data[(y - 1) * width + (x - 1)] - 2 * data[(y - 1) * width + x] - data[(y - 1) * width + (x + 1)] +
            data[(y + 1) * width + (x - 1)] + 2 * data[(y + 1) * width + x] + data[(y + 1) * width + (x + 1)];
}

function applyLaplacian(data, x, y, width) {
    return -data[(y - 1) * width + x] +
           -data[y * width + (x - 1)] + 4 * data[y * width + x] - data[y * width + (x + 1)] +
           -data[(y + 1) * width + x];
}

function nonMaxSuppression(magnitude, angle, x, y, edges, width) {
    const dir = Math.round(((angle + 180) % 180) / 45) % 4;
    const i = y * width + x;
    
    let prev = 0;
    let next = 0;

    switch (dir) {
        case 0: // 0 degrees
            prev = edges[i - 1];
            next = edges[i + 1];
            break;
        case 1: // 45 degrees
            prev = edges[(y - 1) * width + (x - 1)];
            next = edges[(y + 1) * width + (x + 1)];
            break;
        case 2: // 90 degrees
            prev = edges[(y - 1) * width + x];
            next = edges[(y + 1) * width + x];
            break;
        case 3: // 135 degrees
            prev = edges[(y - 1) * width + (x + 1)];
            next = edges[(y + 1) * width + (x - 1)];
            break;
    }

    return (magnitude >= prev && magnitude >= next) ? magnitude : 0;
}

function createGaussianKernel(radius, sigma) {
    const size = 2 * radius + 1;
    const kernel = new Float32Array(size);
    let sum = 0;

    for (let i = 0; i < size; i++) {
        const x = i - radius;
        kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
        sum += kernel[i];
    }

    // Normalize kernel
    for (let i = 0; i < size; i++) {
        kernel[i] /= sum;
    }

    return kernel;
}

function applyGaussianBlur(data, width, height, radius, sigma) {
    const kernel = createGaussianKernel(radius, sigma);
    const temp = new Float32Array(data.length);
    const size = 2 * radius + 1;

    // Horizontal pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let k = -radius; k <= radius; k++) {
                const px = Math.min(Math.max(x + k, 0), width - 1);
                sum += data[y * width + px] * kernel[k + radius];
            }
            temp[y * width + x] = sum;
        }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let sum = 0;
            for (let k = -radius; k <= radius; k++) {
                const py = Math.min(Math.max(y + k, 0), height - 1);
                sum += temp[py * width + x] * kernel[k + radius];
            }
            data[y * width + x] = sum;
        }
    }
}

function applyHysteresisThresholding(edges, output, width, height, lowThreshold, highThreshold) {
    const visited = new Uint8Array(width * height);
    
    // First pass: mark strong edges
    for (let i = 0; i < edges.length; i++) {
        const idx = i * 4;
        if (edges[i] >= highThreshold) {
            output[idx] = output[idx + 1] = output[idx + 2] = 0;
            visited[i] = 2; // Strong edge
        } else if (edges[i] >= lowThreshold) {
            visited[i] = 1; // Weak edge
            output[idx] = output[idx + 1] = output[idx + 2] = 255;
        } else {
            visited[i] = 0; // Non-edge
            output[idx] = output[idx + 1] = output[idx + 2] = 255;
        }
    }

    // Second pass: trace weak edges connected to strong edges
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;
            if (visited[i] === 1) {
                if (hasStrongNeighbor(visited, x, y, width)) {
                    const idx = i * 4;
                    output[idx] = output[idx + 1] = output[idx + 2] = 0;
                }
            }
        }
    }
}

function hasStrongNeighbor(visited, x, y, width) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (visited[(y + dy) * width + (x + dx)] === 2) {
                return true;
            }
        }
    }
    return false;
}

function applyAntiAliasedThickness(data, width, height, thickness) {
    const temp = new Uint8ClampedArray(data.length);
    temp.set(data);
    
    const radius = Math.ceil(thickness / 2);
    const radiusSquared = radius * radius;

    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            const centerIdx = (y * width + x) * 4;
            if (data[centerIdx] === 0) {
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const distance = dx * dx + dy * dy;
                        if (distance <= radiusSquared) {
                            const idx = ((y + dy) * width + (x + dx)) * 4;
                            const alpha = 1 - Math.sqrt(distance) / radius;
                            temp[idx] = temp[idx + 1] = temp[idx + 2] = 
                                Math.min(temp[idx], 255 * (1 - alpha));
                        }
                    }
                }
            }
        }
    }
    
    data.set(temp);
}
