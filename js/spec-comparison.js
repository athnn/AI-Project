// LM Studio (OpenAI-compatible) API base
const OPENAI_API_BASE = 'http://127.0.0.1:1234/v1';

// Pricing removed for local LM usage
const MODEL_PRICING = {};

// Global variables
let proposalFile = null;
let specFiles = [];

// API key not required for local LM Studio
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
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            
            // Update icon
            const eyeIcon = toggleVisibilityBtn.querySelector('svg');
            if (isPassword) {
                // Show "eye-off" icon
                eyeIcon.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                `;
            } else {
                // Show "eye" icon
                eyeIcon.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                `;
            }
        });
    }

    // Save settings (no API key needed)
    saveSettingsBtn.addEventListener('click', () => {
        const selectedModel = modelSelect.value;
        setSelectedModel(selectedModel);
        closeSettingsModal();
        alert(`Settings saved successfully!\n\nUsing model: ${AVAILABLE_MODELS[selectedModel]}`);
    });
}

function updateModelInfoInModal(model) {
    const modelInfo = document.getElementById('model-info');
    if (modelInfo) {
        const modelName = AVAILABLE_MODELS[model] || 'Local Model (LM Studio)';
        modelInfo.textContent = `Using: ${modelName}`;
    }
}

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const apiKeyInput = document.getElementById('api-key-input');
    const modelSelect = document.getElementById('model-select');
    
    if (modal) {
        // Reset form
        if (apiKeyInput) {
            apiKeyInput.value = '';
            apiKeyInput.type = 'password';
        }
        
        if (modelSelect) {
            modelSelect.value = getSelectedModel();
            updateModelInfoInModal(getSelectedModel());
        }
        
        modal.classList.remove('hidden');
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Make functions globally accessible
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    const proposalInput = document.getElementById('proposal-file');
    const specInput = document.getElementById('spec-files');
    const compareBtn = document.getElementById('compare-btn');
    const specialRequestTextarea = document.getElementById('special-request');

    // Set up the UI
    addSettingsModal();

    // Load saved special request
    const savedSpecialRequest = localStorage.getItem('specialRequest');
    if (savedSpecialRequest) {
        specialRequestTextarea.value = savedSpecialRequest;
    }

    // Save special request on change
    specialRequestTextarea.addEventListener('input', function() {
        localStorage.setItem('specialRequest', this.value);
    });

    proposalInput.addEventListener('change', handleProposalFile);
    specInput.addEventListener('change', handleSpecFiles);
    compareBtn.addEventListener('click', startComparison);

    updateCompareButton();
    
    // Initialize advanced settings
    initializeAdvancedSettings();
    
    // Initialize drag and drop functionality
    initializeDragAndDrop();
    
    // Initialize preview functionality
    initializePreviewFunctionality();
});

// Advanced Settings Toggle and Tab Functionality
function initializeAdvancedSettings() {
    const toggleButton = document.getElementById('advanced-settings-toggle');
    const content = document.getElementById('advanced-settings-content');
    const toggleIcon = document.getElementById('advanced-toggle-icon');
    const tabSpecial = document.getElementById('tab-special');
    const tabAnalysis = document.getElementById('tab-analysis');
    const contentSpecial = document.getElementById('content-special');
    const contentAnalysis = document.getElementById('content-analysis');
    const specialRequestTextarea = document.getElementById('special-request');
    const analysisInstructionsTextarea = document.getElementById('custom-analysis-instructions');
    
    if (!toggleButton || !content || !toggleIcon || !tabSpecial || !tabAnalysis || !contentSpecial || !contentAnalysis || !analysisInstructionsTextarea) {
        console.error('Advanced settings elements not found');
        return;
    }
    
    // Initialize analysis instructions textarea
    analysisInstructionsTextarea.value = getDefaultSpecAnalysisInstructions();
    
    // Load saved instructions if available
    const savedInstructions = localStorage.getItem('custom_spec_analysis_instructions');
    if (savedInstructions) {
        analysisInstructionsTextarea.value = savedInstructions;
    }
    
    // Load saved special request
    const savedSpecialRequest = localStorage.getItem('specialRequest');
    if (savedSpecialRequest && specialRequestTextarea) {
        specialRequestTextarea.value = savedSpecialRequest;
    }
    
    // Main toggle functionality
    toggleButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        const isHidden = content.classList.contains('hidden');
        
        if (isHidden) {
            content.classList.remove('hidden');
            toggleIcon.style.transform = 'rotate(180deg)';
        } else {
            content.classList.add('hidden');
            toggleIcon.style.transform = 'rotate(0deg)';
        }
    });
    
    // Tab switching functionality
    function switchTab(activeTab, activeContent, inactiveTab, inactiveContent, activeColor) {
        // Update tab appearance
        activeTab.className = `flex-1 px-6 py-3 text-sm font-medium text-[${activeColor}] border-b-2 border-[${activeColor}] bg-white transition-colors duration-200`;
        inactiveTab.className = 'flex-1 px-6 py-3 text-sm font-medium text-gray-500 hover:text-[var(--hunter-blue)] transition-colors duration-200';
        
        // Update content visibility
        activeContent.classList.remove('hidden');
        inactiveContent.classList.add('hidden');
    }
    
    // Tab click handlers
    tabSpecial.addEventListener('click', function(e) {
        e.preventDefault();
        switchTab(tabSpecial, contentSpecial, tabAnalysis, contentAnalysis, 'var(--hunter-green)');
    });
    
    tabAnalysis.addEventListener('click', function(e) {
        e.preventDefault();
        switchTab(tabAnalysis, contentAnalysis, tabSpecial, contentSpecial, 'var(--hunter-blue)');
    });
    
    // Save functionality
    if (specialRequestTextarea) {
        specialRequestTextarea.addEventListener('input', function() {
            localStorage.setItem('specialRequest', this.value);
        });
    }
    
    analysisInstructionsTextarea.addEventListener('input', function() {
        localStorage.setItem('custom_spec_analysis_instructions', this.value);
    });
}

