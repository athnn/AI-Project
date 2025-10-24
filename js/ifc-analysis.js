// LM Studio (OpenAI-compatible) API base
const OPENAI_API_BASE = 'http://127.0.0.1:1234/v1';

// Pricing per 1M tokens
const MODEL_PRICING = {};

// Global variables
let proposalFile = null;
let specFiles = [];

// API Key Management Functions
async function getApiKey() { return ''; }

// Model Management Functions
function getSelectedModel() {
    return localStorage.getItem('selected_model') || 'local-model';
}

function setSelectedModel(model) {
    localStorage.setItem('selected_model', model);
}

// Available Models (UI only)
const AVAILABLE_MODELS = {
    'local-model': 'Local Model (LM Studio)'
};

// Add settings modal functionality
function addSettingsModal() {
    // Initialize settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettingsModal);
    }

    // Initialize modal elements
    initializeSettingsModal();
}

function initializeSettingsModal() {
    const apiKeyInput = document.getElementById('api-key-input');
    const toggleVisibilityBtn = document.getElementById('toggle-api-key-visibility');
    const modelSelect = document.getElementById('model-select');
    const modelInfo = document.getElementById('model-info');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    if (!apiKeyInput || !modelSelect || !saveSettingsBtn) {
        console.error('Settings modal elements not found');
        return;
    }

    // Populate model dropdown
    Object.entries(AVAILABLE_MODELS).forEach(([modelId, modelName]) => {
        const option = document.createElement('option');
        option.value = modelId;
        option.textContent = modelName;
        if (modelId === getSelectedModel()) {
            option.selected = true;
        }
        modelSelect.appendChild(option);
    });

    // Update model info display
    updateModelInfoInModal(getSelectedModel());

    // Handle model selection change
    modelSelect.addEventListener('change', (e) => {
        const newModel = e.target.value;
        updateModelInfoInModal(newModel);
    });

    // API key visibility toggle
    if (toggleVisibilityBtn) {
        toggleVisibilityBtn.addEventListener('click', () => {
            const type = apiKeyInput.type === 'password' ? 'text' : 'password';
            apiKeyInput.type = type;
            
            // Update icon
            const svg = toggleVisibilityBtn.querySelector('svg');
            if (type === 'text') {
                svg.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                `;
            } else {
                svg.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                `;
            }
        });
    }

    // Save settings
    saveSettingsBtn.addEventListener('click', () => {
        const newApiKey = apiKeyInput.value.trim();
        const newModel = modelSelect.value;

        // api key not required for local usage
        
        setSelectedModel(newModel);
        closeSettingsModal();
    });
}

function updateModelInfoInModal(modelId) {
    const modelInfo = document.getElementById('model-info');
    if (!modelInfo) return;
    const modelName = AVAILABLE_MODELS[modelId] || 'Local Model (LM Studio)';
    modelInfo.textContent = `Using: ${modelName}`;
}

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const apiKeyInput = document.getElementById('api-key-input');
    
    if (!modal) return;

    // Load current API key
    // api key not required for local usage

    modal.classList.remove('hidden');
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// PDF.js configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize settings
    addSettingsModal();
    
    // Set up file inputs
    document.getElementById('proposal-file').addEventListener('change', handleProposalFileSelect);
    document.getElementById('spec-files').addEventListener('change', handleSpecFilesSelect);
    
    // Set up compare button
    document.getElementById('compare-btn').addEventListener('click', compareDocuments);
    
    // Set up drag-and-drop
    setupDragAndDrop();
    
    // Set up advanced settings
    setupAdvancedSettings();
    
    // Load saved special request
    const savedSpecialRequest = localStorage.getItem('special_request');
    if (savedSpecialRequest) {
        document.getElementById('special-request').value = savedSpecialRequest;
    }
    
    checkFilesReady();
});

