const apiKeyInput = document.getElementById('api-key');
const saveApiKeyBtn = document.getElementById('save-api-key');
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const startBtn = document.getElementById('start-transcription');
const progressBar = document.getElementById('progress-bar');
const statusMessage = document.getElementById('status-message');
const outputArea = document.getElementById('transcription-output');
const copyBtn = document.getElementById('copy-output');
const errorMessage = document.getElementById('error-message');

let selectedFile = null;

// Load saved API key
window.addEventListener('DOMContentLoaded', () => {
  const savedKey = localStorage.getItem('openai_api_key');
  if (savedKey) {
    apiKeyInput.value = savedKey;
  }
});

// Save API key
saveApiKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem('openai_api_key', key);
    showStatus('API key saved.');
    checkReady();
  } else {
    showError('Please enter a valid API key.');
  }
});

// Drag and drop handlers
dropArea.addEventListener('click', () => fileInput.click());

dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.classList.add('hover');
});

dropArea.addEventListener('dragleave', () => {
  dropArea.classList.remove('hover');
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropArea.classList.remove('hover');
  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    handleFile(fileInput.files[0]);
  }
});

function handleFile(file) {
  selectedFile = file;
  fileInfo.textContent = `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
  showStatus('');
  clearError();
  checkReady();
}

function checkReady() {
  const key = apiKeyInput.value.trim();
  if (selectedFile && key) {
    startBtn.disabled = false;
  } else {
    startBtn.disabled = true;
  }
}

startBtn.addEventListener('click', async () => {
  clearError();
  showStatus('Starting transcription...');
  progressBar.value = 0;
  outputArea.value = '';
  copyBtn.disabled = true;
  startBtn.disabled = true;

  try {
    // Placeholder: chunking and API call logic will go here
    const transcript = await transcribeFile(selectedFile);
    outputArea.value = transcript;
    copyBtn.disabled = false;
    showStatus('Transcription complete.');
    progressBar.value = 100;
  } catch (err) {
    console.error(err);
    showError('Error: ' + err.message);
    showStatus('Transcription failed.');
  } finally {
    startBtn.disabled = false;
  }
});

async function transcribeFile(file) {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    throw new Error('API key is missing.');
  }

  // ElevenLabs supports files up to 1GB, so upload directly
  return await transcribeChunk(file, apiKey, 0, 1);
}

async function transcribeChunk(blob, apiKey, chunkIndex, totalChunks) {
  showStatus(`Uploading chunk ${chunkIndex + 1} of ${totalChunks}...`);
  progressBar.value = (chunkIndex / totalChunks) * 100;

  const formData = new FormData();
  formData.append('file', blob, `chunk_${chunkIndex}.mp3`);
  formData.append('model_id', 'eleven_multilingual_v2'); // default model
  formData.append('language', 'en');

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey
        // Note: Do NOT set Content-Type here; fetch will set it with boundary
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || response.statusText;
      throw new Error(`API error: ${errorMsg}`);
    }

    const data = await response.json();
    progressBar.value = ((chunkIndex + 1) / totalChunks) * 100;
    return data.text || '';
  } catch (err) {
    throw new Error(`Chunk ${chunkIndex + 1} failed: ${err.message}`);
  }
}

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(outputArea.value)
    .then(() => showStatus('Copied to clipboard.'))
    .catch(err => showError('Copy failed: ' + err.message));
});

function showStatus(message) {
  statusMessage.textContent = message;
}

function showError(message) {
  errorMessage.textContent = message;
}

function clearError() {
  errorMessage.textContent = '';
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
