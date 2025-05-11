let video = document.getElementById("video");
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

// Start the camera
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => console.error("Error accessing camera:", err));

function capturePhoto() {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convert to grayscale
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const avg = 0.3 * pixels[i] + 0.59 * pixels[i + 1] + 0.11 * pixels[i + 2];
    pixels[i] = pixels[i + 1] = pixels[i + 2] = avg > 128 ? 255 : 0; // binarize
  }
  ctx.putImageData(imageData, 0, 0);

  // Show processed image
  const imageBase64 = canvas.toDataURL("image/png");
  document.getElementById("capturedImage").src = imageBase64;

  // Run OCR
  Tesseract.recognize(canvas, "eng", {
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    logger: (m) => console.log(m),
  })

    .then(({ data: { text } }) => {
      let formattedPlate = formatNumberPlate(text);

      document.getElementById("detectedNumber").innerText = formattedPlate;
      document.getElementById("numberPlate").value = formattedPlate;
    })
    .catch((err) => {
      console.error("Tesseract error:", err);
      document.getElementById("detectedNumber").innerText = "Error detecting";
    });
}

function recognizeTextOffline(imageData) {
  const image = new Image();
  image.src = imageData;

  image.onload = function () {
    Tesseract.recognize(image, "eng", {
      logger: (m) => console.log(m),
    })
      .then(({ data: { text } }) => {
        console.log("Raw OCR Text:", text);
        let cleanedText = formatNumberPlate(text);
        document.getElementById("numberPlate").value = cleanedText;
        document.getElementById("detectedNumber").textContent =
          cleanedText || "No number detected";
      })
      .catch((err) => {
        console.error("OCR Error:", err);
        alert("Failed to recognize number. Try again.");
        document.getElementById("detectedNumber").textContent = "OCR failed";
      });
  };
}

function formatNumberPlate(text) {
  let cleanedText = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  console.log("Cleaned OCR Text:", cleanedText);

  const platePatterns = [
    /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/, // MH12AB1234
    /^[A-Z]{2}\d{2}[A-Z]\d{4}$/, // KA01A1234
    /^[A-Z]{3}\d{4}$/, // DLX1234
  ];

  let isValid = platePatterns.some((regex) => regex.test(cleanedText));
  return isValid ? cleanedText : "Invalid Plate";
}

function verifyCar() {
  let number = document.getElementById("numberPlate").value.trim();

  if (!number || number === "Invalid Plate") {
    alert("Please enter a valid number plate!");
    return;
  }

  let parkingData = JSON.parse(localStorage.getItem("parkingData")) || [];

  let availableSlots = ["A1", "A2", "A3", "B1", "B2"];
  let usedSlots = parkingData
    .filter((entry) => entry.status === "Occupied")
    .map((entry) => entry.slotNumber);

  let slot = availableSlots.find((s) => !usedSlots.includes(s));

  if (!slot) {
    alert("All parking slots are full!");
    return;
  }

  // Store temporarily
  parkingData.push({
    carNumber: number,
    slotNumber: slot,
    status: "Occupied",
    isResident: null,
  });
  localStorage.setItem("parkingData", JSON.stringify(parkingData));
  localStorage.setItem("lastEntryCar", number);
  localStorage.setItem("lastSlot", slot); // Save for future use

  // Send to backend
  fetch("http://localhost:5000/api/park", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      car_number: number,
      slot_number: slot,
      is_resident: null,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Server response:", data);
    })
    .catch((err) => {
      console.error("Error sending to server:", err);
    });

  document.getElementById("popupCarNumber").textContent =
    number + " (Slot: " + slot + ")";
  document.getElementById("popupModal").style.display = "block";
}

// Resident update
function grantAccess() {
  document.getElementById("popupModal").style.display = "none";

  const carNumber = localStorage.getItem("lastEntryCar");

  fetch("http://localhost:5000/api/updateResidentStatus", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      car_number: carNumber,
      is_resident: true,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Resident status updated:", data);
    });

  alert("Access Granted! Welcome, resident.");
}

// Visitor update
function redirectToParking() {
  document.getElementById("popupModal").style.display = "none";

  const carNumber = localStorage.getItem("lastEntryCar");

  fetch("http://localhost:5000/api/updateResidentStatus", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      car_number: carNumber,
      is_resident: false,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Visitor status updated:", data);
    });

  window.location.href = "parking.html";
}
