// DOM Elements
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const previewImage = document.getElementById("previewImage");
const dropZone = document.getElementById("dropZone");
const previewContainer = document.getElementById("previewContainer");
const settingsSidebar = document.getElementById("settingsSidebar");
const toggleSidebarBtn = document.getElementById("toggleSidebar");

// Settings Elements
const lineThicknessInput = document.getElementById("lineThickness");
const detailLevelInput = document.getElementById("detailLevel");
const contrastInput = document.getElementById("contrast");
const thresholdInput = document.getElementById("threshold");
const sensitivityInput = document.getElementById("sensitivity");
const lineSmoothingInput = document.getElementById("lineSmoothing");
const brightnessInput = document.getElementById("brightness");
const denoiseInput = document.getElementById("denoise");
const invertColorsInput = document.getElementById("invertColors");
const enhanceDetailsInput = document.getElementById("enhanceDetails");
const preserveShadingInput = document.getElementById("preserveShading");

// Initialize collapsible sections
document.querySelectorAll(".section-header").forEach((header) => {
  header.addEventListener("click", () => {
    const section = header.parentElement;
    section.classList.toggle("collapsed");
    const button = header.querySelector(".toggle-section");
    button.style.transform = section.classList.contains("collapsed")
      ? "rotate(-90deg)"
      : "";
  });
});

// Toggle sidebar
toggleSidebarBtn.addEventListener("click", () => {
  settingsSidebar.classList.toggle("collapsed");
});

// Current state
let currentImage = null;
let processedImage = null;
let isProcessing = false;
let processingTimeout = null;

// Create offscreen canvases for double buffering
const processCanvas = document.createElement("canvas");
const processCtx = processCanvas.getContext("2d");
const displayCanvas = document.createElement("canvas");
const displayCtx = displayCanvas.getContext("2d");

// Create Web Worker for image processing
const worker = new Worker("./imageProcessor.js");

worker.onmessage = function (e) {
  const { success, data, error } = e.data;

  if (success) {
    // Update the process canvas first
    const processedImageData = new ImageData(
      data,
      processCanvas.width,
      processCanvas.height
    );
    processCtx.putImageData(processedImageData, 0, 0);

    // Create a temporary image to ensure smooth transition
    const tempImg = new Image();
    tempImg.onload = () => {
      // Clear display canvas
      displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
      // Draw new image
      displayCtx.drawImage(tempImg, 0, 0);
      // Update preview with the completed image
      processedImage = displayCanvas.toDataURL("image/png");

      // Update the processed image preview
      previewImage.src = processedImage;
      previewImage.style.display = "block";

      // Make sure original image is visible
      const originalImage = document.getElementById("originalImage");
      originalImage.style.display = "block";

      // Reset comparison slider to middle if not already initialized
      const originalWrapper = document.querySelector(".image-wrapper.original");
      const slider = document.getElementById("comparisonSlider");
      if (!originalWrapper.style.clipPath) {
        originalWrapper.style.clipPath = "inset(0 50% 0 0)";
        slider.style.left = "50%";
      }

      downloadBtn.disabled = false;
      resetBtn.disabled = false;

      isProcessing = false;
      previewContainer.classList.remove("loading");
    };
    tempImg.src = processCanvas.toDataURL("image/png");
  } else {
    console.error("Worker error:", error);
    showError("Failed to process image: " + error);
    isProcessing = false;
    previewContainer.classList.remove("loading");
  }
};

// Default settings
const defaultSettings = {
  lineThickness: 1.2, // Slightly thicker lines by default
  detailLevel: 0.65, // Increased detail preservation
  contrast: 1.2, // Enhanced contrast
  threshold: 100, // Lower threshold for more line detection
  sensitivity: 3.5, // Reduced sensitivity for cleaner lines
  lineSmoothing: 0.3, // Subtle smoothing
  brightness: 10, // Slight brightness boost
  denoise: 0.4, // Moderate noise reduction
  invertColors: false,
  enhanceDetails: true, // Enable detail enhancement by default
  preserveShading: false,
};

// Initialize settings
function initializeSettings() {
  Object.entries(defaultSettings).forEach(([key, value]) => {
    const input = document.getElementById(key);
    if (input) {
      if (input.type === "checkbox") {
        input.checked = value;
      } else {
        input.value = value;
        const display = input.nextElementSibling;
        if (display) display.textContent = value;
      }
    }
  });
}

// Reset settings
resetBtn.addEventListener("click", () => {
  initializeSettings();
  if (currentImage) {
    scheduleConversion();
  }
});

// Update value displays for sliders and schedule conversion
const sliders = document.querySelectorAll('input[type="range"]');
sliders.forEach((slider) => {
  const display = slider.nextElementSibling;
  slider.addEventListener("input", () => {
    display.textContent = slider.value;
    scheduleConversion();
  });
});

// Checkbox change handlers
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
checkboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    scheduleConversion();
  });
});

// Schedule conversion with debounce
function scheduleConversion() {
  if (processingTimeout) {
    clearTimeout(processingTimeout);
  }
  processingTimeout = setTimeout(() => {
    if (currentImage && !isProcessing) {
      convertImage();
    }
  }, 50); // Reduced to 50ms for better responsiveness
}

// File upload handling
uploadBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", handleFileSelect);

// Drag and drop handling
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove("drag-over");
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
});

