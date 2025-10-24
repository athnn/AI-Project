let uploadedFile = null;
let currentPhase = 'initial';
let showConditionalMods = false;
let negotiationMode = 'strict'; // Default to strict mode

// Default prompt templates for different modes
const PROMPT_BASE = `You are an expert AI Legal Assistant working for the Seller of modular buildings. Your task is to review and redline the Customer's Terms & Conditions contract to be maximally favorable to the Seller.

IMPORTANT INSTRUCTIONS:
1. Use EXACTLY this markup format:
   - For deletions: ~~text to delete~~
   - For additions: **text to add**

2. Analyze the customer's contract and find clauses that match the topics in the negotiation table below.

3. For each matching clause:
   a) Start with the "Negotiation Response" as your base response
   b) Review the "Internal Guidance" column for additional instructions, context, or modifications
   c) Apply any guidance to enhance, modify, or contextualize the Negotiation Response
   d) The Internal Guidance may include:
      - Specific conditions for when to apply certain language
      - Alternative approaches based on contract context
      - Additional points to include in the response
      - Clarifications or exceptions to consider

4. The "Internal Guidance" column provides strategic notes and instructions for implementing the negotiation response. Use these notes to make your redlines more sophisticated and context-aware.

`;

const PROMPT_STRICT_MODE = PROMPT_BASE + `5. STRICT MODE: Only modify clauses that already exist in the customer's document. DO NOT add any new clauses or sections, even if topics from the negotiation table are missing.

6. Ensure all modifications are grammatically correct and legally sound.

7. DO NOT add any explanations, commentary, or additional text beyond the redlined contract itself.

NEGOTIATION TABLE:
\${negotiationTable}

Please provide the COMPLETE redlined version of the contract with all modifications using the specified markup (~~deletions~~ and **additions**). Include ALL sections of the original contract, even those not modified. Do not add any extra information from yourself.`;

const PROMPT_CREATIVE_MODE = PROMPT_BASE + `5. CREATIVE MODE: If a topic from the negotiation table is missing from the customer's document, PROACTIVELY ADD a new clause using the "Negotiation Response" column (enhanced by any applicable Internal Guidance). Insert these new clauses in appropriate sections of the contract.

6. Ensure all modifications are grammatically correct and legally sound.

7. DO NOT add any explanations, commentary, or additional text beyond the redlined contract itself.

NEGOTIATION TABLE:
\${negotiationTable}

Please provide the COMPLETE redlined version of the contract with all modifications using the specified markup (~~deletions~~ and **additions**). Include ALL sections of the original contract, even those not modified. Do not add any extra information from yourself.`;

// For backwards compatibility, set DEFAULT_PROMPT to strict mode
const DEFAULT_PROMPT = PROMPT_STRICT_MODE;

