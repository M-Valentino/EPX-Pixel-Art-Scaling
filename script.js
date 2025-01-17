// Converts image data to a 3D array for easier manipulation
function convertTo3DArray(pixels, imgHeight, imgWidth) {
  let originalImgData = [];
  for (let y = 0; y < imgHeight; y++) {
    originalImgData[y] = [];
    for (let x = 0; x < imgWidth; x++) {
      const index = (y * imgWidth + x) * 4;
      originalImgData[y][x] = [
        pixels[index],     // Red
        pixels[index + 1], // Green
        pixels[index + 2], // Blue
        pixels[index + 3]  // Alpha
      ];
    }
  }
  return originalImgData;
}

// Helper for Initializing scaled image data array with transparent pixels
function fillWithTransparentPixels(newWidth, newHeight) {
  return Array.from({ length: newHeight }, () =>
    Array.from({ length: newWidth }, () => [0, 0, 0, 0])
  );
}

// Helper function to compare two pixel arrays
function arraysEqual(arr1, arr2) {
  return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
}

// Fills scaledImgData with 2x nearest neighbor filter.
// If this step is skipped, the final image will have missing pixels.
function nearestNeighborScale(originalHeight, originalWidth, imageToBeScaled, originalImgData) {
  for (let y = 0; y < originalHeight; y++) {
    for (let x = 0; x < originalWidth; x++) {
      imageToBeScaled[y * 2][x * 2] = originalImgData[y][x];
      imageToBeScaled[y * 2][x * 2 + 1] = originalImgData[y][x];
      imageToBeScaled[y * 2 + 1][x * 2] = originalImgData[y][x];
      imageToBeScaled[y * 2 + 1][x * 2 + 1] = originalImgData[y][x];
    }
  }
  return imageToBeScaled;
}

// EPX algorithm helper function
function applyEPXAlgorithm(imgHeight, imgWidth, originalImgData, scaledImgData) {
  epxImg = structuredClone(scaledImgData);

  for (let y = 0; y < imgHeight; y++) {
    for (let x = 0; x < imgWidth; x++) {
      const P = originalImgData[y][x];
      const A = y > 0 ? originalImgData[y - 1][x] : P;
      const B = x < imgWidth - 1 ? originalImgData[y][x + 1] : P;
      const C = x > 0 ? originalImgData[y][x - 1] : P;
      const D = y < imgHeight - 1 ? originalImgData[y + 1][x] : P;

      // Compare adjacent pixels and apply EPX algorithm
      if (arraysEqual(C, A)) {
        epxImg[y * 2][x * 2] = A;
      }
      if (arraysEqual(A, B)) {
        epxImg[y * 2][x * 2 + 1] = B;
      }
      if (arraysEqual(D, C)) {
        epxImg[y * 2 + 1][x * 2] = C;
      }
      if (arraysEqual(B, D)) {
        epxImg[y * 2 + 1][x * 2 + 1] = D;
      }

      // Check if all or most surrounding pixels are similar to P
      if (
        (arraysEqual(A, B) && arraysEqual(B, C)) ||
        (arraysEqual(B, C) && arraysEqual(C, D)) ||
        (arraysEqual(A, B) && arraysEqual(B, D)) ||
        (arraysEqual(A, C) && arraysEqual(C, D)) ||
        (arraysEqual(A, B) && arraysEqual(B, C) && arraysEqual(C, D))
      ) {
        epxImg[y * 2][x * 2] = P;
        epxImg[y * 2][x * 2 + 1] = P;
        epxImg[y * 2 + 1][x * 2] = P;
        epxImg[y * 2 + 1][x * 2 + 1] = P;
      }
    }
  }

  return epxImg;
}

function convert3DArrImgTo1D(context, width, height, img3DArrToConvert) {
  let oneDArrayImg = context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      oneDArrayImg.data[index] = img3DArrToConvert[y][x][0];
      oneDArrayImg.data[index + 1] = img3DArrToConvert[y][x][1];
      oneDArrayImg.data[index + 2] = img3DArrToConvert[y][x][2];
      oneDArrayImg.data[index + 3] = img3DArrToConvert[y][x][3];
    }
  }

  return oneDArrayImg;
}

document.getElementById('imageInput').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        let canvas = document.getElementById('nearestNeighbor');
        let context = canvas.getContext('2d');

        let newWidth = img.width * 2;
        let newHeight = img.height * 2;
        canvas.width = newWidth;
        canvas.height = newHeight;

        context.drawImage(img, 0, 0);

        const imageData = context.getImageData(0, 0, img.width, img.height);
        const pixels = imageData.data;

        let originalImgData = convertTo3DArray(pixels, img.height, img.width);
        let scaledImgData = fillWithTransparentPixels(newWidth, newHeight);
        scaledImgData = nearestNeighborScale(img.height, img.width, scaledImgData, originalImgData);
        // JS canvas can only draw the image if it is in a 1D array
        let scaledNN1DImg = convert3DArrImgTo1D(context, newWidth, newHeight, scaledImgData);
        context.putImageData(scaledNN1DImg, 0, 0);

        canvas = document.getElementById('epxScale');
        context = canvas.getContext('2d');
        canvas.width = newWidth;
        canvas.height = newHeight;
        let epxFiltered = applyEPXAlgorithm(img.height, img.width, originalImgData, scaledImgData);
        let epx1DImg = convert3DArrImgTo1D(context, newWidth, newHeight, epxFiltered);
        context.putImageData(epx1DImg, 0, 0);
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }
});