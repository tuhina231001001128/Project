// ============================================================================
// CONFIGURATION - GOOGLE GEMINI API
// ============================================================================

// Replace 'YOUR_GEMINI_API_KEY_HERE' with your actual Google Gemini API key
const API_KEY = 'AIzaSyAltk1O9dJFpfDT6mDjGgUId_CZcF9_X1o' ;
const API_URL = 'https://aistudio.google.com/api-keys';

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const previewImage = document.getElementById('previewImage');
const pdfPreview = document.getElementById('pdfPreview');
const pdfName = document.getElementById('pdfName');
const removeFile = document.getElementById('removeFile');
const loadingOverlay = document.getElementById('loadingOverlay');

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let currentFile = null;
let currentFileType = null;
let currentFileBase64 = null;
let conversationHistory = [];

// ============================================================================
// SYSTEM PROMPT FOR HEALTH ASSISTANT
// ============================================================================

const SYSTEM_PROMPT = `You are an expert AI Health Assistant with extensive medical knowledge. Your role is to:

1. Answer health-related questions with accurate, evidence-based information
2. Analyze medical reports, lab results, and health check-up documents
3. Identify potential health concerns from provided images or PDFs
4. Predict possible diseases or health risks based on report findings
5. Provide personalized health recommendations

When analyzing medical reports:
- Carefully examine all values and compare them to normal ranges
- Identify any abnormal findings
- Explain what those findings might indicate
- Suggest potential health risks or diseases that could develop
- Recommend follow-up actions or lifestyle changes

Important guidelines:
- Always maintain a professional, empathetic tone
- Explain medical terms in simple language
- Emphasize that you're providing information, not a diagnosis
- Always recommend consulting healthcare professionals for serious concerns
- If images are unclear, ask for clarification
- Provide actionable advice when appropriate

When a medical report or health document is shared:
1. First, describe what you see in the document
2. Analyze key metrics and values
3. Identify any concerning findings
4. Explain potential health implications
5. Suggest preventive measures or next steps

Remember: You're a supportive health companion, not a replacement for medical professionals.`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Auto-resize textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Enable send on Enter (Shift+Enter for new line)
userInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// File conversion to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Get MIME type for Gemini
function getMimeType(file) {
    return file.type || 'application/octet-stream';
}

// ============================================================================
// FILE HANDLING
// ============================================================================

attachBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type;
    
    if (fileType.startsWith('image/')) {
        currentFileType = 'image';
        currentFile = file;
        currentFileBase64 = await fileToBase64(file);
        
        // Show image preview
        previewImage.src = URL.createObjectURL(file);
        previewImage.style.display = 'block';
        pdfPreview.style.display = 'none';
        filePreview.style.display = 'flex';
        
    } else if (fileType === 'application/pdf') {
        currentFileType = 'pdf';
        currentFile = file;
        currentFileBase64 = await fileToBase64(file);
        
        // Show PDF preview
        pdfName.textContent = file.name;
        pdfPreview.style.display = 'flex';
        previewImage.style.display = 'none';
        filePreview.style.display = 'flex';
    } else {
        alert('Please upload only images (JPG, PNG, etc.) or PDF files.');
        fileInput.value = '';
    }
});

removeFile.addEventListener('click', () => {
    currentFile = null;
    currentFileType = null;
    currentFileBase64 = null;
    fileInput.value = '';
    filePreview.style.display = 'none';
    previewImage.src = '';
    pdfName.textContent = '';
});

// ============================================================================
// MESSAGE DISPLAY
// ============================================================================

function addMessage(content, isUser = false, fileData = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // If there's a file attached
    if (fileData && isUser) {
        if (fileData.type === 'image') {
            const img = document.createElement('img');
            img.src = fileData.url;
            messageContent.appendChild(img);
        } else if (fileData.type === 'pdf') {
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.innerHTML = `
                <i class="fas fa-file-pdf"></i>
                <span>${fileData.name}</span>
            `;
            messageContent.appendChild(fileInfo);
        }
    }
    
    // Add text content
    const textContent = document.createElement('p');
    textContent.innerHTML = content.replace(/\n/g, '<br>');
    messageContent.appendChild(textContent);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    typingDiv.id = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = '<span></span><span></span><span></span>';
    
    messageContent.appendChild(typingIndicator);
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(messageContent);
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// ============================================================================
// GOOGLE GEMINI API COMMUNICATION
// ============================================================================

async function sendToGemini(userMessage, fileData = null) {
    try {
        // Build the request content
        let parts = [];
        
        // Add system instruction as first message
        parts.push({
            text: SYSTEM_PROMPT + "\n\nUser query: " + userMessage
        });
        
        // Add file if present
        if (fileData) {
            parts.unshift({
                inlineData: {
                    mimeType: fileData.mimeType,
                    data: fileData.base64
                }
            });
        }
        
        // Prepare API request for Gemini
        const requestBody = {
            contents: [{
                parts: parts
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };
        
        // Make API call to Gemini
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        // Extract text response from Gemini
        let assistantMessage = '';
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.text) {
                        assistantMessage += part.text;
                    }
                }
            }
        }
        
        if (!assistantMessage) {
            throw new Error('No response generated from Gemini');
        }
        
        return assistantMessage;
        
    } catch (error) {
        console.error(' API Error:', error);
        throw error;
    }
}

// ============================================================================
// SEND MESSAGE
// ============================================================================

async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message && !currentFile) {
        return;
    }
    
    // Check if API key is set
    if (API_KEY === 'your_Google_Gemini_API_key') {
        alert('Please set your Google Gemini API key in the script.js file!\n\nFind this line:\nconst API_KEY = \'api keys\';\n\nAnd replace it with your actual Gemini API key.');
        return;
    }
    
    // Prepare file data if present
    let fileData = null;
    let fileDisplayData = null;
    
    if (currentFile) {
        fileData = {
            type: currentFileType,
            base64: currentFileBase64,
            mimeType: getMimeType(currentFile),
            name: currentFile.name
        };
        
        fileDisplayData = {
            type: currentFileType,
            url: currentFileType === 'image' ? URL.createObjectURL(currentFile) : null,
            name: currentFile.name
        };
    }
    
    // Display user message
    addMessage(message || '(Attached file for analysis)', true, fileDisplayData);
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Clear file
    currentFile = null;
    currentFileType = null;
    currentFileBase64 = null;
    fileInput.value = '';
    filePreview.style.display = 'none';
    
    // Disable input during processing
    sendBtn.disabled = true;
    userInput.disabled = true;
    attachBtn.disabled = true;
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Send to Gemini API
        const response = await sendToGemini(message || 'Please analyze this medical document/image', fileData);
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Display bot response
        addMessage(response);
        
    } catch (error) {
        removeTypingIndicator();
        
        let errorMessage = 'Sorry, I encountered an error processing your request.';
        
        if (error.message.includes('API Error')) {
            errorMessage = `${errorMessage}\n\nError details: ${error.message}`;
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = `${errorMessage}\n\nPlease check your internet connection and API key.`;
        } else if (error.message.includes('API key not valid')) {
            errorMessage = 'Invalid API key. Please check your Google Gemini API key.';
        }
        
        addMessage(errorMessage);
        console.error('Error:', error);
    } finally {
        // Re-enable input
        sendBtn.disabled = false;
        userInput.disabled = false;
        attachBtn.disabled = false;
        userInput.focus();
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

sendBtn.addEventListener('click', sendMessage);

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    userInput.focus();
    console.log('AI Health Assistant (Google Gemini) initialized successfully!');
    console.log('Remember to replace YOUR_GEMINI_API_KEY_HERE with your actual Google Gemini API key.');
});