const PHASE_NEGOTIATIONS = {
    initial: [
        {
            clauseTopic: "Excluding our Proposal T&C from applying",
            negotiationResponse: "Seller's Terms and Conditions, Exceptions and Clarifications to apply to this contract. Customer's terms are hereby rejected in their entirety.",
            internalGuidance: ""
        },
        {
            clauseTopic: "Pay When Paid",
            negotiationResponse: "Seller completely rejects any pay-when-paid or pay-if-paid clause. Payment terms are independent of Customer's arrangements with third parties.",
            internalGuidance: ""
        },
        {
            clauseTopic: "Liquidated Damages",
            negotiationResponse: "Seller takes complete exception to Liquidated Damages. If LDs are required, Seller requires an Early Completion Bonus of equal amount.",
            internalGuidance: ""
        },
        {
            clauseTopic: "Governing Law State other than Texas",
            negotiationResponse: "Governing law must be that of Texas. No other jurisdiction is acceptable.",
            internalGuidance: ""
        },
        {
            clauseTopic: "Net 45, 60, 90, 120 and any payment term other than Net 30",
            negotiationResponse: "Payment terms are strictly Net 30. No extended payment terms will be accepted.",
            internalGuidance: ""
        }
    ],
    middle: [
        {
            clauseTopic: "Excluding our Proposal T&C from applying",
            negotiationResponse: "Seller's Terms and Conditions, Exceptions and Clarifications to apply to this contract alongside mutually agreed provisions.",
            internalGuidance: ""
        },
        {
            clauseTopic: "Pay When Paid",
            negotiationResponse: "Seller takes exception to pay-when-paid clause. If required, Customer must step in after 45 days of non-payment.",
            internalGuidance: ""
        },
        {
            clauseTopic: "Liquidated Damages",
            negotiationResponse: "If Liquidated Damages are required, they shall be limited to 0.5% per week with a maximum of 5% of contract value.",
            internalGuidance: ""
        },
        {
            clauseTopic: "Governing Law State other than Texas",
            negotiationResponse: "Governing law to be that of Texas, or alternatively Delaware if mutually agreed.",
            internalGuidance: ""
        },
        {
            clauseTopic: "Net 45, 60, 90, 120 and any payment term other than Net 30",
            negotiationResponse: "Payment terms of Net 45 may be acceptable with adjusted payment milestones. Net 60 requires additional consideration.",
            internalGuidance: ""
        }
    ],
    final: [
        {
            clauseTopic: "Excluding our Proposal T&C from applying",
            negotiationResponse: "Seller's Terms and Conditions to apply where not in conflict with agreed provisions.",
            internalGuidance: ""
        },
        {
            clauseTopic: "Pay When Paid",
            negotiationResponse: "Pay-when-paid acceptable with 60-day maximum and Customer guarantee thereafter.",
            internalGuidance: ""
        },
        {
            clauseTopic: "Liquidated Damages",
            negotiationResponse: "Liquidated Damages acceptable at 0.5% per week, maximum 10% of contract value, with grace period.",
            internalGuidance: ""
        },
        {
            clauseTopic: "Governing Law State other than Texas",
            negotiationResponse: "Governing law of Customer's state is acceptable if in the United States.",
            internalGuidance: ""
        },
        {
            clauseTopic: "Net 45, 60, 90, 120 and any payment term other than Net 30",
            negotiationResponse: "Payment terms up to Net 90 acceptable with appropriate financial considerations. Net 120 requires special approval.",
            internalGuidance: ""
        }
    ]
};

// Keep the original as a template for all topics
const DEFAULT_NEGOTIATION_TABLE = [
    {
        clauseTopic: "Excluding our Proposal T&C from applying",
        negotiationResponse: "Seller's Terms and Conditions, Exceptions and Clarifications to apply to this contract.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Pay When Paid",
        negotiationResponse: "Seller takes exception to any pay-when-paid or pay-if-paid clause.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Liquidated Damages",
        negotiationResponse: "Seller takes exception to Liquidated Damages.",
        internalGuidance: ""
    },
    {
        clauseTopic: "One sided or no Mutual Exclusion for Consequential Damages",
        negotiationResponse: "Seller request mutual exclusion for Consequential, Exemplary and Punitive damages.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Cancellation for Convenience",
        negotiationResponse: "Seller's Cancellation Schedule as shown on our proposal to apply.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Best Price Guarantee",
        negotiationResponse: "Seller takes exception to any form of Best Price Guarantee.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Governing Law State other than Texas",
        negotiationResponse: "Governing law to be that of Texas.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Dispute Resolution other than Houston, Tx",
        negotiationResponse: "Dispute resolution to be held in Harris County, Texas.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Parent Company Guarantee",
        negotiationResponse: "Seller can provide a Parent Company Guarantee or Performance Bond if cost of the Bond is to Purchaser's account.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Letter of Credit",
        negotiationResponse: "Seller takes exception to the requirement for a Letter of Credit. Seller can provide a Parent Company Guarantee or Performance Bond if cost of Bond is to Purchaser's account.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Performance Bond",
        negotiationResponse: "Seller can provide a Parent Company Guarantee or Performance Bond if cost of Bond is to Purchaser's account.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Warranty other than 12 month - Standard",
        negotiationResponse: "Seller's 12 month Standard Warranty to apply as noted in Seller's proposal.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Indemnity and release of Customer even if Customer is contributing",
        negotiationResponse: "To the extent (i.e., for that portion) attributable to Subcontractor's negligence, gross negligence or intentional misconduct.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Net 45, 60, 90, 120 and any payment term other than Net 30",
        negotiationResponse: "Seller takes exception to any term other than Net 30.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Payment Milestones",
        negotiationResponse: "Payment Milestones to be as shown in Seller's proposal.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Insurance Requirements",
        negotiationResponse: "Seller's standard Insurance coverage and limits to apply.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Retainage",
        negotiationResponse: "Seller takes exception to any retainage.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Intellectual Property Rights granted to Customer",
        negotiationResponse: "Designs, methods, techniques, processes, works of authorship and any intellectual property rights in any way incorporated in the Goods provided under the agreement shall at all times be owned by Seller, provided that Seller will agree to provide the Purchaser with a license solely for the purposes of using such intellectual property incorporated in the Goods for the maintenance, repair and operation of the Goods.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Dispute and continue to work",
        negotiationResponse: "Seller takes exception to confirming Fit for Purpose or Fit for Intended Use. Both concepts are too subjective and open for interpretation.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Fit for Purpose or Intended Use",
        negotiationResponse: "Seller takes exception to confirming Fit for Purpose or Fit for Intended Use. Both concepts are too subjective and open for interpretation.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Any specification of liability cost to Seller.",
        negotiationResponse: "Seller's maximum liability under this contract is limited to the value of the contract.",
        internalGuidance: ""
    },
    {
        clauseTopic: "Request for Seller to pay Purchaser's legal fees",
        negotiationResponse: "If Seller is found liable for any of Customer's legal fees, Seller will only agree to reasonable legal fees.",
        internalGuidance: ""
    }
];