// Get default specification analysis instructions (editable part only)
function getDefaultSpecAnalysisInstructions() {
    return `ANALYSIS INSTRUCTIONS:

STEP 1: UNDERSTAND THE PROPOSAL STRUCTURE
The proposal document typically follows this structure:

Document Header Information
    • Company Name
    • Customer Name
    • Project Name
    • Destination
    • Salesperson Name
    • Revision Number
    • Certification Information (e.g., TDL&R Certified: IHM #:[Value], IHB #:[Value])
    • Proposal Number
    • Estimator Initials
    • Reviewed By Initials

I. Bid Rev
    • Initial Budgetary Proposal +/-[Percentage]%
        ◦ Description: [Description Text]
        ◦ Est Init Date: [Initials] [Date]
    • [Revision Description e.g., Update proposal to No hurricane rating, GP interior/exterior per email sent on [Date]]
        ◦ Description: [Description Text]
        ◦ Est Init Date: [Initials] [Date]

II. Design Information
    • Structure
        ◦ Nominal Structure Width: [Value]
        ◦ Nominal Structure Length: [Value]
        ◦ Nominal Structure Height: [Value]
        ◦ Module Configuration:
            ▪ Total Mod Qty = [Value]
            ▪ [Configuration Details e.g., X Wide x Y Long]
    • Electrical Criteria
        ◦ Exterior Electrical Area Classification: [Classification Type]
        ◦ Interior Electrical Classification: [Classification Type]
        ◦ Service Entry & HVAC Voltage: [Voltage/Phase/Wire Details]
        ◦ Building Internal Services Distribution Voltage: [Voltage/Phase/Wire Details]

III. Exterior Construction Details
    • Steel Structure
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Base: [Description]
            ▪ Siding: [Description]
            ▪ Roof: [Description]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Tie Off (per module): [Description]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Lifting (per module): [Description]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Grounding: [Description]
    • Coating System
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Surface Preparation: [Location], [Standard/Method]
            ▪ Primer: [Location], [Material/Thickness]
            ▪ Intermediate Coat: [Location], [Material/Thickness]
            ▪ Finish Coat: [Location], [Material/Color]

IV. Client-Use Penetrations
    • [Status e.g., None Requested or List of Penetrations]

V. Interior Construction Details
    • Floor
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Decking: [Description]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Vapor Barrier: [Description]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Insulation: [Description, R-Value]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Standard Covering: [Description, Material, Brand/Model]
    • Perimeter Interior Walls
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Framing: [Description]
            ▪ (Framing includes) Ceiling Height: [Value]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Vapor Barrier: [Description]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Standard Covering: [Description, Material, Type, Color]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Insulation: [Description, R-Value]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Cove Base: [Description, Color]
    • Ceiling
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Suspended Ceiling: [Description, Pattern, Brand]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Insulation: [Description, R-Value]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Sub-Ceiling: [Description]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Vapor Barrier: [Description]

VI. Doors and Windows
    • Doors (Repeat for each door type if necessary)
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Size (e.g., [Width]" x [Height]"): [Description of Door Type, Features]
    • Exterior Door Accessories
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Nameplates: [Description]

VII. Plumbing, Fixtures, and Accessories
    • [Status e.g., None Required or List of Items]

VIII. Electrical
    • Wire Type: [General Specification]
    • Raceway:
        ◦ Interior: [Type/Specification]
        ◦ Exterior: [Type/Specification]
    • Disconnect Switch(es)
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Disconnect (Service Entry): [Specifications: VAC, Phase, Amps, Rating, Brand # Model]
    • Panelboard(s)
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Loadcenter [Phase Type]:
            ▪ Voltage: [Specification]
            ▪ Main Breaker Rating: [Value]A
            ▪ Main Bus Rating: [Value]A
            ▪ Qty Ckts: [Value]
            ▪ Mounting: [Type]
    • Lighting
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Interior LED ([Mounting Type e.g., flush]): [Specification, Lumens, Features]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Interior Emergency/Exit: [Specification, Features]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Exterior LED ([Area Type e.g., GP]): [Specification, Features]
    • Receptacles
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Indoor ([Purpose e.g., convenience]): [NEMA Type, VAC, Amps, Style, Cover Plate]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Outdoor ([Area Type e.g., GP]): [NEMA Type, VAC, Amps, Style, Features]
        ◦ [General Note e.g., All wall mounted convenience receptacles, except at countertops, mounted [Height]" AFF.]

IX. Communications
    • [Status e.g., None Required or List of Systems/Items]

X. Fire & Gas Detection/Protection
    • [System Type e.g., Standalone Fire Detection & Protection Devices (Unsupervised)]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Smoke Detector ([Location e.g., room]): [Specification]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Auxiliary Relay: [Specification/Function]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Fire Extinguisher & Cabinet: [Specification, Rating, Size, Type]

XI. HVAC
    • Components for [Application Type e.g., General Purpose (Non-Hazardous) Application]
        ◦ Air Conditioning Unit(s)
            ▪ Qty: [Value], U/M: [Unit]
            ▪ Condenser Section Rating: [Type]
            ▪ Mounting Style: [Type]
            ▪ Refrigerant: [Type]
            ▪ Fresh Air Intake: [Type]
            ▪ Thermostat: [Type]
            ▪ Humidity Control Required: [Yes/No/Specification]
            ▪ Standard Unit Options:
            ▪ [Option 1 e.g., High/Low Pressure Switches]
            ▪ [Option 2 e.g., Low Ambient Controls]
            ▪ Voltage: [Specification]
            ▪ Electric Heat: [Value]kW
            ▪ Nominal Capacity (Total BtuH): [Value]BtuH
            ▪ Unit MCA: [Value]A
            ▪ Unit Max OCP Rating: [Value]A
            ▪ Distribution (S/A): [Description or "See below"]
            ▪ Distribution (R/A): [Description]
            ▪ Redundancy: [Status]
        ◦ Supply Air Ductwork
            ▪ Qty: [Value], U/M: [Unit]
            ▪ [Description, Materials, Standards]
    • HVAC Notes
        ◦ [Note Number]. [Note Text]

XII. Cabinetry
    • [Status e.g., None Required or List of Items/Specifications]

XIII. Furnishings & Equipment
    • [Status e.g., None Required or List of Items/Specifications]

XIV. Exclusions
    • General Exclusions
        ◦ [Introductory statement e.g., Unless otherwise agreed upon by the parties in writing, the following are expressly excluded from HBM's scope of work and proposed cost set forth herein:]
        1. [Exclusion Clause Text]
        2. [Exclusion Clause Text]
        ◦ ... (Continue for all exclusion clauses)

XV. General Conditions and Clarifications
    • General Conditions and Clarifications
        1. [Condition/Clarification Text]
        2. [Condition/Clarification Text]
        ◦ ... (Continue for all conditions/clarifications, including sub-points if any)
        ◦ [Specific Point e.g., 20. The HBM proposal is a preliminary estimate...]
            ▪ o [Sub-point Text]
            ▪ o [Sub-point Text]

XVI. Delivery
    • [Statement regarding delivery date basis and potential adjustments]

XVII. Documentation
    • [Statement on electronic format and signature validity]
    • [Statement on engineering time, drawing sets, and revision cycles]
    • Review / Revision Cycle - [Description of the cycle and timeframe]
    • Confirmation Cycle - [Description of the cycle and timeframe]
    • [Statement on changes after IFC drawings and potential costs]
    • [List of provided documentation/services e.g., Third Party plan review, PE stamped drawings (with scope), COMcheck report, etc.]

XVIII. Pricing
    • Base Bid: [Item Name] - [Currency Symbol][Amount]
    • Total: [Item Description e.g., Building Price] - [Currency Symbol][Amount]
    • Option: [Option Name/Description] - [Price or "Upon Request"]
    • Option: [Option Name/Description] - [Price or "Upon Request"]
    • Option: Estimated Freight ([Destination]) - [Currency Symbol][Amount]
    • [Note on Freight Pricing e.g., Freight pricing is only a Rough Order of Magnitude price. Freight will be based on actual cost at time of shipping.]

XIX. Terms
    • [Payment terms description, e.g., Payment terms are net [Number] days from the date of HBM's invoice. Price change conditions.]

XX. Payment Schedule
    • [Percentage]% Upon [Condition e.g., PO Placement]
    • [Percentage]% Upon [Condition e.g., Submittal of Approval Drawings]
    • [Percentage]% Upon [Condition e.g., Structural Fabrication Completion (scope limitations)]
    • [Percentage]% Upon [Condition e.g., Client Inspection at Hunter's Facility]
    • Freight, if applicable [Timing e.g., at Time of Shipment]

XXI. Cancellation
    • [Introductory statement about cancellation charges and responsibility for non-returnable materials/engineered systems:]
        ◦ [Percentage]% After [Condition e.g., Submittal of Approval Drawings]
        ◦ [Percentage]% After [Condition e.g., Development of Bills of Material]
        ◦ [Percentage]% After [Condition e.g., Materials Purchase Orders are Issued]
        ◦ [Percentage]% After [Condition e.g., Steel Fabrication]
        ◦ [Percentage]% After [Condition e.g., Interior Fit and Finish]

XXII. Certifications
    • [Image Placeholder or Text for Certification Logo/Name]
    • [Certifying Body Name]
    • [Certification Status e.g., CERTIFIED MANUFACTURER]

XXIII. Freight
    • [Shipping Term e.g., FOB]
    • Module # [Module Identifier, if applicable]
        ◦ Est. Dimension (WxLxH): [Value]
        ◦ Estimated Weight: [Value Range] lbs
        ◦ [Cost e.g., [Currency Symbol][Amount]]
    • [Note on Estimated Weight/Freight Cost e.g., Estimated weight provided. Estimated freight cost/weight is subject to change based on actual cost/weight at the time of shipping]

XXIV. Warranty
    • STANDARD WARRANTY: [General description of warranty coverage, duration, and remedies, limitations, and void conditions.]
    • TURNKEY WARRANTY: [General description if applicable, scope, duration.]
    • NO WORRIES WARRANTY: [General description if applicable, scope.]
    • [Instruction to contact sales representative for more information.]

XXV. Storage
    • [Introductory statement about when storage fees apply and that they are per-day.]
        ◦ [Currency Symbol][Amount] per Square Foot: [Condition e.g., Outdoor Storage without power to unit]
        ◦ [Currency Symbol][Amount] per Square Foot: [Condition e.g., Indoor Storage without power to unit]
        ◦ [Currency Symbol][Amount] per Square Foot: [Condition e.g., Outdoor Storage without power to unit, on and after [Number] days]
        ◦ [Currency Symbol][Amount] per Square Foot: [Condition e.g., Indoor Storage without power to unit, on and after [Number] days]

STEP 2: ANALYZE SPECIFICATION COMPLIANCE
Using the proposal structure above as a guide, identify and analyze:

1. Extract ALL requirements from the specification document, including:
   - Design information (building dimensions, configuration, module details)
   - Electrical criteria and classifications
   - Exterior construction details (steel structure, coating systems)
   - Client-use penetrations and custom openings
   - Interior construction details (floor, walls, ceiling specifications)
   - Doors and windows specifications
   - Plumbing, fixtures, and accessories requirements
   - Electrical systems (wire types, raceways, panels, lighting, receptacles)
   - Communications systems and requirements
   - Fire & gas detection/protection systems (detection devices, smoke detectors, auxiliary relays, fire extinguishers & cabinets, system supervision requirements)
   - HVAC systems and components (air conditioning units, condenser specifications, mounting requirements, refrigerant types, fresh air intake, thermostats, humidity control, voltage requirements, electric heat capacity, ductwork specifications, distribution systems, redundancy requirements)
   - Cabinetry specifications
   - Furnishings & equipment requirements
   - Project exclusions and scope limitations
   - General conditions and clarifications
   - Delivery requirements and timelines
   - Documentation requirements (drawings, reports, certifications)
   - Pricing structure and payment terms
   - Payment schedule requirements
   - Cancellation terms and conditions
   - Required certifications and standards compliance
   - Freight and shipping requirements
   - Warranty specifications and coverage
   - Building codes, classifications, and regulatory compliance
   - Performance specifications and testing criteria
   - Materials and finishes specifications
   - Structural requirements and standards
   - Quality standards and inspection requirements
   - Special features or custom requirements
   - Environmental and safety requirements

2. For EACH requirement found in the specification:
   - Locate where in the proposal this requirement should be addressed (using the structure above)
   - Check if the proposal actually addresses this requirement
   - Compare the proposed solution against the specified requirement
   - Determine compliance status: MEETS or DOES NOT MEET
   - Note any missing information or unclear specifications
   - Identify deviations or alternatives proposed

3. Output as JSON following the exact schema provided. For each specification requirement:
   - Create a comparisonTable entry with specSection, specRequirement, proposalResponse, status, and comment
   - Use status: "MEETS" only when proposal fully satisfies the requirement
   - Use status: "DOES NOT MEET" when proposal addresses but doesn't satisfy the requirement  
   - Use status: "NOT ADDRESSED" when requirement is completely missing from proposal
   - Include clear, factual comments explaining the assessment

4. Keep all assessments factual and objective - no recommendations, just compliance facts.

CRITICAL: CAPTURE EVERYTHING
The structure above is a GUIDE to help you navigate the proposal, but you MUST also check for any specification requirements that don't fit this standard format. Every requirement in the specification document must be evaluated, whether or not it aligns with the typical proposal structure. Do not skip any requirements just because they seem unusual or don't have an obvious place in the standard format.`;
}