// Set up drag-and-drop functionality
function setupDragAndDrop() {
    const areas = document.querySelectorAll('.drag-drop-area');
    
    areas.forEach(area => {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('drag-over', 'drag-active');
        });
        
        area.addEventListener('dragleave', () => {
            area.classList.remove('drag-over', 'drag-active');
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('drag-over', 'drag-active');
            
            const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
            const uploadType = area.dataset.uploadType;
            
            if (uploadType === 'proposal' && files.length > 0) {
                handleProposalFileSelect({ target: { files: [files[0]] } });
            } else if (uploadType === 'specs' && files.length > 0) {
                handleSpecFilesSelect({ target: { files: files } });
            }
        });
    });
}

// File handling functions
function handleProposalFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        proposalFile = file;
        displayProposalPreview(file);
        checkFilesReady();
    }
}

function handleSpecFilesSelect(event) {
    const files = Array.from(event.target.files).filter(f => f.type === 'application/pdf');
    if (files.length > 0) {
        specFiles = [...specFiles, ...files];
        displaySpecInfo();
        checkFilesReady();
    }
}

// Display functions
async function displayProposalPreview(file) {
    const uploadContent = document.getElementById('upload-content-proposal');
    const inlinePreview = document.getElementById('inline-preview-proposal');
    const canvas = document.getElementById('inline-canvas-proposal');
    
    uploadContent.classList.add('hidden');
    inlinePreview.classList.remove('hidden');
    
    // Update file info
    document.getElementById('inline-filename-proposal').textContent = `${file.name} (${formatFileSize(file.size)})`;
    
    // Render first page preview
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 0.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const context = canvas.getContext('2d');
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
    } catch (error) {
        console.error('Error rendering PDF preview:', error);
    }
}

function displaySpecInfo() {
    const uploadContent = document.getElementById('upload-content-specs');
    const specInfo = document.getElementById('spec-info');
    const specList = document.getElementById('spec-list');
    const specCount = document.getElementById('spec-count');
    
    uploadContent.classList.add('hidden');
    specInfo.classList.remove('hidden');
    specCount.textContent = `${specFiles.length} file${specFiles.length > 1 ? 's' : ''} selected`;
    
    specList.innerHTML = specFiles.map((file, index) => `
        <div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
            <span class="text-sm text-gray-700 truncate flex-1 mr-2">${file.name}</span>
            <button onclick="removeSpecFile(${index})" class="text-red-500 hover:text-red-700 text-sm px-2 flex-shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `).join('');
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function removeSpecFile(index) {
    specFiles.splice(index, 1);
    if (specFiles.length === 0) {
        resetSpecUpload();
    } else {
        displaySpecInfo();
    }
    checkFilesReady();
}

function resetProposalUpload() {
    proposalFile = null;
    document.getElementById('proposal-file').value = '';
    document.getElementById('upload-content-proposal').classList.remove('hidden');
    document.getElementById('inline-preview-proposal').classList.add('hidden');
    checkFilesReady();
}

function resetSpecUpload() {
    specFiles = [];
    document.getElementById('spec-files').value = '';
    document.getElementById('spec-info').classList.add('hidden');
    document.getElementById('upload-content-specs').classList.remove('hidden');
    checkFilesReady();
}

function addMoreSpecFiles() {
    document.getElementById('spec-files').click();
}

function checkFilesReady() {
    const compareBtn = document.getElementById('compare-btn');
    const isReady = proposalFile && specFiles.length > 0;
    compareBtn.disabled = !isReady;
}

// Preview functions
function openProposalPreview() {
    if (!proposalFile) return;
    
    const modal = document.getElementById('pdf-preview-modal');
    const canvas = document.getElementById('pdf-canvas');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');
    const previewTitle = document.getElementById('preview-title');
    
    modal.classList.remove('hidden');
    previewTitle.textContent = proposalFile.name;
    
    let pdfDoc = null;
    let currentPage = 1;
    
    const renderPage = async (pageNum) => {
        if (!pdfDoc) return;
        
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const context = canvas.getContext('2d');
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        currentPageSpan.textContent = pageNum;
        prevBtn.disabled = pageNum <= 1;
        nextBtn.disabled = pageNum >= pdfDoc.numPages;
    };
    
    proposalFile.arrayBuffer().then(arrayBuffer => {
        pdfjsLib.getDocument(arrayBuffer).promise.then(pdf => {
            pdfDoc = pdf;
            totalPagesSpan.textContent = pdf.numPages;
            renderPage(currentPage);
        });
    });
    
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
        }
    };
    
    nextBtn.onclick = () => {
        if (pdfDoc && currentPage < pdfDoc.numPages) {
            currentPage++;
            renderPage(currentPage);
        }
    };
}