// Complete the phase negotiations with all topics
function getCompletePhaseNegotiations() {
    const phaseData = JSON.parse(JSON.stringify(PHASE_NEGOTIATIONS));
    
    // For each phase, ensure all topics are covered
    Object.keys(phaseData).forEach(phase => {
        const existingTopics = phaseData[phase].map(item => item.clauseTopic);
        
        // Add missing topics with phase-specific variations
        DEFAULT_NEGOTIATION_TABLE.forEach(defaultItem => {
            if (!existingTopics.includes(defaultItem.clauseTopic)) {
                let modifiedResponse = defaultItem.negotiationResponse;
                
                // Modify response based on phase
                if (phase === 'initial') {
                    // Make responses more aggressive
                    modifiedResponse = modifiedResponse
                        .replace(/takes exception to/g, 'completely rejects')
                        .replace(/can provide/g, 'will not provide')
                        .replace(/may be acceptable/g, 'is not acceptable')
                        .replace(/if required/g, 'only if absolutely required and');
                } else if (phase === 'middle') {
                    // Keep moderate stance - no changes needed
                } else if (phase === 'final') {
                    // Make responses more flexible
                    modifiedResponse = modifiedResponse
                        .replace(/takes exception to/g, 'prefers to avoid but can accept')
                        .replace(/Seller's /g, 'Mutually agreed ')
                        .replace(/to apply/g, 'preferred but negotiable')
                        .replace(/must /g, 'should preferably ');
                }
                
                phaseData[phase].push({
                    clauseTopic: defaultItem.clauseTopic,
                    negotiationResponse: modifiedResponse,
                    internalGuidance: defaultItem.internalGuidance
                });
            }
        });
        
        // Sort by topic name for consistency
        phaseData[phase].sort((a, b) => a.clauseTopic.localeCompare(b.clauseTopic));
    });
    
    return phaseData;
}

// LM Studio (OpenAI-compatible) API base
const OPENAI_API_BASE = 'http://127.0.0.1:1234/v1';

const AVAILABLE_MODELS = {
    'local-model': {
        name: 'Local Model (LM Studio)',
        maxOutputTokens: 65536
    }
};

const MODEL_PRICING = {};

let selectedModel = localStorage.getItem('lm_model') || 'local-model';

window.onload = function() {
    currentPhase = localStorage.getItem('contract_negotiation_phase') || 'initial';
    document.getElementById('negotiationPhase').value = currentPhase;
    
    // Initialize conditional mods state before loading table
    showConditionalMods = false;
    
    // Initialize negotiation mode
    negotiationMode = localStorage.getItem('negotiation_mode') || 'strict';
    document.getElementById(`mode${negotiationMode.charAt(0).toUpperCase() + negotiationMode.slice(1)}`).checked = true;
    updateModeIndicator();
    
    // Add mode change listeners
    document.querySelectorAll('input[name="negotiationMode"]').forEach(radio => {
        radio.addEventListener('change', handleModeChange);
    });
    
    loadNegotiationTable();
    selectedModel = localStorage.getItem('lm_model') || selectedModel;
    initializeSettings();
    
    // Apply hidden state after table is loaded
    applyConditionalModsVisibility();
};

function checkApiKey() { /* No API key required for local LM Studio */ }

// Settings modal functions
function openSettingsModal() {
    document.getElementById('model-select').value = selectedModel;
    updateModelInfo();
    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function initializeSettings() {
    // Populate model select
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        modelSelect.innerHTML = '';
        Object.entries(AVAILABLE_MODELS).forEach(([modelId, modelInfo]) => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = modelInfo.name;
            modelSelect.appendChild(option);
        });
        modelSelect.value = selectedModel;
    }
    
    // Model select change
    if (modelSelect) {
        modelSelect.addEventListener('change', updateModelInfo);
    }
    
    // Save settings button
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }
}