// Download button handling
downloadBtn.addEventListener("click", async () => {
  if (!processedImage) return;

  try {
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Saving...";

    const fileName = `line-art-${Date.now()}.png`;
    const result = await window.electronAPI.saveImage(processedImage, fileName);

    if (result.success) {
      showSuccess(`Image saved to: ${result.filePath}`);
    } else {
      throw new Error(result.error || "Save failed");
    }
  } catch (error) {
    console.error("Save error:", error);
    showError("Failed to save image: " + error.message);
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = "Download";
  }
});

// File handling functions
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    handleFile(file);
  }
}

async function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    showError("Please select an image file.");
    return;
  }

  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      currentImage = e.target.result;

      // Set both original and preview images
      const originalImage = document.getElementById("originalImage");
      originalImage.src = currentImage;
      originalImage.style.display = "block";

      previewImage.src = currentImage;
      previewImage.style.display = "block";

      dropZone.style.display = "none";
      downloadBtn.disabled = true;
      resetBtn.disabled = false;

      // Initialize comparison slider
      initComparisonSlider();

      // Auto-convert after successful upload
      convertImage();
    };

    reader.onerror = (error) => {
      throw new Error("Error reading file: " + error);
    };

    reader.readAsDataURL(file);
  } catch (error) {
    console.error("File handling error:", error);
    showError("Failed to process image: " + error.message);
  }
}

// Image comparison slider functionality
function initComparisonSlider() {
  const slider = document.getElementById("comparisonSlider");
  const originalWrapper = document.querySelector(".image-wrapper.original");
  let isResizing = false;
  let startX;
  let startPercentage;

  function startResize(e) {
    isResizing = true;
    startX = e.clientX || e.touches[0].clientX;

    // Calculate the current percentage from the slider's position
    const rect = originalWrapper.parentElement.getBoundingClientRect();
    startPercentage = ((startX - rect.left) / rect.width) * 100;

    document.documentElement.style.cursor = "ew-resize";
    document.addEventListener("mousemove", resize);
    document.addEventListener("touchmove", resize);
    document.addEventListener("mouseup", stopResize);
    document.addEventListener("touchend", stopResize);
  }

  function resize(e) {
    if (!isResizing) return;

    const currentX = e.clientX || e.touches[0].clientX;
    const rect = originalWrapper.parentElement.getBoundingClientRect();
    let percentage = ((currentX - rect.left) / rect.width) * 100;

    // Clamp percentage between 0 and 100
    percentage = Math.max(0, Math.min(100, percentage));

    // Update clip-path and slider position
    originalWrapper.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
    slider.style.left = `${percentage}%`;

    // Prevent text selection during resize
    e.preventDefault();
  }

  function stopResize() {
    isResizing = false;
    document.documentElement.style.cursor = "";
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("touchmove", resize);
    document.removeEventListener("mouseup", stopResize);
    document.removeEventListener("touchend", stopResize);
  }

  // Initialize slider position
  originalWrapper.style.clipPath = "inset(0 50% 0 0)";
  slider.style.left = "50%";

  // Add event listeners for both mouse and touch events
  slider.addEventListener("mousedown", startResize);
  slider.addEventListener("touchstart", startResize);
}

// UI feedback functions
function showError(message) {
  removeMessages();
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  previewContainer.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
  removeMessages();
  const successDiv = document.createElement("div");
  successDiv.className = "success-message";
  successDiv.textContent = message;
  previewContainer.appendChild(successDiv);
  setTimeout(() => successDiv.remove(), 5000);
}

function removeMessages() {
  const messages = previewContainer.querySelectorAll(
    ".error-message, .success-message"
  );
  messages.forEach((msg) => msg.remove());
}

// Optimized image processing function using Web Worker
async function convertImage() {
  if (!currentImage || isProcessing) return;

  const settings = {
    lineThickness: parseFloat(lineThicknessInput.value),
    detailLevel: parseFloat(detailLevelInput.value),
    contrast: parseFloat(contrastInput.value),
    threshold: parseInt(thresholdInput.value),
    sensitivity: parseFloat(sensitivityInput.value),
    lineSmoothing: parseFloat(lineSmoothingInput.value),
    brightness: parseInt(brightnessInput.value),
    denoise: parseFloat(denoiseInput.value),
    invertColors: invertColorsInput.checked,
    enhanceDetails: enhanceDetailsInput.checked,
    preserveShading: preserveShadingInput.checked,
  };

  try {
    isProcessing = true;

    const img = new Image();
    img.onload = async () => {
      // Set canvas sizes to match image
      processCanvas.width = img.width;
      processCanvas.height = img.height;
      displayCanvas.width = img.width;
      displayCanvas.height = img.height;

      // Draw original image to process canvas
      processCtx.drawImage(img, 0, 0);

      // Get image data
      const imageData = processCtx.getImageData(
        0,
        0,
        processCanvas.width,
        processCanvas.height
      );

      // Send data to worker for processing
      worker.postMessage({
        imageData: imageData.data,
        settings,
        width: processCanvas.width,
        height: processCanvas.height,
      });
    };

    img.onerror = (error) => {
      throw new Error("Error loading image for processing");
    };

    img.src = currentImage;
  } catch (error) {
    console.error("Conversion error:", error);
    showError("Failed to convert image: " + error.message);
    isProcessing = false;
    previewContainer.classList.remove("loading");
  }
}

// Initialize settings on load
initializeSettings();

// Reset file input when closing/refreshing
window.addEventListener("beforeunload", () => {
  fileInput.value = "";
});