window.closeProposalPreview = function() {
    document.getElementById('pdf-preview-modal').classList.add('hidden');
};

// Advanced settings setup
function setupAdvancedSettings() {
    const toggle = document.getElementById('advanced-settings-toggle');
    const content = document.getElementById('advanced-settings-content');
    const icon = document.getElementById('advanced-toggle-icon');
    
    toggle.addEventListener('click', () => {
        content.classList.toggle('hidden');
        icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
    });
    
    // Tab switching
    const tabSpecial = document.getElementById('tab-special');
    const tabAnalysis = document.getElementById('tab-analysis');
    const contentSpecial = document.getElementById('content-special');
    const contentAnalysis = document.getElementById('content-analysis');
    
    tabSpecial.addEventListener('click', () => {
        tabSpecial.classList.add('text-[var(--hunter-green)]', 'border-b-2', 'border-[var(--hunter-green)]', 'bg-white');
        tabSpecial.classList.remove('text-gray-500');
        tabAnalysis.classList.remove('text-[var(--hunter-green)]', 'border-b-2', 'border-[var(--hunter-green)]', 'bg-white');
        tabAnalysis.classList.add('text-gray-500');
        
        contentSpecial.classList.remove('hidden');
        contentAnalysis.classList.add('hidden');
    });
    
    tabAnalysis.addEventListener('click', () => {
        tabAnalysis.classList.add('text-[var(--hunter-green)]', 'border-b-2', 'border-[var(--hunter-green)]', 'bg-white');
        tabAnalysis.classList.remove('text-gray-500');
        tabSpecial.classList.remove('text-[var(--hunter-green)]', 'border-b-2', 'border-[var(--hunter-green)]', 'bg-white');
        tabSpecial.classList.add('text-gray-500');
        
        contentAnalysis.classList.remove('hidden');
        contentSpecial.classList.add('hidden');
    });
    
    // Load default IFC analysis instructions
    loadDefaultIFCInstructions();
}

function loadDefaultIFCInstructions() {
    const textarea = document.getElementById('custom-analysis-instructions');
    textarea.value = `You are an expert construction specification analyst specializing in IFC (Issued for Construction) document review. Your task is to analyze tables and structured data extracted from IFC drawings and compare them against proposal documents to ensure complete compliance.

IMPORTANT NOTES:
1. Focus exclusively on tables, schedules, and structured data from the IFC documents
2. Do NOT attempt to interpret spatial layouts or graphical elements from drawings
3. For welded components, assume CARBON STEEL material unless specifically stated otherwise
4. Pay special attention to member schedules, connection details, and material specifications

Your analysis approach:
1. Extract and analyze all tables, schedules, and legends from IFC documents
2. Compare extracted data against corresponding information in the proposal
3. Identify any discrepancies in specifications, quantities, or requirements
4. Check for missing information that appears in IFC tables but not in proposal
5. Verify drawing numbers, revisions, and references match between documents

Key areas to focus on from extracted tables:
- Site conditions: seismic design category, area classification (C1D2), wind/snow/live loads
- Fire & Gas: detection zones, equipment schedules, alarm sequences, suppression systems
- HVAC: equipment schedules, capacities, refrigerant types, ductwork specifications
- Electrical: panel schedules, equipment ratings, conduit/wire specifications, grounding details
- Wall assemblies: insulation R-values, vapor barriers, material layers and thicknesses
- Member schedules (beams, columns, braces) with sizes and specifications
- Connection schedules (bolts, welds, fasteners) with patterns and grades
- Material specification tables and grades
- General notes and special conditions in tabular format

Comparison priorities:
1. Site conditions and hazardous area classifications must match exactly (safety critical)
2. Fire & Gas system specifications must meet or exceed IFC requirements
3. HVAC and electrical equipment must match scheduled capacities and ratings
4. Wall assembly R-values and materials must meet energy code requirements
5. Structural member sizes and grades must match exactly
6. Connection details (bolt patterns, weld sizes) must be identical
7. All scheduled equipment in IFC must appear in proposal with matching specifications
8. Quantities must match or proposal must explain variations
9. Material specifications must meet or exceed IFC requirements`;
}