function updateModelInfo() {
    const modelSelect = document.getElementById('model-select');
    const modelInfo = document.getElementById('model-info');
    if (modelSelect && modelInfo) {
        const selected = modelSelect.value;
        modelInfo.innerHTML = `Using local model: ${AVAILABLE_MODELS[selected]?.name || selected}`;
    }
}

function saveSettings() {
    const model = document.getElementById('model-select').value;
    
    if (model) {
        selectedModel = model;
        localStorage.setItem('lm_model', model);
    }
    
    closeSettingsModal();
    alert('Settings saved successfully!');
}

function loadNegotiationTable() {
    const savedKey = `contract_negotiation_table_${currentPhase}`;
    const saved = localStorage.getItem(savedKey);
    
    let table;
    if (saved) {
        table = JSON.parse(saved);
    } else {
        // Get phase-specific defaults
        const phaseNegotiations = getCompletePhaseNegotiations();
        table = phaseNegotiations[currentPhase];
    }
    
    const tbody = document.getElementById('negotiationTableBody');
    tbody.innerHTML = '';
    
    table.forEach((row) => {
        addNegotiationRow(row);
    });
}

function addNegotiationRow(data = {}) {
    const tbody = document.getElementById('negotiationTableBody');
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><textarea class="clause-topic" placeholder="Enter clause topic...">${data.clauseTopic || ''}</textarea></td>
        <td><textarea class="negotiation-response" placeholder="Enter seller's response...">${data.negotiationResponse || ''}</textarea></td>
        <td class="conditional-mod-cell"><textarea class="internal-guidance" placeholder="Add strategic notes, conditions, or implementation guidance...">${data.internalGuidance || ''}</textarea></td>
        <td><button onclick="deleteRow(this)" class="delete-row-btn">Delete</button></td>
    `;
    
    tbody.appendChild(row);
    
    const textareas = row.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('change', saveNegotiationTable);
    });
}

function deleteRow(button) {
    button.closest('tr').remove();
    saveNegotiationTable();
}

function saveNegotiationTable() {
    const rows = document.querySelectorAll('#negotiationTableBody tr');
    const table = [];
    
    rows.forEach(row => {
        const clauseTopic = row.querySelector('.clause-topic').value;
        const negotiationResponse = row.querySelector('.negotiation-response').value;
        const internalGuidance = row.querySelector('.internal-guidance').value;
        
        if (clauseTopic || negotiationResponse) {
            table.push({
                clauseTopic,
                negotiationResponse,
                internalGuidance
            });
        }
    });
    
    const savedKey = `contract_negotiation_table_${currentPhase}`;
    localStorage.setItem(savedKey, JSON.stringify(table));
}

function changeNegotiationPhase() {
    const phaseSelect = document.getElementById('negotiationPhase');
    currentPhase = phaseSelect.value;
    localStorage.setItem('contract_negotiation_phase', currentPhase);
    loadNegotiationTable();
}

function resetToDefault() {
    if (confirm('Are you sure you want to reset the negotiation table to default values for the current phase?')) {
        const savedKey = `contract_negotiation_table_${currentPhase}`;
        localStorage.removeItem(savedKey);
        loadNegotiationTable();
    }
}

function toggleAdvancedSettings() {
    const content = document.getElementById('advancedContent');
    const arrow = document.getElementById('advancedArrow');
    
    if (content.style.display === 'block') {
        content.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    } else {
        content.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Accept both PDF and Word documents
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
        alert('Please upload a PDF or Word (.docx) file');
        return;
    }
    
    uploadedFile = file;
    displayFileInfo(file);
}

function displayFileInfo(file) {
    const fileInfo = document.getElementById('fileInfo');
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    
    fileInfo.innerHTML = `
        <div class="file-info">
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-semibold text-gray-800">${file.name}</p>
                    <p class="text-sm text-gray-600">${sizeMB} MB</p>
                </div>
                <button onclick="removeFile()" class="text-red-600 hover:text-red-800">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

function removeFile() {
    uploadedFile = null;
    document.getElementById('fileInfo').innerHTML = '';
    document.getElementById('fileInput').value = '';
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}

async function extractTextFromWord(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const arrayBuffer = event.target.result;
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                resolve(result.value);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = error => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

async function analyzeContract() {
    if (!uploadedFile) {
        alert('Please upload a Customer T&C document');
        return;
    }
    
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('resultSection').style.display = 'none';
    
    try {
        let result;
        const isWordDocument = uploadedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        
        if (isWordDocument) {
            // For Word documents, extract text first
            const extractedText = await extractTextFromWord(uploadedFile);
            result = await analyzeWithLocalModel(extractedText, true);
        } else {
            // For PDFs, extract text first (LM Studio)
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(t => t.str).join(' ') + '\n\n';
            }
            pdf.destroy();
            result = await analyzeWithLocalModel(fullText, true);
        }
        
        displayResult(result);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error analyzing contract: ' + error.message);
    } finally {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}

async function analyzeWithLocalModel(contractData, isText = false) {
    const negotiationTable = getNegotiationTable();
    
    // Get custom prompt or use mode-specific default
    const customPrompt = localStorage.getItem('contract_custom_prompt');
    let promptTemplate;
    
    if (customPrompt) {
        // If there's a custom prompt, check if it needs mode-specific modifications
        if (!customPrompt.includes('STRICT MODE:') && !customPrompt.includes('CREATIVE MODE:')) {
            // Add mode-specific instruction to custom prompt
            const modeInstruction = negotiationMode === 'strict' 
                ? '5. STRICT MODE: Only modify clauses that already exist in the customer\'s document. DO NOT add any new clauses or sections, even if topics from the negotiation table are missing.'
                : '5. CREATIVE MODE: If a topic from the negotiation table is missing from the customer\'s document, PROACTIVELY ADD a new clause using the "Negotiation Response" column (enhanced by any applicable Internal Guidance). Insert these new clauses in appropriate sections of the contract.';
            promptTemplate = customPrompt.replace(/5\.[^\n]+/, modeInstruction);
        } else {
            promptTemplate = customPrompt;
        }
    } else {
        // Use mode-specific default prompt
        promptTemplate = negotiationMode === 'strict' ? PROMPT_STRICT_MODE : PROMPT_CREATIVE_MODE;
    }
    
    // Replace the negotiationTable variable in the prompt
    const prompt = promptTemplate.replace('${negotiationTable}', JSON.stringify(negotiationTable, null, 2));

    // Build OpenAI-style messages
    const userContent = `${prompt}\n\nCONTRACT DOCUMENT (TEXT):\n\n${contractData}`;
    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: selectedModel,
            temperature: 0.1,
            messages: [
                { role: 'system', content: 'Return ONLY the fully redlined contract text using ~~ and ** formatting.' },
                { role: 'user', content: userContent }
            ]
        })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'API request failed');
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('No valid response from local model');
    trackApiUsage(prompt, text);
    return text;
}