// Handle proposal file upload
function handleProposalFile(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        proposalFile = file;
        showProposalInlinePreview(file);
        updateCompareButton();
    } else {
        alert('Please select a PDF file.');
    }
}

// Handle specification files upload
function handleSpecFiles(event) {
    const files = Array.from(event.target.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
        alert('Please select only PDF files.');
        return;
    }
    
    if (pdfFiles.length === 0) {
        return;
    }
    
    // Check if we're adding to existing files
    const isAddingMore = specFiles.length > 0;
    
    if (isAddingMore) {
        // Add new files to existing array, avoiding duplicates
        pdfFiles.forEach(newFile => {
            const isDuplicate = specFiles.some(existingFile => 
                existingFile.name === newFile.name && existingFile.size === newFile.size
            );
            if (!isDuplicate) {
                specFiles.push(newFile);
            }
        });
    } else {
        // First time upload
        specFiles = pdfFiles;
    }
    
    updateSpecFileDisplay();
}

// Update the specification files display
function updateSpecFileDisplay() {
    const uploadContent = document.getElementById('upload-content-specs');
    const specInfo = document.getElementById('spec-info');
    const specCount = document.getElementById('spec-count');
    const specList = document.getElementById('spec-list');
    
    if (specFiles.length === 0) {
        uploadContent.classList.remove('hidden');
        specInfo.classList.add('hidden');
        return;
    }
    
    specCount.textContent = `${specFiles.length} file(s) selected`;
    
    // Clear existing list
    specList.innerHTML = '';
    
    // Add each file to the list
    specFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'text-xs text-gray-600 py-1 flex items-center justify-between';
        fileItem.innerHTML = `
            <div>
                <span class="font-medium">${file.name}</span>
                <span class="text-gray-400 ml-2">(${formatFileSize(file.size)})</span>
            </div>
            <button onclick="removeSpecFile(${index})" class="ml-2 text-red-500 hover:text-red-700 text-xs">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;
        specList.appendChild(fileItem);
    });
    
    // Hide upload content and show file info
    uploadContent.classList.add('hidden');
    specInfo.classList.remove('hidden');
    
    updateCompareButton();
}

// Remove a specification file
function removeSpecFile(index) {
    specFiles.splice(index, 1);
    updateSpecFileDisplay();
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Reset proposal file upload
function resetProposalUpload() {
    proposalFile = null;
    
    // Clear the file input
    const proposalInput = document.getElementById('proposal-file');
    proposalInput.value = '';
    
    // Show upload content and hide inline preview
    const uploadContent = document.getElementById('upload-content-proposal');
    const inlinePreview = document.getElementById('inline-preview-proposal');
    
    uploadContent.classList.remove('hidden');
    inlinePreview.classList.add('hidden');
    
    updateCompareButton();
}

// Reset specification files upload
function resetSpecUpload() {
    specFiles = [];
    
    // Clear the file input
    const specInput = document.getElementById('spec-files');
    specInput.value = '';
    
    updateSpecFileDisplay();
}

// Add more specification files
function addMoreSpecFiles() {
    const specInput = document.getElementById('spec-files');
    specInput.click();
}

// Update compare button state
function updateCompareButton() {
    const compareBtn = document.getElementById('compare-btn');
    const hasProposal = proposalFile !== null;
    const hasSpecs = specFiles.length > 0;
    
    compareBtn.disabled = !(hasProposal && hasSpecs);
}

// Start the comparison process
async function startComparison() {
    try {
        // Update button to show loading state
        const compareBtn = document.getElementById('compare-btn');
        const buttonText = document.getElementById('button-text');
        const loadingSpinner = document.getElementById('loading-spinner');
        
        compareBtn.disabled = true;
        buttonText.textContent = 'Analyzing...';
        loadingSpinner.classList.remove('hidden');
        
        // Show loading state
        const loading = document.getElementById('loading');
        const errorMessage = document.getElementById('error-message');
        const results = document.getElementById('results');

        loading.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        results.classList.add('hidden');

        // Get API key
        const apiKey = await getApiKey();

        // Process proposal file
        console.log('Processing proposal file...');
        const proposalName = extractProposalNameFromFilename(proposalFile.name);

        // Process specification files
        console.log('Processing specification files...');
        const specFileData = [];
        for (let i = 0; i < specFiles.length; i++) {
            const specName = extractSpecNameFromFilename(specFiles[i].name);
            specFileData.push({ file: specFiles[i], name: specName });
        }

        // Compare all specs with the proposal in a single unified analysis
        console.log('Starting unified AI analysis...');
        console.log(`Analyzing ${specFileData.length} specification document(s) against proposal`);
        
        const result = await compareAllSpecsWithProposal(specFileData, proposalFile, proposalName);
        const totalCost = result.cost || 0;

        // Display results
        displayResults([result], proposalName, totalCost);

    } catch (error) {
        console.error('Error during comparison:', error);
        
        // Show error
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = `Error: ${error.message}`;
        errorMessage.classList.remove('hidden');
        
        // Hide loading
        const loading = document.getElementById('loading');
        loading.classList.add('hidden');
    } finally {
        // Reset button state
        const compareBtn = document.getElementById('compare-btn');
        const buttonText = document.getElementById('button-text');
        const loadingSpinner = document.getElementById('loading-spinner');
        
        compareBtn.disabled = false;
        buttonText.textContent = 'Analyze Documents';
        loadingSpinner.classList.add('hidden');
        
        // Hide loading
        const loading = document.getElementById('loading');
        loading.classList.add('hidden');
    }
}

// Convert file to base64 (same as index.html)
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

// Extract proposal name from filename
function extractProposalNameFromFilename(filename) {
    // Remove file extension and clean up the name
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return nameWithoutExt || 'Proposal Document';
}

// Extract specification name from filename
function extractSpecNameFromFilename(filename) {
    // Remove file extension and clean up the name
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return nameWithoutExt || 'Specification Document';
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

// Extract text from a PDF for LM Studio
async function extractPdfText(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = '';
        const numPages = pdf.numPages;
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += `\n\n--- PAGE ${i}/${numPages} ---\n` + textContent.items.map(t => t.str).join(' ');
        }
        pdf.destroy();
        const maxChars = 200000;
        return fullText.length > maxChars ? fullText.slice(0, maxChars) : fullText;
    } catch (e) {
        console.error('Failed to extract PDF text:', e);
        throw new Error('Failed to read PDF text.');
    }
}

// Retrieve a local model id from LM Studio
async function getLocalLmModel() {
    let modelId = localStorage.getItem('lm_model');
    if (modelId) return modelId;
    try {
        const res = await fetch(`${OPENAI_API_BASE}/models`);
        const data = await res.json();
        modelId = data?.data?.[0]?.id || 'local-model';
        localStorage.setItem('lm_model', modelId);
        return modelId;
    } catch (e) {
        console.warn('Falling back to default local model id:', e);
        return 'local-model';
    }
}

// Compare all specifications with proposal using LM Studio (unified analysis)
async function compareAllSpecsWithProposal(specFileData, proposalFile, proposalName, retryCount = 0) {
    const selectedModel = getSelectedModel();
    const apiKey = await getApiKey();
    
    const specialRequest = document.getElementById('special-request').value.trim();
    const specialInstructions = specialRequest ? `\n\nSpecial Instructions: ${specialRequest}` : '';
    
    // Get custom analysis instructions if available
    const customInstructions = localStorage.getItem('custom_spec_analysis_instructions');
    const analysisInstructions = customInstructions || getDefaultSpecAnalysisInstructions();
    
    // Convert proposal file to base64
    const proposalFileBase64 = await fileToBase64(proposalFile);
    
    // Convert all spec files to base64
    const specFilesList = [];
    for (let i = 0; i < specFileData.length; i++) {
        const { file, name } = specFileData[i];
        const base64 = await fileToBase64(file);
        specFilesList.push({ name, base64, mimeType: file.type });
    }
    
    // Create spec documents description
    const specDocumentsDescription = specFilesList.map((spec, index) => 
        `SPECIFICATION DOCUMENT ${index + 1}: "${spec.name}"`
    ).join('\n');
    
    const prompt = `You are a building construction compliance checker. Compare ALL specification requirements from ALL specification documents against the proposal and identify what is MISSING or NON-COMPLIANT.

${specDocumentsDescription}
(Content: The specification documents are provided as the first ${specFilesList.length} PDF file(s))

PROPOSAL DOCUMENT: "${proposalName}"
(Content: The proposal document is provided as the final PDF file)

IMPORTANT: Analyze ALL specification documents together to create ONE unified compliance report. DO NOT create separate reports for each specification document. Instead, consolidate all requirements from all specifications into a single comprehensive analysis.

${analysisInstructions}

Focus on identifying what is MISSING or NON-COMPLIANT across ALL specification documents. Keep the analysis factual and direct.${specialInstructions}`;

    // For local LM Studio, we will extract text and send as chat content instead of inline binary data

    try {
        // Update UI to show streaming is starting
        updateStreamingStatus('Connecting to AI service...');
        
        // Use LM Studio OpenAI-compatible streaming endpoint
        const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: await getLocalLmModel(),
                stream: true,
                temperature: 0.3,
                messages: [
                    { role: 'system', content: 'You output only valid JSON according to the user schema.' },
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 429 && retryCount < 3) {
                console.log(`Rate limited, retrying in ${2 ** retryCount} seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2 ** retryCount * 1000));
                return compareAllSpecsWithProposal(specFileData, proposalFile, proposalName, retryCount + 1);
            }
            
            throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        // Set up streaming
        updateStreamingStatus('Receiving unified AI analysis...', true);
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
                        if (fullResponse.includes('technical specifications')) {
                            updateStreamingStatus('Analyzing technical specifications...');
                        } else if (fullResponse.includes('Building requirements')) {
                            updateStreamingStatus('Checking building requirements...');
                        } else if (fullResponse.includes('Performance criteria')) {
                            updateStreamingStatus('Evaluating performance criteria...');
                        } else if (fullResponse.includes('Material specifications')) {
                            updateStreamingStatus('Reviewing material specifications...');
                        } else if (fullResponse.includes('Compliance') || fullResponse.includes('compliance')) {
                            updateStreamingStatus('Assessing compliance status...');
                        } else if (fullResponse.includes('comparisonTable')) {
                            updateStreamingStatus('Compiling unified comparison results...');
                        }
                    }
                    
                    // Capture usage metadata if available
                    // LM Studio does not provide usage by default
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
        
        updateStreamingStatus('Finalizing unified compliance analysis...');
        
        const responseText = fullResponse;
        
        // Parse JSON response
        let analysisData;
        try {
            analysisData = JSON.parse(responseText);
        } catch (error) {
            console.log('JSON Parse Error:', error);
            console.log('Response text length:', responseText.length);
            console.log('Response text preview:', responseText.substring(0, 500));
            console.log('Response text ending:', responseText.substring(responseText.length - 500));
            
            throw new Error(`Failed to parse JSON response from AI: ${error.message}`);
        }

        // Calculate cost
        let cost = 0;

        return {
            specName: `Unified Analysis (${specFilesList.length} specification${specFilesList.length > 1 ? 's' : ''})`,
            analysisData: analysisData,
            cost: cost,
            model: selectedModel,
            tokens: usageMetadata || {}
        };

    } catch (error) {
        if (retryCount < 3) {
            console.log(`Error occurred, retrying... (attempt ${retryCount + 1})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return compareAllSpecsWithProposal(specFileData, proposalFile, proposalName, retryCount + 1);
        }
        throw error;
    }
}

// Compare specification with proposal using LM Studio API (streaming)
async function compareSpecWithProposal(specFile, specName, proposalFile, proposalName, retryCount = 0) {
    const selectedModel = await getLocalLmModel();
    
    const specialRequest = document.getElementById('special-request').value.trim();
    const specialInstructions = specialRequest ? `\n\nSpecial Instructions: ${specialRequest}` : '';
    
    // Get custom analysis instructions if available
    const customInstructions = localStorage.getItem('custom_spec_analysis_instructions');
    const analysisInstructions = customInstructions || getDefaultSpecAnalysisInstructions();
    
    // Extract PDF text
    const specText = await extractPdfText(specFile);
    const proposalText = await extractPdfText(proposalFile);
    
    const prompt = `You are a building construction compliance checker. Compare the specification requirements against the proposal and identify what is MISSING or NON-COMPLIANT.

SPECIFICATION DOCUMENT: "${specName}"
(Content: The specification document is provided as the first PDF file)

PROPOSAL DOCUMENT: "${proposalName}"
(Content: The proposal document is provided as the second PDF file)

${analysisInstructions}

Focus on identifying what is MISSING or NON-COMPLIANT. Keep the analysis factual and direct.${specialInstructions}`;

    const userContent = `${prompt}\n\nSPEC (TEXT: ${specName})\n${specText}\n\nPROPOSAL (TEXT: ${proposalName})\n${proposalText}`;

    try {
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
                temperature: 0.3,
                messages: [
                    { role: 'system', content: 'You output only valid JSON according to the user schema.' },
                    { role: 'user', content: userContent }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 429 && retryCount < 3) {
                console.log(`Rate limited, retrying in ${2 ** retryCount} seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2 ** retryCount * 1000));
                return compareSpecWithProposal(specFile, specName, proposalFile, proposalName, retryCount + 1);
            }
            
            throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
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
                        if (fullResponse.includes('technical specifications')) {
                            updateStreamingStatus('Analyzing technical specifications...');
                        } else if (fullResponse.includes('Building requirements')) {
                            updateStreamingStatus('Checking building requirements...');
                        } else if (fullResponse.includes('Performance criteria')) {
                            updateStreamingStatus('Evaluating performance criteria...');
                        } else if (fullResponse.includes('Material specifications')) {
                            updateStreamingStatus('Reviewing material specifications...');
                        } else if (fullResponse.includes('Compliance') || fullResponse.includes('compliance')) {
                            updateStreamingStatus('Assessing compliance status...');
                        } else if (fullResponse.includes('comparisonTable')) {
                            updateStreamingStatus('Compiling comparison results...');
                        }
                    }
                }
            }
        }
        
        // Process any remaining buffer
        if (buffer.trim()) {
            const parsed = parseSSEData(buffer);
            if (parsed && parsed.candidates && parsed.candidates[0] && 
                parsed.candidates[0].content && parsed.candidates[0].content.parts && 
                parsed.candidates[0].content.parts[0]) {
                fullResponse += parsed.candidates[0].content.parts[0].text || '';
            }
        }
        
        updateStreamingStatus('Finalizing compliance analysis...');
        
        const responseText = fullResponse;
        
        // Parse JSON response
        let analysisData;
        try {
            analysisData = JSON.parse(responseText);
        } catch (error) {
            console.log('JSON Parse Error:', error);
            console.log('Response text length:', responseText.length);
            console.log('Response text preview:', responseText.substring(0, 500));
            console.log('Response text ending:', responseText.substring(responseText.length - 500));
            
            throw new Error(`Failed to parse JSON response from AI: ${error.message}`);
        }

        // Calculate cost
        let cost = 0;
        if (usageMetadata && MODEL_PRICING[selectedModel]) {
            const inputTokens = usageMetadata.promptTokenCount || 0;
            const outputTokens = usageMetadata.candidatesTokenCount || 0;
            const pricing = MODEL_PRICING[selectedModel];
            
            cost = (inputTokens / 1000000 * pricing.input) + (outputTokens / 1000000 * pricing.output);
        }

        return {
            specName: specName,
            analysisData: analysisData,
            cost: cost,
            model: selectedModel,
            tokens: {}
        };

    } catch (error) {
        if (retryCount < 3) {
            console.log(`Error occurred, retrying... (attempt ${retryCount + 1})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return compareSpecWithProposal(specFile, specName, proposalFile, proposalName, retryCount + 1);
        }
        throw error;
    }
}

// Generate HTML report for spec comparison
function generateSpecComparisonReportHtml(comparisonResults, proposalName, totalCost) {
    const hunterGreen = '#38543C';
    const hunterBlue = '#24344B';
    const hunterLightGray = '#f8f9fa';
    const alertOrange = '#ff6b35';

    // Get the first result for overall info
    const firstResult = comparisonResults[0];
    const analysisData = firstResult.analysisData;
    
    let tableRowsHtml = '';
    
    if (analysisData.comparisonTable && Array.isArray(analysisData.comparisonTable)) {
        analysisData.comparisonTable.forEach(item => {
            const statusClass = item.status === 'MEETS' ? 'status-match' : 
                               item.status === 'NOT ADDRESSED' ? 'status-not-addressed' : 
                               'status-mismatch';
            const statusIcon = item.status === 'MEETS' ? '✔' : '✖';
            const statusIconClass = item.status === 'MEETS' ? 'status-icon-match' : 'status-icon-mismatch';

            tableRowsHtml += `
                <tr class="${item.status !== 'MEETS' ? 'difference-row' : ''}">
                    <td>${item.specSection || 'N/A'}</td>
                    <td>${item.specRequirement || 'N/A'}</td>
                    <td>${item.proposalResponse || 'N/A'}</td>
                    <td class="${statusClass}">
                        <span class="status-icon ${statusIconClass}">${statusIcon}</span>
                        <strong>${item.status}</strong>
                        ${item.comment ? ` - ${item.comment}` : ''}
                    </td>
                </tr>`;
        });
    }


    // Handle both unified and individual spec names
    const specTitle = analysisData.extractedSpecNames && Array.isArray(analysisData.extractedSpecNames) 
        ? analysisData.extractedSpecNames.join(', ') 
        : (analysisData.extractedSpecName || 'Specification Document(s)');
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unified Specification Compliance Report: ${specTitle} vs ${analysisData.extractedProposalName || proposalName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; color: #333333; background-color: #ffffff; }
        h1 { color: ${hunterGreen}; border-bottom: 2px solid ${hunterGreen}; padding-bottom: 10px; text-align: center; }
        h2 { color: ${hunterGreen}; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        th, td { padding: 12px; text-align: left; border: 1px solid #cccccc; vertical-align: top; }
        th { background-color: ${hunterLightGray}; font-weight: bold; color: ${hunterBlue}; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .report-info-table { margin-bottom: 30px; border: 1px solid ${hunterBlue}; }
        .report-info-table th { background-color: ${hunterGreen}; color: white; text-align: center; font-size: 1.2em; }
        .report-info-table td { padding: 10px; }
        .status-match { color: #27ae60; font-weight: bold; }
        .status-mismatch { color: #c0392b; font-weight: bold; }
        .status-not-addressed { color: #e67e22; font-weight: bold; }
        .status-icon { margin-right: 8px; font-size: 1.2em; }
        .status-icon-match { color: #27ae60; }
        .status-icon-mismatch { color: #c0392b; }
        .detailed-comparison-table th { position: sticky; top: 0; background-color: ${hunterLightGray}; z-index: 10; color: ${hunterBlue}; }
        tr.difference-row { background-color: #feebee !important; border-left: 3px solid #c0392b; }
        tr.difference-row:nth-child(even) { background-color: #fff6f6 !important; }
        tr.difference-row:hover { background-color: #fdd8d8 !important; }
        .summary-section { background-color: #e8f5e8; border: 1px solid ${hunterGreen}; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    </style>
</head>
<body>
    <table class="report-info-table">
        <thead>
            <tr><th colspan="2">Unified Specification Compliance Report</th></tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Specification(s):</strong></td>
                <td>${specTitle}</td>
            </tr>
            <tr>
                <td><strong>Proposal:</strong></td>
                <td>${analysisData.extractedProposalName || proposalName}</td>
            </tr>
            <tr>
                <td><strong>Analysis Cost:</strong></td>
                <td>$${totalCost.toFixed(4)}</td>
            </tr>
        </tbody>
    </table>


    <h2>Detailed Compliance Analysis</h2>
    <table class="detailed-comparison-table">
        <thead>
            <tr>
                <th>Specification Section</th>
                <th>Specification Requirement</th>
                <th>Proposal Response</th>
                <th>Compliance Status & Comments</th>
            </tr>
        </thead>
        <tbody>
            ${tableRowsHtml}
        </tbody>
    </table>
</body>
</html>
    `;
    return htmlContent;
}

// Display the comparison results
function displayResults(comparisonResults, proposalName, totalCost) {
    const results = document.getElementById('results');
    const resultsContent = document.getElementById('results-content');
    const costInfo = document.getElementById('cost-info');
    const costAmount = document.getElementById('cost-amount');
    const downloadBtn = document.getElementById('download-btn');

    // Clear previous results
    resultsContent.innerHTML = '';

    // Create the results HTML
    let html = `<div class="space-y-8">`;

    // Add each comparison result
    comparisonResults.forEach((result) => {
        const analysisData = result.analysisData;

        html += `
            <div class="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-[var(--hunter-green)] text-xl font-bold">${result.specName}</h3>
                    <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Cost: $${(result.cost || 0).toFixed(4)}</span>
                </div>
                
                <!-- Detailed Comparison Table -->
                <div class="mt-6">
                    <h4 class="font-semibold text-[var(--hunter-green)] mb-3">Detailed Comparison</h4>
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                            <thead>
                                <tr class="bg-[var(--hunter-green)] text-white">
                                    <th class="p-3 text-left text-sm font-semibold">Section</th>
                                    <th class="p-3 text-left text-sm font-semibold">Requirement</th>
                                    <th class="p-3 text-left text-sm font-semibold">Proposal Response</th>
                                    <th class="p-3 text-left text-sm font-semibold">Status & Comments</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${analysisData.comparisonTable && analysisData.comparisonTable.length > 0 ? 
                                    analysisData.comparisonTable.map((item, idx) => {
                                        const statusClass = item.status === 'MEETS' ? 'text-green-600' : 
                                                           item.status === 'NOT ADDRESSED' ? 'text-orange-600' : 
                                                           'text-red-600';
                                        const statusIcon = item.status === 'MEETS' ? '✔' : '✖';
                                        const rowClass = item.status !== 'MEETS' ? 'bg-red-50' : (idx % 2 === 0 ? 'bg-gray-50' : 'bg-white');
                                        
                                        return `
                                            <tr class="${rowClass} border-b border-gray-200">
                                                <td class="p-3 text-sm">${item.specSection || 'N/A'}</td>
                                                <td class="p-3 text-sm">${item.specRequirement || 'N/A'}</td>
                                                <td class="p-3 text-sm">${item.proposalResponse || 'N/A'}</td>
                                                <td class="p-3 text-sm ${statusClass} font-semibold">
                                                    <span class="mr-1">${statusIcon}</span>
                                                    ${item.status}
                                                    ${item.comment ? `<br><span class="font-normal text-gray-600">${item.comment}</span>` : ''}
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')
                                    : '<tr><td colspan="4" class="p-4 text-center text-gray-500">No detailed comparison data available</td></tr>'
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    resultsContent.innerHTML = html;

    // Update cost display
    if (totalCost > 0) {
        costAmount.textContent = `$${totalCost.toFixed(4)}`;
        costInfo.classList.remove('hidden');
    }

    // Show download button
    downloadBtn.classList.remove('hidden');
    
    // Set up download functionality
    downloadBtn.onclick = () => downloadFullReport(comparisonResults, proposalName, totalCost);

    // Show results section
    results.classList.remove('hidden');
}

// Download full report as HTML
function downloadFullReport(comparisonResults, proposalName, totalCost) {
    const reportHtml = generateSpecComparisonReportHtml(comparisonResults, proposalName, totalCost);
    
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `specification-compliance-report-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Load PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js';

// Initialize drag and drop functionality
function initializeDragAndDrop() {
    const dragDropAreas = document.querySelectorAll('.drag-drop-area');
    
    dragDropAreas.forEach(area => {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            area.addEventListener(eventName, () => handleDragEnter(area), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, () => handleDragLeave(area), false);
        });

        // Handle dropped files
        area.addEventListener('drop', (e) => handleSpecDrop(e, area), false);
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDragEnter(area) {
    area.classList.add('drag-over', 'drag-active');
}

function handleDragLeave(area) {
    area.classList.remove('drag-over', 'drag-active');
}

function handleSpecDrop(e, area) {
    handleDragLeave(area);
    
    const files = Array.from(e.dataTransfer.files);
    const uploadType = area.getAttribute('data-upload-type');
    
    if (files.length === 0) return;
    
    // Filter only PDF files
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
        showError('Please drop PDF files only.');
        return;
    }
    
    if (uploadType === 'proposal') {
        // Handle single proposal file
        if (pdfFiles.length > 1) {
            showError('Please drop only one proposal PDF file.');
            return;
        }
        
        const proposalInput = document.getElementById('proposal-file');
        if (proposalInput) {
            // Create a new FileList-like object
            const dt = new DataTransfer();
            dt.items.add(pdfFiles[0]);
            proposalInput.files = dt.files;
            
            // Trigger the existing upload handler
            handleProposalFile({ target: { files: [pdfFiles[0]] } });
        }
    } else if (uploadType === 'specs') {
        // Handle multiple specification files
        const specInput = document.getElementById('spec-files');
        if (specInput) {
            // Create a new FileList-like object
            const dt = new DataTransfer();
            pdfFiles.forEach(file => dt.items.add(file));
            specInput.files = dt.files;
            
            // Trigger the existing upload handler
            handleSpecFiles({ target: { files: pdfFiles } });
        }
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }
}

// PDF Preview Functionality
let currentPreviewPdf = null;
let currentPreviewPage = 1;
let totalPreviewPages = 0;

// Inline Preview Functionality
async function showProposalInlinePreview(file) {
    const uploadContent = document.getElementById('upload-content-proposal');
    const inlinePreview = document.getElementById('inline-preview-proposal');
    const inlineTitle = document.getElementById('inline-title-proposal');
    const inlineFilename = document.getElementById('inline-filename-proposal');
    const inlineCanvas = document.getElementById('inline-canvas-proposal');
    
    try {
        // Hide upload content and show preview
        uploadContent.classList.add('hidden');
        inlinePreview.classList.remove('hidden');
        
        // Load and render PDF first page
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        // Set filename as title and metadata below
        const fileSize = formatFileSize(file.size);
        const pages = pdf.numPages;
        inlineTitle.textContent = file.name;
        inlineFilename.textContent = `${fileSize} • ${pages} page${pages > 1 ? 's' : ''}`;
        
        const page = await pdf.getPage(1);
        
        // Calculate scale to fit canvas container while maintaining aspect ratio
        const containerWidth = inlineCanvas.parentElement.clientWidth - 4; // Account for border and padding
        const maxHeight = 360; // Increased by 20% (300 * 1.2)
        const viewport = page.getViewport({ scale: 1 });
        
        // Calculate scales for both width and height constraints
        const scaleWidth = containerWidth / viewport.width;
        const scaleHeight = maxHeight / viewport.height;
        
        // Use the smaller scale to ensure it fits in both dimensions, with a minimum scale of 0.36 (0.3 * 1.2)
        const scale = Math.max(Math.min(scaleWidth, scaleHeight), 0.36);
        const scaledViewport = page.getViewport({ scale: scale });
        
        // Set canvas size
        inlineCanvas.width = scaledViewport.width;
        inlineCanvas.height = scaledViewport.height;
        
        // Render page
        const renderContext = {
            canvasContext: inlineCanvas.getContext('2d'),
            viewport: scaledViewport
        };
        
        await page.render(renderContext).promise;
        
        // Clean up
        pdf.destroy();
        
    } catch (error) {
        console.error('Error showing inline preview:', error);
        // If preview fails, show error but keep file uploaded
        showError('Could not generate preview, but file was uploaded successfully');
    }
}

// Modal Preview Functions
window.openProposalPreview = async function() {
    const previewModal = document.getElementById('pdf-preview-modal');
    const previewTitle = document.getElementById('preview-title');
    const previewCanvas = document.getElementById('pdf-canvas');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');
    
    if (!proposalFile) {
        showError('No PDF file available for preview');
        return;
    }
    
    try {
        // Set title
        previewTitle.textContent = `Preview: ${proposalFile.name}`;
        
        // Load PDF
        const arrayBuffer = await proposalFile.arrayBuffer();
        currentPreviewPdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        totalPreviewPages = currentPreviewPdf.numPages;
        currentPreviewPage = 1;
        
        // Update UI
        totalPagesSpan.textContent = totalPreviewPages;
        updatePreviewNavigation();
        
        // Render first page
        await renderPreviewPage();
        
        // Show modal
        previewModal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error opening PDF preview:', error);
        showError('Failed to load PDF preview');
    }
}

// Render current page
async function renderPreviewPage() {
    if (!currentPreviewPdf) return;
    
    const previewCanvas = document.getElementById('pdf-canvas');
    const currentPageSpan = document.getElementById('current-page');
    
    try {
        const page = await currentPreviewPdf.getPage(currentPreviewPage);
        const viewport = page.getViewport({ scale: 1.2 });
        
        // Set canvas size
        previewCanvas.width = viewport.width;
        previewCanvas.height = viewport.height;
        
        // Render page
        const renderContext = {
            canvasContext: previewCanvas.getContext('2d'),
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Update navigation
        currentPageSpan.textContent = currentPreviewPage;
        updatePreviewNavigation();
        
    } catch (error) {
        console.error('Error rendering PDF page:', error);
        showError('Failed to render PDF page');
    }
}

// Update navigation buttons
function updatePreviewNavigation() {
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPreviewPage <= 1;
    }
    if (nextPageBtn) {
        nextPageBtn.disabled = currentPreviewPage >= totalPreviewPages;
    }
}

// Close preview modal
window.closeProposalPreview = function() {
    const modal = document.getElementById('pdf-preview-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Clean up PDF resources
    if (currentPreviewPdf) {
        try {
            currentPreviewPdf.destroy();
        } catch (e) {
            console.error('Error destroying PDF:', e);
        }
        currentPreviewPdf = null;
    }
    currentPreviewPage = 1;
    totalPreviewPages = 0;
}

// Initialize preview functionality
function initializePreviewFunctionality() {
    const closePreviewBtn = document.getElementById('close-preview');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const previewModal = document.getElementById('pdf-preview-modal');
    
    // Close modal events
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.closeProposalPreview();
        });
    }
    
    if (previewModal) {
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                window.closeProposalPreview();
            }
        });
    }
    
    // Navigation events
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPreviewPage > 1) {
                currentPreviewPage--;
                renderPreviewPage();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPreviewPage < totalPreviewPages) {
                currentPreviewPage++;
                renderPreviewPage();
            }
        });
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('pdf-preview-modal');
        if (!modal || modal.classList.contains('hidden')) return;
        
        if (e.key === 'Escape') {
            window.closeProposalPreview();
        } else if (e.key === 'ArrowLeft' && currentPreviewPage > 1) {
            currentPreviewPage--;
            renderPreviewPage();
        } else if (e.key === 'ArrowRight' && currentPreviewPage < totalPreviewPages) {
            currentPreviewPage++;
            renderPreviewPage();
        }
    });
}