// File to Base64 conversion function
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to read file as base64 string.'));
            }
        };
        reader.onerror = () => {
            reject(new Error('Error reading file.'));
        };
        reader.readAsDataURL(file);
    });
}

// Main comparison function
async function compareDocuments() {
    if (!proposalFile || specFiles.length === 0) {
        alert('Please upload both proposal and IFC documents');
        return;
    }
    
    // Save special request
    const specialRequest = document.getElementById('special-request').value.trim();
    if (specialRequest) {
        localStorage.setItem('special_request', specialRequest);
    }
    
    // Show loading state
    document.getElementById('compare-btn').disabled = true;
    document.getElementById('button-text').textContent = 'Analyzing...';
    document.getElementById('loading-spinner').classList.remove('hidden');
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('error-message').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    
    try {
        // Convert all PDFs to base64
        const proposalBase64 = await fileToBase64(proposalFile);
        const specBase64s = await Promise.all(specFiles.map(file => fileToBase64(file)));
        
        // Get custom instructions
        const customInstructions = document.getElementById('custom-analysis-instructions').value;
        
        // Analyze with local LM Studio using extracted text
        const analysis = await analyzeIFC(proposalFile, proposalBase64, specFiles, specBase64s, specialRequest, customInstructions);
        
        // Display results
        displayResults(analysis);
        
    } catch (error) {
        console.error('Error during comparison:', error);
        let errorMessage = error.message;
        
        // Provide more specific error guidance
        if (error.message.includes('safety')) {
            errorMessage = 'The content was blocked by safety filters. Please ensure your documents don\'t contain sensitive content.';
        } else if (error.message.includes('token')) {
            errorMessage = 'The documents are too large to process. Please try with fewer or smaller files.';
        } else if (error.message.includes('parse')) {
            errorMessage = 'Unable to analyze the documents. The AI response was not in the expected format. Please try again.';
        }
        
        document.getElementById('error-message').textContent = `Error: ${errorMessage}`;
        document.getElementById('error-message').classList.remove('hidden');
    } finally {
        // Reset button state
        document.getElementById('compare-btn').disabled = false;
        document.getElementById('button-text').textContent = 'Analyze IFC Documents';
        document.getElementById('loading-spinner').classList.add('hidden');
        document.getElementById('loading').classList.add('hidden');
    }
}


// Helper function to parse SSE data
function parseSSEData(data) {
    if (data.startsWith('data: ')) {
        const jsonStr = data.slice(6);
        if (jsonStr === '[DONE]') {
            return null;
        }
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse SSE data:', e);
            return null;
        }
    }
    return null;
}

// Update streaming status in UI
function updateStreamingStatus(message, showPreview = false) {
    const streamingMessage = document.getElementById('streaming-message');
    const streamingPreview = document.getElementById('streaming-preview');
    const streamingContent = document.getElementById('streaming-content');
    
    if (streamingMessage) {
        streamingMessage.textContent = message;
    }
    
    if (showPreview && streamingPreview) {
        streamingPreview.classList.remove('hidden');
    }
}