function toggleConditionalModifications() {
    showConditionalMods = !showConditionalMods;
    
    // Update button text
    const btn = document.getElementById('toggleCondModBtn');
    btn.textContent = showConditionalMods ? '−' : '+';
    
    // Toggle visibility
    const header = document.querySelector('.conditional-mod-header');
    const cells = document.querySelectorAll('.conditional-mod-cell');
    
    if (showConditionalMods) {
        header.style.display = '';
        cells.forEach(cell => cell.style.display = '');
        
        // Restore original widths
        document.querySelectorAll('#negotiationTable th')[0].style.width = '25%';
        document.querySelectorAll('#negotiationTable th')[1].style.width = '45%';
        document.querySelectorAll('#negotiationTable th')[2].style.width = '25%';
        document.querySelectorAll('#negotiationTable th')[3].style.width = '10%';
    } else {
        header.style.display = 'none';
        cells.forEach(cell => cell.style.display = 'none');
        
        // Adjust widths when hidden
        document.querySelectorAll('#negotiationTable th')[0].style.width = '30%';
        document.querySelectorAll('#negotiationTable th')[1].style.width = '60%';
        document.querySelectorAll('#negotiationTable th')[3].style.width = '10%';
    }
    
    // Save state
    localStorage.setItem('showInternalGuidance', showConditionalMods);
}

function getNegotiationTable() {
    const savedKey = `contract_negotiation_table_${currentPhase}`;
    const saved = localStorage.getItem(savedKey);
    
    if (saved) {
        return JSON.parse(saved);
    } else {
        const phaseNegotiations = getCompletePhaseNegotiations();
        return phaseNegotiations[currentPhase];
    }
}

function displayResult(redlinedContract) {
    document.getElementById('resultSection').style.display = 'block';
    
    const formattedContent = redlinedContract
        .replace(/~~([^~]+)~~/g, '<del>$1</del>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    
    document.getElementById('redlinedContent').innerHTML = formattedContent;
}

function downloadRedlinedContract() {
    const content = document.getElementById('redlinedContent').innerHTML;
    const date = new Date().toISOString().split('T')[0];
    const modeLabel = negotiationMode.charAt(0).toUpperCase() + negotiationMode.slice(1);
    const filename = `Seller T&C Redline Negotiations Response (${modeLabel} Mode) to Customer Terms and Condition Contract @ ${date}.html`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Redlined Contract - ${date}</title>
    <style>
        body {
            font-family: Georgia, serif;
            line-height: 1.8;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            color: #1f2937;
        }
        h1 {
            text-align: center;
            color: #38543C;
            margin-bottom: 30px;
        }
        del {
            text-decoration: line-through;
            color: #dc2626;
            background-color: #fee2e2;
        }
        strong {
            color: #059669;
            background-color: #d1fae5;
            font-weight: bold;
        }
        .header-info {
            border-bottom: 2px solid #38543C;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header-info">
        <h1>Seller T&C Redline Negotiations Response</h1>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Document:</strong> Customer Terms and Condition Contract</p>
        <p><strong>Purpose:</strong> Redlined version favorable to Seller</p>
    </div>
    
    <div class="content">
        ${content}
    </div>
    
    <div class="footer">
        <p>Generated by Hunter-AI Contract Helper</p>
        <p>This redlined document represents the Seller's negotiation position</p>
    </div>
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function toggleDownloadMenu() {
    const menu = document.getElementById('download-menu');
    menu.classList.toggle('hidden');
    
    // Close menu when clicking outside
    if (!menu.classList.contains('hidden')) {
        setTimeout(() => {
            document.addEventListener('click', closeDownloadMenuOnClickOutside);
        }, 100);
    }
}

function closeDownloadMenu() {
    document.getElementById('download-menu').classList.add('hidden');
    document.removeEventListener('click', closeDownloadMenuOnClickOutside);
}

function closeDownloadMenuOnClickOutside(event) {
    const menu = document.getElementById('download-menu');
    const button = event.target.closest('button[onclick*="toggleDownloadMenu"]');
    
    if (!menu.contains(event.target) && !button) {
        closeDownloadMenu();
    }
}

async function downloadAsDocx() {
    console.log('downloadAsDocx called');
    try {
        // Check if docx is available
        if (typeof window.docx === 'undefined') {
            console.error('docx library not loaded');
            alert('Word export library is not loaded. Please refresh the page and try again.');
            return;
        }
        
        console.log('docx library found:', window.docx);
        
        // Get components from window.docx
        const { Document, Packer, Paragraph, TextRun } = window.docx;
    
    // Get the raw content with markup
    const contentElement = document.getElementById('redlinedContent');
    const rawHtml = contentElement.innerHTML;
    
    // Parse the HTML to extract text and formatting
    const paragraphs = [];
    const date = new Date().toISOString().split('T')[0];
    const modeLabel = negotiationMode.charAt(0).toUpperCase() + negotiationMode.slice(1);
    
    // Add header information
    paragraphs.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: "Seller T&C Redline Negotiations Response",
                    bold: true,
                    size: 32,
                    color: "38543C"
                })
            ],
            spacing: { after: 400 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Date: ", bold: true }),
                new TextRun({ text: date })
            ],
            spacing: { after: 200 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Document: ", bold: true }),
                new TextRun({ text: "Customer Terms and Condition Contract" })
            ],
            spacing: { after: 200 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Mode: ", bold: true }),
                new TextRun({ text: `${modeLabel} Mode` })
            ],
            spacing: { after: 200 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Purpose: ", bold: true }),
                new TextRun({ text: "Redlined version favorable to Seller" })
            ],
            spacing: { after: 600 }
        })
    );
    
    // Convert HTML content to Word paragraphs
    const lines = rawHtml.split('<br>');
    
    for (const line of lines) {
        const textRuns = [];
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = line;
        
        // Process the line to extract text and formatting
        function processNode(node) {
            if (node.nodeType === 3) { // Text node
                const text = node.textContent;
                if (text.trim()) {
                    textRuns.push(new TextRun({ text }));
                }
            } else if (node.nodeName === 'DEL') {
                textRuns.push(new TextRun({
                    text: node.textContent,
                    strike: true,
                    color: "DC2626"
                }));
            } else if (node.nodeName === 'STRONG') {
                textRuns.push(new TextRun({
                    text: node.textContent,
                    bold: true,
                    color: "059669",
                    highlight: "lightGreen"
                }));
            } else {
                // Process child nodes
                for (const child of node.childNodes) {
                    processNode(child);
                }
            }
        }
        
        // Process all nodes in the line
        for (const child of tempDiv.childNodes) {
            processNode(child);
        }
        
        if (textRuns.length > 0) {
            paragraphs.push(new Paragraph({
                children: textRuns,
                spacing: { after: 200 }
            }));
        }
    }
    
    // Add footer
    paragraphs.push(
        new Paragraph({ text: "", spacing: { before: 600 } }),
        new Paragraph({
            children: [
                new TextRun({
                    text: "Generated by Hunter-AI Contract Helper",
                    italics: true,
                    size: 20,
                    color: "6B7280"
                })
            ],
            alignment: "center"
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: "This redlined document represents the Seller's negotiation position",
                    italics: true,
                    size: 20,
                    color: "6B7280"
                })
            ],
            alignment: "center"
        })
    );
    
    // Create the document
    const doc = new Document({
        sections: [{
            properties: {},
            children: paragraphs
        }]
    });
    
    // Generate and download the file
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Seller T&C Redline Response (${modeLabel} Mode) @ ${date}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    } catch (error) {
        console.error('Error generating Word document:', error);
        alert('Error generating Word document. Please check the console for details.');
    }
}