// LM Studio call for IFC analysis with streaming
async function analyzeIFC(proposalFile, proposalBase64, specFiles, specBase64s, specialRequest, customInstructions) {
    const selectedModel = await getLocalLmModel();
    
    const tableExtractionPrompt = `First, I need you to perform a table extraction process on the IFC documents provided below.

Your goal is to identify and extract all data from the IFC documents that appears to be in a tabular or schedule format.

This includes:
- Formal tables with clear headers and columnar data
- Schedules (e.g., Door Schedule, Window Schedule, Room Schedule, Equipment Schedule, Member Schedule, Connection Schedule)
- Connection schedules (bolts, welds, fasteners)
- Member schedules (beams, columns, braces)
- Material specifications tables
- HVAC equipment schedules and specifications
- Electrical equipment schedules and panel schedules
- Interior and exterior wall assembly tables (insulation R-values, materials, thicknesses)
- Fire & Gas detection equipment schedules and zone tables
- Fire protection system schedules (sprinklers, alarms, suppression systems)
- Site condition tables (seismic design category, area classification like C1D2, wind loads, snow loads, soil bearing capacity)
- Revision clouds/blocks with tabular revision history
- Indexes or Legends (including weld symbols legend, bolt patterns)
- Summaries (e.g., Project Summary, Building Information, Parameter lists) often presented as key-value pairs
- Cutlists / Bills of Materials (BOMs)
- Load tables and design criteria
- Finish schedules
- Numbered or bulleted lists that convey structured information (e.g., General Notes, Special Conditions, Design Criteria lists)

Guidelines for extraction:
- Identify tables based on keywords (like "SCHEDULE", "TABLE", "INDEX", "SUMMARY", "LEGEND", "NOTES", "MEMBER", "CONNECTION", "MATERIAL", "SPECIFICATION", "HVAC", "ELECTRICAL", "FIRE", "GAS", "SEISMIC", "WIND", "SNOW", "CLASSIFICATION") and structural cues
- Extract the content of these tables accurately
- For multi-page tables, indicate continuation
- For partial/cropped tables, note incompleteness
- For tables referenced but not shown, note the reference
- Disregard purely graphical elements, building layouts, floor plans, footprints, spatial arrangements, and general descriptive text unless they are titles, notes, or table content
- Focus exclusively on structured data and avoid interpreting architectural drawings or spatial relationships
- Organize by sheet/page identifiers (e.g., "SHEET: S1.01", "M1.01", "E1.01" or page numbers)

Priority extraction order:
1. Site conditions and design criteria (seismic category, area classification C1D2, wind/snow loads)
2. Fire & Gas detection and protection system schedules
3. Structural member schedules and connection details
4. HVAC equipment schedules and specifications
5. Electrical equipment and panel schedules
6. Interior/exterior wall assemblies and insulation specifications
7. Material specifications and grades
8. Dimension tables and tolerances
9. General notes affecting construction
10. Weld symbols and bolt specifications
11. Load tables and design calculations
12. Revision history and drawing references

After extracting all tables from the IFC documents, compare them against the proposal document to identify compliance issues.`;
    
    const prompt = `${tableExtractionPrompt}

${customInstructions}

${specialRequest ? `\nSPECIAL INSTRUCTIONS FROM USER:\n${specialRequest}\n` : ''}

I will provide you with:
1. A proposal document (${proposalFile.name})
2. ${specFiles.length} IFC document(s): ${specFiles.map(f => f.name).join(', ')}

Based on the extracted tables and structured data from the IFC documents, perform an EXHAUSTIVE comparison against the proposal document. Report EVERY difference, discrepancy, or mismatch - DO NOT SKIP ANYTHING. Provide ONLY the detailed findings in the following JSON format:
{
    "detailed_findings": [
        {
            "finding": "Brief description of what was found",
            "ifc_requirement": "What the IFC document specifies",
            "proposal_content": "What the proposal states",
            "compliance": "COMPLIANT/NON-COMPLIANT/UNCLEAR"
        }
    ]
}

IMPORTANT: 
- Report EVERY SINGLE DIFFERENCE found, no matter how minor (including quantities, dimensions, model numbers, specifications, materials, capacities, ratings, etc.)
- Do NOT skip any discrepancies - if IFC says "10" and proposal says "9", report it
- Include differences in: numbers, text, specifications, presence/absence of items, wording variations
- Keep descriptions concise but complete
- Even if something seems trivial, INCLUDE IT
- Each finding must have all 4 fields filled`;
    
    // Extract PDFs to text (LM Studio text input)
    const proposalText = await extractPdfText(proposalFile);
    const specTexts = [];
    for (let i = 0; i < specFiles.length; i++) {
        const txt = await extractPdfText(specFiles[i]);
        specTexts.push(txt);
    }
    const textBundle = [
        prompt,
        `\n\nPROPOSAL (TEXT: ${proposalFile.name})\n${proposalText}`,
        ...specFiles.map((f, idx) => `\n\nIFC ${idx + 1} (TEXT: ${f.name})\n${specTexts[idx]}`)
    ].join('\n');
    
    // Gemini-specific request body removed; using LM Studio chat/completions below
    
    // Update UI to show streaming is starting
    updateStreamingStatus('Connecting to AI service...');
    
    // Use LM Studio streaming endpoint
    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: selectedModel,
            stream: true,
            temperature: 0.2,
            messages: [
                { role: 'system', content: 'You output only valid JSON according to the user schema.' },
                { role: 'user', content: textBundle }
            ]
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }
    
    // Set up streaming
    updateStreamingStatus('Receiving AI analysis...', true);
    const streamingContent = document.getElementById('streaming-content');
    
    // Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';
    let usageMetadata = null;
    
    while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
            if (line.trim() === '') continue;
            
            const parsed = parseSSEData(line);
            if (parsed && parsed.choices && parsed.choices[0]) {
                const delta = parsed.choices[0].delta || {};
                const text = delta.content || '';
                if (text) {
                    fullResponse += text;
                    
                    // Update streaming preview
                    if (streamingContent) {
                        // Show last 500 characters of the response
                        const preview = fullResponse.length > 500 
                            ? '...' + fullResponse.slice(-500) 
                            : fullResponse;
                        streamingContent.textContent = preview;
                        streamingContent.scrollTop = streamingContent.scrollHeight;
                    }
                    
                    // Update status based on content
                    if (fullResponse.includes('Site conditions')) {
                        updateStreamingStatus('Analyzing site conditions and design criteria...');
                    } else if (fullResponse.includes('Fire & Gas')) {
                        updateStreamingStatus('Checking Fire & Gas detection systems...');
                    } else if (fullResponse.includes('HVAC')) {
                        updateStreamingStatus('Reviewing HVAC equipment specifications...');
                    } else if (fullResponse.includes('Electrical')) {
                        updateStreamingStatus('Examining electrical systems...');
                    } else if (fullResponse.includes('wall assembl')) {
                        updateStreamingStatus('Verifying wall assembly specifications...');
                    } else if (fullResponse.includes('detailed_findings')) {
                        updateStreamingStatus('Compiling compliance findings...');
                    }
                }
            }
        }
    }
    
    // Process any remaining buffer
    if (buffer.trim()) {
        const parsed = parseSSEData(buffer);
        if (parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            fullResponse += parsed.choices[0].delta.content || '';
        }
    }
    
    updateStreamingStatus('Finalizing analysis results...');
    
    // No token usage metadata from LM Studio
    
    try {
        // Log the full response for debugging
        console.log('Full streamed response:', fullResponse);
        
        // Try to extract JSON if wrapped in markdown code blocks
        let jsonText = fullResponse;
        if (fullResponse.includes('```json')) {
            jsonText = fullResponse.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || fullResponse;
        } else if (fullResponse.includes('```')) {
            jsonText = fullResponse.match(/```\s*([\s\S]*?)\s*```/)?.[1] || fullResponse;
        }
        
        // Try to find JSON object in the response
        const jsonMatch = jsonText.match(/\{[\s\S]*"detailed_findings"[\s\S]*\}/);
        if (jsonMatch) {
            jsonText = jsonMatch[0];
        }
        
        const parsedResult = JSON.parse(jsonText);
        console.log('Successfully parsed analysis result from stream');
        return parsedResult;
    } catch (error) {
        console.error('Error parsing JSON response:', error);
        console.error('Raw response data:', fullResponse);
        
        if (error.message.includes('JSON')) {
            throw new Error('Failed to parse analysis results. The AI response was not in the expected format.');
        }
        throw error;
    }
}

// Display results
function displayResults(analysis) {
    const resultsSection = document.getElementById('results');
    const resultsContent = document.getElementById('results-content');
    const costInfo = document.getElementById('cost-info');
    const costAmount = document.getElementById('cost-amount');
    const downloadBtn = document.getElementById('download-btn');
    
    // Build HTML content - ONLY THE TABLE
    let html = `
        <div class="overflow-x-auto">
            <table class="w-full border-collapse">
                <thead>
                    <tr class="bg-[var(--hunter-green)] text-white">
                        <th class="border border-gray-300 px-4 py-3 text-left">Finding</th>
                        <th class="border border-gray-300 px-4 py-3 text-left">IFC Requirement</th>
                        <th class="border border-gray-300 px-4 py-3 text-left">Proposal Content</th>
                        <th class="border border-gray-300 px-4 py-3 text-center">Compliance</th>
                    </tr>
                </thead>
                <tbody>
                    ${analysis.detailed_findings.map(finding => `
                        <tr class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-4 py-3">${finding.finding}</td>
                            <td class="border border-gray-300 px-4 py-3">${finding.ifc_requirement}</td>
                            <td class="border border-gray-300 px-4 py-3">${finding.proposal_content}</td>
                            <td class="border border-gray-300 px-4 py-3 text-center">
                                <span class="inline-block px-3 py-1 rounded-full text-xs font-medium ${getComplianceClass(finding.compliance)}">
                                    ${finding.compliance}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    resultsContent.innerHTML = html;
    resultsSection.classList.remove('hidden');
    
    // Show cost if available
    if (window.lastAnalysisCost) {
        costAmount.textContent = `$${window.lastAnalysisCost.toFixed(4)}`;
        costInfo.classList.remove('hidden');
    }
    
    // Show download button
    downloadBtn.classList.remove('hidden');
    downloadBtn.onclick = () => downloadReport(analysis);
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Helper functions for styling
function getComplianceColor(rating) {
    switch (rating) {
        case 'COMPLIANT':
            return 'bg-green-50 border border-green-200 text-green-700';
        case 'PARTIALLY COMPLIANT':
            return 'bg-yellow-50 border border-yellow-200 text-yellow-700';
        case 'NON-COMPLIANT':
            return 'bg-red-50 border border-red-200 text-red-700';
        default:
            return 'bg-gray-50 border border-gray-200 text-gray-700';
    }
}

function getComplianceClass(compliance) {
    switch (compliance) {
        case 'COMPLIANT':
            return 'bg-green-100 text-green-800';
        case 'NON-COMPLIANT':
            return 'bg-red-100 text-red-800';
        case 'UNCLEAR':
            return 'bg-gray-100 text-gray-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function getSeverityClass(severity) {
    switch (severity) {
        case 'CRITICAL':
            return 'bg-red-100 text-red-800';
        case 'MAJOR':
            return 'bg-orange-100 text-orange-800';
        case 'MINOR':
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Download report function
function downloadReport(analysis) {
    const proposalName = proposalFile.name.replace('.pdf', '');
    const date = new Date().toLocaleDateString();
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IFC Analysis Report - ${proposalName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1, h2 { color: #38543C; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ccc; padding: 12px; text-align: left; }
        th { background-color: #38543C; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .header { text-align: center; margin-bottom: 40px; }
        .compliant { background-color: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; }
        .non-compliant { background-color: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; }
        .unclear { background-color: #e2e3e5; color: #383d41; padding: 4px 8px; border-radius: 4px; }
        @media print {
            body { margin: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>IFC Compliance Analysis Report</h1>
        <p><strong>Proposal:</strong> ${proposalName}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Generated by:</strong> Hunter Buildings IFC Analysis Tool</p>
    </div>
    
    <h2>Detailed Findings</h2>
    <table>
        <thead>
            <tr>
                <th>Finding</th>
                <th>IFC Requirement</th>
                <th>Proposal Content</th>
                <th>Compliance</th>
            </tr>
        </thead>
        <tbody>
            ${analysis.detailed_findings.map(finding => `
                <tr>
                    <td>${finding.finding}</td>
                    <td>${finding.ifc_requirement}</td>
                    <td>${finding.proposal_content}</td>
                    <td><span class="${finding.compliance.toLowerCase().replace(' ', '-')}">${finding.compliance}</span></td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div style="margin-top: 60px; text-align: center; color: #666;">
        <p>This report was generated using AI-powered analysis. Please review all findings with appropriate technical expertise.</p>
        ${window.lastAnalysisCost ? `<p>Analysis Cost: $${window.lastAnalysisCost.toFixed(4)}</p>` : ''}
    </div>
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IFC_Analysis_${proposalName}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}