function trackApiUsage(prompt, response) {
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(response.length / 4);
    const totalCost = 0;
    
    console.log(`API Usage - Model: ${selectedModel}`);
    console.log(`Input tokens: ${inputTokens}`);
    console.log(`Output tokens: ${outputTokens}`);
    console.log(`Total cost: $${totalCost.toFixed(6)}`);
}

// Tab switching functionality
function switchTab(tabName) {
    // Update tab buttons
    const tabs = ['playbook', 'prompt'];
    tabs.forEach(tab => {
        const tabBtn = document.getElementById(`tab-${tab}`);
        const content = document.getElementById(`content-${tab}`);
        
        if (tab === tabName) {
            tabBtn.classList.remove('text-gray-500');
            tabBtn.classList.add('text-[var(--hunter-green)]', 'border-b-2', 'border-[var(--hunter-green)]', 'bg-white');
            content.classList.remove('hidden');
        } else {
            tabBtn.classList.add('text-gray-500');
            tabBtn.classList.remove('text-[var(--hunter-green)]', 'border-b-2', 'border-[var(--hunter-green)]', 'bg-white');
            content.classList.add('hidden');
        }
    });
}

// Save custom prompt
function saveCustomPrompt() {
    const customPrompt = document.getElementById('custom-prompt').value;
    localStorage.setItem('contract_custom_prompt', customPrompt);
    alert('Custom prompt saved successfully!');
}

// Reset to default prompt
function resetDefaultPrompt() {
    const defaultPrompt = negotiationMode === 'strict' ? PROMPT_STRICT_MODE : PROMPT_CREATIVE_MODE;
    document.getElementById('custom-prompt').value = defaultPrompt;
    localStorage.removeItem('contract_custom_prompt');
    alert('Prompt reset to default!');
}

// Load custom prompt or default
function loadPrompt() {
    const savedPrompt = localStorage.getItem('contract_custom_prompt');
    const promptTextarea = document.getElementById('custom-prompt');
    if (promptTextarea) {
        const defaultPrompt = negotiationMode === 'strict' ? PROMPT_STRICT_MODE : PROMPT_CREATIVE_MODE;
        promptTextarea.value = savedPrompt || defaultPrompt;
    }
}

// Helper function to apply conditional mods visibility
function applyConditionalModsVisibility() {
    const header = document.querySelector('.conditional-mod-header');
    const cells = document.querySelectorAll('.conditional-mod-cell');
    const btn = document.getElementById('toggleCondModBtn');
    
    if (header && btn) {
        if (showConditionalMods) {
            header.style.display = '';
            cells.forEach(cell => cell.style.display = '');
            btn.textContent = '−';
            
            // Restore original widths
            document.querySelectorAll('#negotiationTable th')[0].style.width = '25%';
            document.querySelectorAll('#negotiationTable th')[1].style.width = '45%';
            document.querySelectorAll('#negotiationTable th')[2].style.width = '25%';
            document.querySelectorAll('#negotiationTable th')[3].style.width = '10%';
        } else {
            header.style.display = 'none';
            cells.forEach(cell => cell.style.display = 'none');
            btn.textContent = '+';
            
            // Adjust widths for hidden state
            document.querySelectorAll('#negotiationTable th')[0].style.width = '30%';
            document.querySelectorAll('#negotiationTable th')[1].style.width = '60%';
            document.querySelectorAll('#negotiationTable th')[3].style.width = '10%';
        }
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs
    document.getElementById('tab-playbook')?.addEventListener('click', () => switchTab('playbook'));
    document.getElementById('tab-prompt')?.addEventListener('click', () => switchTab('prompt'));
    
    // Load prompt
    loadPrompt();
});

// Handle negotiation mode change
function handleModeChange(event) {
    negotiationMode = event.target.value;
    localStorage.setItem('negotiation_mode', negotiationMode);
    updateModeIndicator();
}

// Update mode indicator
function updateModeIndicator() {
    const indicator = document.getElementById('modeIndicator');
    if (indicator) {
        const isStrict = negotiationMode === 'strict';
        indicator.className = `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            isStrict ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`;
        indicator.innerHTML = `
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                ${isStrict 
                    ? '<path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>'
                    : '<path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path>'
                }
            </svg>
            ${isStrict ? 'Strict Mode' : 'Creative Mode'}
        `;
    }
}