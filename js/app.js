// Hunter Brand Colors
const hunterGreen = '#38543C';
const hunterBlue = '#24344B';
const hunterLightGray = '#f0f2f5';
const alertOrange = '#F26622';

// Available models (UI only)
const AVAILABLE_MODELS = {
    'local-model': 'Local Model (LM Studio)'
};

// Pricing removed for local LM usage; costs default to zero
const MODEL_PRICING = {};

// LM Studio (OpenAI-compatible) API base
const OPENAI_API_BASE = 'http://127.0.0.1:1234/v1';

// Application State
let proposalA = null;
let proposalB = null;
let proposalC = null;
let comparisonResult = null;
let isLoading = false;
let isThreeProposalMode = false;

// PDF.js setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js';

// DOM Elements
const fileInputA = document.getElementById('file-a');
const fileInputB = document.getElementById('file-b');
const fileInputC = document.getElementById('file-c');
const uploadSectionA = document.getElementById('upload-a');
const uploadSectionB = document.getElementById('upload-b');
const fileInfoA = document.getElementById('file-info-a');
const fileInfoB = document.getElementById('file-info-b');
const filenameA = document.getElementById('filename-a');
const filenameB = document.getElementById('filename-b');
const filesizeA = document.getElementById('filesize-a');
const filesizeB = document.getElementById('filesize-b');
const pagesA = document.getElementById('pages-a');
const pagesB = document.getElementById('pages-b');
const compareBtn = document.getElementById('compare-btn');
const errorMessage = document.getElementById('error-message');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const downloadBtn = document.getElementById('download-btn');
const reportPreview = document.getElementById('report-preview');
const specialRequestTextarea = document.getElementById('special-request');
const costInfo = document.getElementById('cost-info');
const costAmount = document.getElementById('cost-amount');

// Event Listeners
fileInputA.addEventListener('change', (e) => handleFileUpload(e, 'A'));
fileInputB.addEventListener('change', (e) => handleFileUpload(e, 'B'));
if (fileInputC) {
    fileInputC.addEventListener('change', (e) => handleFileUpload(e, 'C'));
}
compareBtn.addEventListener('click', handleCompare);
downloadBtn.addEventListener('click', handleDownload);

// Initialize drag and drop functionality
initializeDragAndDrop();

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function setLoading(state) {
    isLoading = state;
    if (state) {
        loading.classList.remove('hidden');
        compareBtn.disabled = true;
    } else {
        loading.classList.add('hidden');
        compareBtn.disabled = !(proposalA && proposalB);
    }
}

// PDF Processing Functions
async function extractPdfInfo(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        return {
            pages: pdf.numPages,
            file: file
        };
    } catch (error) {
        console.error('Error processing PDF:', error);
        throw new Error('Failed to process PDF file. Please ensure the file is a valid PDF.');
    }
}

// File Upload Handler
async function handleFileUpload(event, proposalId) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        showError('Please select a PDF file.');
        return;
    }

    try {
        hideError();
        const pdfInfo = await extractPdfInfo(file);
        
        if (proposalId === 'A') {
            proposalA = pdfInfo;
            await showInlinePreview('A', file);
        } else if (proposalId === 'B') {
            proposalB = pdfInfo;
            await showInlinePreview('B', file);
        } else if (proposalId === 'C') {
            proposalC = pdfInfo;
            await showInlinePreview('C', file);
        }

        // Enable compare button if required files are uploaded
        const requiredProposals = isThreeProposalMode ? 
            (proposalA && proposalB && proposalC) : 
            (proposalA && proposalB);
        compareBtn.disabled = !requiredProposals;

    } catch (error) {
        showError(error.message);
    }
}

// LM Studio helper functions
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

// Model Management Functions
function getSelectedModel() {
    return localStorage.getItem('selected_model') || 'gemini-2.5-flash-preview-05-20';
}

function setSelectedModel(model) {
    localStorage.setItem('selected_model', model);
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

async function compareProposals(proposalAFile, proposalBFile, proposalCFile = null) {
    // LM Studio: select local model dynamically
    const selectedModel = await getLocalLmModel();
    
    // Get special request from textarea
    const specialRequestTextarea = document.getElementById('special-request');
    const specialRequest = specialRequestTextarea ? specialRequestTextarea.value.trim() : '';
    
    // Extract PDF text for LM Studio (text-only)
    const proposalAText = await extractPdfText(proposalAFile);
    const proposalBText = await extractPdfText(proposalBFile);
    const proposalCText = proposalCFile ? await extractPdfText(proposalCFile) : null;

    // Get custom analysis instructions if available
    const customInstructions = localStorage.getItem('custom_analysis_instructions');
    const analysisInstructions = customInstructions || (proposalCFile ? getDefaultThreeWayAnalysisInstructions() : getDefaultAnalysisInstructions());

    // Add special request section to prompts if provided
    const specialRequestSection = specialRequest ? `

SPECIAL USER INSTRUCTIONS:
${specialRequest}

Please incorporate these special instructions into your analysis. In addition to the regular comparison, you MUST provide a separate 'specialInstructionResults' field that directly addresses each special instruction with specific findings.

` : '';

    const instructionPrompt = proposalCFile ? `
Compare three proposal PDFs and identify all differences between them.

Extract the proposal names/versions from the documents if available.
Compare every section and item across all three proposals.
Report ONLY factual differences - no analysis or recommendations.

Output JSON format:

interface ComparisonOutput {
    extractedProposalAName?: string;
    extractedProposalBName?: string;
    extractedProposalCName?: string;
    significantDifferences: string[]; // List major differences found
    comparisonTable: Array<{
        sectionItem: string; 
        proposalASpec: string; 
        proposalBSpec: string; 
        proposalCSpec: string;
        status: 'No Change' | 'Difference Found';
        comment?: string; // Describe the difference factually
    }>;
    freightPricesSame: boolean; 
    multiModuleConnectionDetailsMissing?: string;
}

${analysisInstructions}

For each item:
- Include all three specifications even if identical
- Mark 'Difference Found' if ANY proposal differs
- Comment should state facts only (e.g., "A: Steel, B: Aluminum, C: Steel")

CRITICAL RULES for comparisonTable:
1. ONLY include rows where ALL proposals (A, B, and C) have actual values (not empty/null)
2. DO NOT include section headers that have no specification values
3. Every row must have concrete data to compare across all three proposals

Examples of what to SKIP (do not include):
- Rows where proposalASpec, proposalBSpec, and proposalCSpec would all be empty
- Section headers like "Payment Schedule - Upon Submittal" with no values
- Headers like "HVAC - Air Conditioning Unit(s) - Condenser Section Rating" with no data

Examples of what to INCLUDE:
- A: "20% Upon Submittal", B: "25% Upon Submittal", C: "20% Upon Submittal"
- A: "NEMA 3R", B: "NEMA 4X", C: "NEMA 3R"
- A: "Freight at Time of Shipment", B: "Freight at Time of Shipment", C: "Freight at Time of Shipment"

Begin JSON Output:
${specialRequestSection}` : `
Compare two proposal PDFs and identify all differences between them.

Extract the proposal names/versions from the documents if available.
Compare every section and item between the two proposals.
Report ONLY factual differences - no analysis or recommendations.

Output JSON format:

interface ComparisonOutput {
    extractedProposalAName?: string;
    extractedProposalBName?: string;
    significantDifferences: string[]; // List major differences found
    comparisonTable: Array<{
        sectionItem: string; 
        proposalASpec: string; 
        proposalBSpec: string; 
        status: 'No Change' | 'Difference Found';
        comment?: string; // Describe the difference factually
    }>;
    freightPricesSame: boolean; 
    multiModuleConnectionDetailsMissing?: string;
}

${analysisInstructions}

For each item:
- Mark 'Difference Found' if specifications differ
- Comment should state facts only (e.g., "Changed from Steel to Aluminum")

CRITICAL RULES for comparisonTable:
1. ONLY include rows where BOTH proposalASpec AND proposalBSpec have actual values (not empty/null)
2. DO NOT include section headers that have no specification values
3. Every row must have concrete data to compare

Examples of what to SKIP (do not include):
- Rows where proposalASpec and proposalBSpec would both be empty
- Section headers like "Payment Schedule - Upon Submittal" with no values
- Headers like "HVAC - Air Conditioning Unit(s) - Condenser Section Rating" with no data

Examples of what to INCLUDE:
- "20% Upon Submittal" vs "25% Upon Submittal" 
- "NEMA 3R" vs "NEMA 4X"
- "Freight at Time of Shipment" vs "Freight at Time of Shipment" (actual matching values)

Begin JSON Output:
${specialRequestSection}`;

    // Build OpenAI-style chat messages with embedded document text
    const docSections = [
        `PROPOSAL A (TEXT):\n${proposalAText}`,
        `PROPOSAL B (TEXT):\n${proposalBText}`,
        ...(proposalCText ? [`PROPOSAL C (TEXT):\n${proposalCText}`] : [])
    ].join("\n\n");

    const userPrompt = `${instructionPrompt}\n\n${docSections}\n\nBegin JSON Output:`;

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
                model: selectedModel,
                stream: true,
                temperature: 0.1,
                messages: [
                    { role: 'system', content: 'You are a precise comparison engine that outputs only valid JSON according to the schema.' },
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`LM Studio request failed: ${response.status} ${response.statusText}`);
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
                        if (fullResponse.includes('Document Header')) {
                            updateStreamingStatus('Analyzing document headers...');
                        } else if (fullResponse.includes('Design Information')) {
                            updateStreamingStatus('Comparing design specifications...');
                        } else if (fullResponse.includes('Pricing')) {
                            updateStreamingStatus('Analyzing pricing differences...');
                        } else if (fullResponse.includes('Materials')) {
                            updateStreamingStatus('Reviewing material specifications...');
                        } else if (fullResponse.includes('significantDifferences')) {
                            updateStreamingStatus('Compiling significant differences...');
                        } else if (fullResponse.includes('comparisonTable')) {
                            updateStreamingStatus('Building comparison table...');
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
        
        updateStreamingStatus('Finalizing comparison results...');

        // Parse the JSON response
        const jsonStr = fullResponse.trim();
        
        try {
            const parsedResult = JSON.parse(jsonStr);
            
            // No usage metadata available from LM Studio by default
            parsedResult._usageMetadata = { model: selectedModel };
            
            return parsedResult;
        } catch (parseError) {
            console.error("JSON Parse Error with structured output:", parseError);
            console.error("Response:", jsonStr);
            throw new Error(`Structured output parsing failed: ${parseError.message}. Please try again or switch models.`);
        }

    } catch (error) {
        console.error("Error calling LM Studio:", error);
        throw new Error(`Local model request failed: ${error.message}`);
    }
}

// API Key Management removed for LM Studio local usage

// Cost Calculation Function
function calculateCost(usageMetadata) {
    if (!usageMetadata || !usageMetadata.model) {
        return { cost: 0, breakdown: null };
    }

    // Local models: report zero cost
    return { cost: 0, breakdown: null };
}

// Extract text from a PDF file using pdf.js
async function extractPdfText(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = '';
        const numPages = pdf.numPages;
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(it => it.str).join(' ');
            fullText += `\n\n--- PAGE ${i}/${numPages} ---\n` + pageText;
        }
        pdf.destroy();
        // Truncate very long texts to avoid context overflow (approx chars ~= tokens*4)
        const maxChars = 200000; // ~50k tokens
        return fullText.length > maxChars ? fullText.slice(0, maxChars) : fullText;
    } catch (e) {
        console.error('Failed to extract PDF text:', e);
        throw new Error('Failed to read PDF text.');
    }
}

// Retrieve a local model id from LM Studio, cached in localStorage
async function getLocalLmModel() {
    let modelId = localStorage.getItem('lm_model');
    if (modelId) return modelId;
    try {
        const res = await fetch(`${OPENAI_API_BASE}/models`);
        if (!res.ok) throw new Error('models list failed');
        const data = await res.json();
        modelId = data?.data?.[0]?.id || 'local-model';
        localStorage.setItem('lm_model', modelId);
        return modelId;
    } catch (e) {
        console.warn('Falling back to default local model id:', e);
        return 'local-model';
    }
}

// Data Transformation Functions
function transformModelOutputToComparisonResult(geminiOutput, proposalAFilename, proposalBFilename, proposalCFilename = null) {
    // Get special instructions from textarea
    const specialRequestTextarea = document.getElementById('special-request');
    const specialRequest = specialRequestTextarea ? specialRequestTextarea.value.trim() : '';
    const comparisonTable = geminiOutput.comparisonTable.map(gItem => {
        const parts = gItem.sectionItem.split(' / ');
        const isLikelySectionHeader = parts.length === 1 && 
                                     (!gItem.proposalASpec?.includes(':') && !gItem.proposalBSpec?.includes(':')) && 
                                     (gItem.proposalASpec?.length < 30 && gItem.proposalBSpec?.length < 30);

        if (isLikelySectionHeader || (parts.length === 1 && (gItem.status !== 'Difference Found' && gItem.status !== 'No Change'))) {
            return {
                section: gItem.sectionItem.trim(),
                item: '', 
                proposalASpec: gItem.proposalASpec || 'Section Overview',
                proposalBSpec: gItem.proposalBSpec || 'Section Overview',
                proposalCSpec: gItem.proposalCSpec || 'Section Overview',
                status: gItem.status || 'No Change', 
                comment: gItem.comment || '',
                isSectionHeader: true,
            };
        } else {
            return {
                section: parts[0].trim(),
                item: parts.slice(1).join(' / ').trim() || gItem.sectionItem.trim(), 
                proposalASpec: gItem.proposalASpec,
                proposalBSpec: gItem.proposalBSpec,
                proposalCSpec: gItem.proposalCSpec,
                status: gItem.status,
                comment: gItem.comment,
                isSectionHeader: false,
            };
        }
    });

    const significantDifferences = [...geminiOutput.significantDifferences];
    if (geminiOutput.multiModuleConnectionDetailsMissing) {
         significantDifferences.push(`Multi-module connection details: ${geminiOutput.multiModuleConnectionDetailsMissing}`);
    }

    // Use extracted names if available, otherwise fall back to filenames
    const proposalANameToUse = geminiOutput.extractedProposalAName || proposalAFilename;
    const proposalBNameToUse = geminiOutput.extractedProposalBName || proposalBFilename;
    const proposalCNameToUse = geminiOutput.extractedProposalCName || proposalCFilename;

    // Calculate cost information
    const costInfo = calculateCost(geminiOutput._usageMetadata);

    return {
        proposalAName: proposalANameToUse,
        proposalBName: proposalBNameToUse,
        proposalCName: proposalCNameToUse,
        significantDifferences: significantDifferences,
        comparisonTable: comparisonTable,
        freightSameWarning: geminiOutput.freightPricesSame,
        costInfo: costInfo,
        specialInstructions: specialRequest || null,
        specialInstructionResults: geminiOutput.specialInstructionResults || null
    };
}

// Report Generation Functions
function generateReportHtml(result) {
    const { proposalAName, proposalBName, proposalCName, significantDifferences, comparisonTable, freightSameWarning, costInfo } = result;
    const isThreeWay = !!proposalCName;

    let tableRowsHtml = '';
    comparisonTable.forEach(detail => {
        if (detail.isSectionHeader) {
            const colspan = isThreeWay ? '5' : '4';
            tableRowsHtml += `
                <tr>
                    <td colspan="${colspan}" style="color: ${hunterGreen}; background-color: ${hunterLightGray}; font-weight: bold;">${detail.section}</td> 
                </tr>`;
        } else {
            const isDifference = detail.status === 'Difference Found';
            const rowClass = isDifference ? 'difference-row' : '';
            const statusClass = detail.status === 'No Change' ? 'status-match' : 
                               detail.status === 'Difference Found' ? 'status-mismatch' : 
                               detail.comment && detail.comment.toLowerCase().includes('not addressed') ? 'status-not-addressed' :
                               detail.comment && detail.comment.toLowerCase().includes('freight') ? 'status-partial' : 
                               'status-mismatch';
            const statusIconClass = detail.status === 'No Change' ? 'status-icon-match' : 'status-icon-mismatch';
            const statusIcon = detail.status === 'No Change' ? '✔' : '✖'; 

            const proposalCCell = isThreeWay ? `<td>${detail.proposalCSpec || 'N/A'}</td>` : '';

            // Format status display similar to spec comparison
            let statusDisplay = detail.status;
            if (detail.status === 'Difference Found') {
                statusDisplay = 'DIFFERENCE FOUND';
            } else if (detail.status === 'No Change') {
                statusDisplay = 'MATCH';
            }

            tableRowsHtml += `
                <tr class="${rowClass}">
                    <td>${detail.item || detail.section}</td>
                    <td>${detail.proposalASpec || 'N/A'}</td>
                    <td>${detail.proposalBSpec || (isDifference && detail.comment?.toLowerCase().includes('removed') ? 'Item Removed' : (isDifference && detail.comment?.toLowerCase().includes('added') ? 'Item Added' : 'N/A'))}</td>
                    ${proposalCCell}
                    <td class="${statusClass}">
                        <span class="status-icon ${statusIconClass}">${statusIcon}</span>
                        ${statusDisplay}
                        ${detail.comment ? `<br><span style="font-weight: normal; color: #666666;">${detail.comment}</span>` : ''}
                    </td>
                </tr>`;
        }
    });

    let significantDifferencesHtml = '';
    if (significantDifferences.length > 0) {
        significantDifferencesHtml = `
            <div style="background-color: #e8f5e8; border: 1px solid ${hunterGreen}; border-radius: 8px; padding: 1.5rem; margin: 2rem 0;">
                <h2 style="color: ${hunterGreen}; margin-bottom: 1rem;">Key Differences Found</h2>
                <ul style="margin: 0; padding-left: 1.5rem;">`;
        significantDifferences.forEach(diff => {
            significantDifferencesHtml += `<li style="margin-bottom: 0.5rem;">${diff}</li>`;
        });
        significantDifferencesHtml += `</ul>
            </div>`;
    }
    
    let freightWarningHtmlReport = '';
    if (freightSameWarning) {
        freightWarningHtmlReport = `
            <p class="status-partial" style="margin-top: 15px; margin-bottom:15px; padding: 10px; border: 1px solid ${alertOrange}; background-color: #fff3e0; color: ${alertOrange};">
                <strong>Freight Price Alert:</strong> The freight prices appear to be the same in both proposal versions. Please verify if this is correct and update if necessary.
            </p>
        `;
    }

    const proposalCHeader = isThreeWay ? `<td>${proposalCName}</td>` : '';
    const proposalCHeaderColumn = isThreeWay ? `<th>${proposalCName}</th>` : '';
    
    // Generate special instruction section if present
    let specialInstructionSectionHtml = '';
    if (result.specialInstructions && result.specialInstructionResults) {
        specialInstructionSectionHtml = `
            <div style="background-color: #fff8e1; border: 1px solid ${alertOrange}; border-radius: 8px; padding: 1.5rem; margin: 2rem 0;">
                <h2 style="color: ${hunterGreen}; margin-bottom: 1rem; border-bottom: 2px solid ${hunterGreen}; padding-bottom: 0.5rem;">
                    Special Analysis Instructions & Results
                </h2>
                
                <div style="background-color: white; padding: 1rem; border-radius: 6px; border: 1px solid #e2e8f0; font-style: italic; margin-bottom: 1rem;">
                    "${result.specialInstructions}"
                </div>
                
                <div style="background-color: white; padding: 1rem; border-radius: 6px; border: 1px solid #e2e8f0;">
                    ${result.specialInstructionResults.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proposal Comparison Report: ${proposalAName} vs ${proposalBName}${isThreeWay ? ' vs ' + result.proposalCName : ''}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; color: #333333; background-color: #ffffff; }
        h1 { color: ${hunterGreen}; border-bottom: 2px solid ${hunterGreen}; padding-bottom: 10px; text-align: center; }
        h2 { color: ${hunterGreen}; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        th, td { padding: 12px; text-align: left; border: 1px solid #e5e7eb; vertical-align: top; }
        th { background-color: ${hunterGreen}; font-weight: bold; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .report-info-table { margin-bottom: 30px; border: 1px solid ${hunterBlue}; }
        .report-info-table th { background-color: ${hunterGreen}; color: white; text-align: center; font-size: 1.2em; }
        .report-info-table td { padding: 10px; }
        .report-info-table .section-title td { text-align:center; font-weight: bold; color: ${hunterGreen}; }
        .report-info-table .proposal-header td { font-weight: bold; background-color: ${hunterLightGray}; color: ${hunterBlue}; text-align: center; }
        .status-match { color: #27ae60; font-weight: bold; }
        .status-partial { color: ${alertOrange}; font-weight: bold; }
        .status-mismatch { color: #c0392b; font-weight: bold; }
        .status-not-addressed { color: #e67e22; font-weight: bold; }
        .status-clarification { color: ${hunterBlue}; font-weight: bold; }
        .status-icon { margin-right: 8px; font-size: 1.2em; }
        .status-icon-match { color: #27ae60; }
        .status-icon-mismatch { color: #c0392b; }
        ul { padding-left: 20px; margin-bottom: 20px; }
        li { margin-bottom: 8px; }
        .detailed-comparison-table { background-color: white; border-radius: 8px; overflow: hidden; }
        .detailed-comparison-table th { position: sticky; top: 0; z-index: 10; }
        .detailed-comparison-table td[colspan] { background-color: ${hunterLightGray}; font-weight: bold; color: ${hunterGreen}; border-top: 2px solid ${hunterGreen}; }
        tr.difference-row { background-color: #fee2e2 !important; }
        tr.difference-row:nth-child(even) { background-color: #fee2e2 !important; }
        tr.difference-row:hover { background-color: #fecaca !important; }
        .summary-section { background-color: #e8f5e8; border: 1px solid ${hunterGreen}; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    </style>
</head>
<body>
    <table class="report-info-table">
        <thead>
            <tr> <th colspan="${isThreeWay ? '3' : '2'}">${isThreeWay ? 'Three-Way ' : ''}Proposal Comparison Report</th> </tr>
        </thead>
        <tbody>
            <tr class="proposal-header">
                <td>${proposalAName}</td>
                <td>${proposalBName}</td>
                ${proposalCHeader}
            </tr>
        </tbody>
    </table>
    ${specialInstructionSectionHtml}
    ${significantDifferencesHtml}
    ${freightWarningHtmlReport}
    <h2>Detailed Comparison</h2>
    <table class="detailed-comparison-table">
        <thead>
            <tr>
                <th>Section / Item</th>
                <th>${proposalAName}</th>
                <th>${proposalBName}</th>
                ${proposalCHeaderColumn}
                <th>Status & Comments</th>
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

// Main Comparison Handler
async function handleCompare() {
    const requiredProposals = isThreeProposalMode ? 
        (proposalA && proposalB && proposalC) : 
        (proposalA && proposalB);
        
    if (!requiredProposals) {
        const message = isThreeProposalMode ? 
            'Please upload PDF files for Proposal A, B, and C.' :
            'Please upload PDF files for both Proposal A and Proposal B.';
        showError(message);
        return;
    }

    setLoading(true);
    hideError();
    results.classList.add('hidden');

    try {
        const geminiOutput = await compareProposals(
            proposalA.file, 
            proposalB.file, 
            isThreeProposalMode ? proposalC.file : null
        );
        
        comparisonResult = transformModelOutputToComparisonResult(
            geminiOutput, 
            proposalA.file.name, 
            proposalB.file.name,
            isThreeProposalMode ? proposalC.file.name : null
        );
        
        const reportHtml = generateReportHtml(comparisonResult);
        
        // Show cost information
        displayCostInfo(comparisonResult.costInfo);
        
        // Show results
        reportPreview.innerHTML = reportHtml;
        results.classList.remove('hidden');

    } catch (error) {
        console.error('Comparison failed:', error);
        showError(error.message || 'An unknown error occurred.');
    } finally {
        setLoading(false);
    }
}

// Cost Display Function
function displayCostInfo(costData) {
    if (!costData || !costData.breakdown || costData.cost === 0) {
        costInfo.classList.add('hidden');
        return;
    }

    const breakdown = costData.breakdown;
    
    // Update cost amount
    costAmount.textContent = `$${breakdown.totalCost.toFixed(4)}`;
    
    // Show cost info
    costInfo.classList.remove('hidden');
}

// Download Handler
function handleDownload() {
    if (!comparisonResult) return;

    const reportHtml = generateReportHtml(comparisonResult);
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-report-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Add settings modal functionality
function addSettingsModal() {
    // Initialize settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettingsModal);
    }

    // Initialize modal elements
    initializeSettingsModal();
    
    // Add the mode toggle button to the header section (only for index.html)
    const headerModeToggle = document.querySelector('#header-mode-toggle');
    if (headerModeToggle) {
        // Create mode toggle button as an icon
        const modeToggleBtn = document.createElement('button');
        modeToggleBtn.id = 'mode-toggle';
        modeToggleBtn.className = 'p-3 text-gray-600 hover:text-[var(--hunter-green)] transition-colors duration-200 rounded-lg hover:bg-gray-50';
        modeToggleBtn.title = isThreeProposalMode ? 'Switch to 2-Way Mode' : 'Switch to 3-Way Mode';
        
        // Create SVG icon based on current mode
        const iconSVG = isThreeProposalMode ? 
            // 2-way icon (two rectangles)
            `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h7v12H4zM13 6h7v12h-7z"/>
                <text x="7.5" y="12" font-size="4" text-anchor="middle" dy="0.3em" fill="currentColor">2</text>
            </svg>` :
            // 3-way icon (three rectangles)
            `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h5v12H3zM9.5 6h5v12h-5zM16 6h5v12h-5z"/>
                <text x="12" y="12" font-size="4" text-anchor="middle" dy="0.3em" fill="currentColor">3</text>
            </svg>`;
        
        modeToggleBtn.innerHTML = iconSVG;
        modeToggleBtn.addEventListener('click', toggleThreeProposalMode);
        headerModeToggle.appendChild(modeToggleBtn);
    }
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

    // Save settings
    saveSettingsBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const selectedModel = modelSelect.value;

        // Save API key if provided
        if (apiKey) {
            // removed api key storage
        }

        // Save selected model
        setSelectedModel(selectedModel);

        // Close modal
        closeSettingsModal();

        // Show success message
        alert(`Settings saved successfully!\n\nUsing model: ${AVAILABLE_MODELS[selectedModel]}`);
    });

    // Load existing API key (masked)
    // api key removed for local usage
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
            // api key removed for local usage
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

// Mode Management Functions
function getThreeProposalMode() {
    return localStorage.getItem('three_proposal_mode') === 'true';
}

function setThreeProposalMode(enabled) {
    localStorage.setItem('three_proposal_mode', enabled);
    isThreeProposalMode = enabled;
}

// Mode Toggle Functions
function toggleThreeProposalMode() {
    const newMode = !isThreeProposalMode;
    setThreeProposalMode(newMode);
    
    const uploadGrid = document.querySelector('.grid');
    const uploadC = document.getElementById('upload-c');
    const toggleBtn = document.getElementById('mode-toggle');
    
    if (newMode) {
        // Change to 3-column grid and show upload-c
        if (uploadGrid) {
            uploadGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12';
        }
        // Remove the mb-12 class from upload-c and ensure it has the same styling as others
        uploadC.className = 'group relative border-2 border-dashed border-gray-200 rounded-xl p-8 text-center transition-all duration-500 hover:border-[var(--hunter-green)] hover:shadow-lg hover:shadow-green-100 hover:scale-105 bg-gradient-to-br from-white to-gray-50 min-h-[200px] flex flex-col';
        uploadC.classList.remove('hidden');
        
        // Move upload-c back into the grid
        if (uploadGrid && !uploadGrid.contains(uploadC)) {
            uploadGrid.appendChild(uploadC);
        }
        toggleBtn.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h7v12H4zM13 6h7v12h-7z"/>
            <text x="7.5" y="12" font-size="4" text-anchor="middle" dy="0.3em" fill="currentColor">2</text>
        </svg>`;
        toggleBtn.title = 'Switch to 2-Way Mode';
        
        // Add event listener for file C if not already added
        const fileInputC = document.getElementById('file-c');
        if (fileInputC && !fileInputC.hasAttribute('data-listener')) {
            fileInputC.addEventListener('change', (e) => handleFileUpload(e, 'C'));
            fileInputC.setAttribute('data-listener', 'true');
        }
    } else {
        // Change back to 2-column grid and hide upload-c
        if (uploadGrid) {
            uploadGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-8 mb-12';
        }
        // Restore the original classes for upload-c when hiding
        uploadC.className = 'group relative border-2 border-dashed border-gray-200 rounded-xl p-8 text-center transition-all duration-500 hover:border-[var(--hunter-green)] hover:shadow-lg hover:shadow-green-100 hover:scale-105 bg-gradient-to-br from-white to-gray-50 mb-12 hidden';
        
        // Move upload-c outside the grid
        if (uploadGrid && uploadGrid.contains(uploadC)) {
            uploadGrid.parentNode.insertBefore(uploadC, uploadGrid.nextSibling);
        }
        toggleBtn.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h5v12H3zM9.5 6h5v12h-5zM16 6h5v12h-5z"/>
            <text x="12" y="12" font-size="4" text-anchor="middle" dy="0.3em" fill="currentColor">3</text>
        </svg>`;
        toggleBtn.title = 'Switch to 3-Way Mode';
        
        // Clear proposal C data
        proposalC = null;
        const fileInfoC = document.getElementById('file-info-c');
        const fileInputC = document.getElementById('file-c');
        if (fileInfoC) fileInfoC.classList.add('hidden');
        if (fileInputC) fileInputC.value = '';
        uploadC.classList.remove('active');
        
        // Reset any inline previews
        const uploadContentC = document.getElementById('upload-content-c');
        const inlinePreviewC = document.getElementById('inline-preview-c');
        if (uploadContentC) uploadContentC.classList.remove('hidden');
        if (inlinePreviewC) inlinePreviewC.classList.add('hidden');
    }
    
    // Update compare button state
    const requiredProposals = newMode ? 
        (proposalA && proposalB && proposalC) : 
        (proposalA && proposalB);
    compareBtn.disabled = !requiredProposals;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize mode from localStorage
    isThreeProposalMode = getThreeProposalMode();
    
    // Set up the UI
    addSettingsModal();
    
    // Apply saved mode setting
    if (isThreeProposalMode) {
        const uploadGrid = document.querySelector('.grid');
        const uploadC = document.getElementById('upload-c');
        
        if (uploadGrid) {
            uploadGrid.classList.add('three-mode');
        }
        if (uploadC) {
            uploadC.classList.remove('hidden');
        }
        
        // Add event listener for file C
        const fileInputC = document.getElementById('file-c');
        if (fileInputC) {
            fileInputC.addEventListener('change', (e) => handleFileUpload(e, 'C'));
            fileInputC.setAttribute('data-listener', 'true');
        }
    }
    
    // Small delay to ensure all elements are ready
    setTimeout(initializePdfPreview, 100);
    
    // Initialize advanced settings toggle
    initializeAdvancedSettings();
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
    analysisInstructionsTextarea.value = getDefaultAnalysisInstructions();
    
    // Load saved instructions if available
    const savedInstructions = localStorage.getItem('custom_analysis_instructions');
    if (savedInstructions) {
        analysisInstructionsTextarea.value = savedInstructions;
    }
    
    // Load saved special request
    const savedSpecialRequest = localStorage.getItem('special_request');
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
            localStorage.setItem('special_request', this.value);
        });
    }
    
    analysisInstructionsTextarea.addEventListener('input', function() {
        localStorage.setItem('custom_analysis_instructions', this.value);
    });
}

// Get default analysis instructions (editable part only)
function getDefaultAnalysisInstructions() {
    return `Compare proposals following this exact structure:

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

Bid Rev
    • Initial Budgetary Proposal +/-[Percentage]%
        ◦ Description: [Description Text]
        ◦ Est Init Date: [Initials] [Date]
    • [Revision Description e.g., Update proposal to No hurricane rating, GP interior/exterior per email sent on [Date]]
        ◦ Description: [Description Text]
        ◦ Est Init Date: [Initials] [Date]

Design Information
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

Exterior Construction Details
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

Client-Use Penetrations
    • [Status e.g., None Requested or List of Penetrations]

Interior Construction Details
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

Doors and Windows
    • Doors (Repeat for each door type if necessary)
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Size (e.g., [Width]" x [Height]"): [Description of Door Type, Features]
    • Exterior Door Accessories
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Nameplates: [Description]

Plumbing, Fixtures, and Accessories
    • [Status e.g., None Required or List of Items]

Electrical
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

Communications
    • [Status e.g., None Required or List of Systems/Items]

Fire & Gas Detection/Protection
    • [System Type e.g., Standalone Fire Detection & Protection Devices (Unsupervised)]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Smoke Detector ([Location e.g., room]): [Specification]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Auxiliary Relay: [Specification/Function]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Fire Extinguisher & Cabinet: [Specification, Rating, Size, Type]

HVAC
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

Cabinetry
    • [Status e.g., None Required or List of Items/Specifications]

Furnishings & Equipment
    • [Status e.g., None Required or List of Items/Specifications]

Exclusions
    • General Exclusions
        ◦ [Introductory statement e.g., Unless otherwise agreed upon by the parties in writing, the following are expressly excluded from HBM's scope of work and proposed cost set forth herein:]
        1. [Exclusion Clause Text]
        2. [Exclusion Clause Text]
        ◦ ... (Continue for all exclusion clauses)

General Conditions and Clarifications
    • General Conditions and Clarifications
        1. [Condition/Clarification Text]
        2. [Condition/Clarification Text]
        ◦ ... (Continue for all conditions/clarifications, including sub-points if any)
        ◦ [Specific Point e.g., 20. The HBM proposal is a preliminary estimate...]
            ▪ o [Sub-point Text]
            ▪ o [Sub-point Text]

Delivery
    • [Statement regarding delivery date basis and potential adjustments]

Documentation
    • [Statement on electronic format and signature validity]
    • [Statement on engineering time, drawing sets, and revision cycles]
    • Review / Revision Cycle - [Description of the cycle and timeframe]
    • Confirmation Cycle - [Description of the cycle and timeframe]
    • [Statement on changes after IFC drawings and potential costs]
    • [List of provided documentation/services e.g., Third Party plan review, PE stamped drawings (with scope), COMcheck report, etc.]

Pricing
    • Base Bid: [Item Name] - [Currency Symbol][Amount]
    • Total: [Item Description e.g., Building Price] - [Currency Symbol][Amount]
    • Option: [Option Name/Description] - [Price or "Upon Request"]
    • Option: [Option Name/Description] - [Price or "Upon Request"]
    • Option: Estimated Freight ([Destination]) - [Currency Symbol][Amount]
    • [Note on Freight Pricing e.g., Freight pricing is only a Rough Order of Magnitude price. Freight will be based on actual cost at time of shipping.]

Terms
    • [Payment terms description, e.g., Payment terms are net [Number] days from the date of HBM's invoice. Price change conditions.]

Payment Schedule
    • [Percentage]% Upon [Condition e.g., PO Placement]
    • [Percentage]% Upon [Condition e.g., Submittal of Approval Drawings]
    • [Percentage]% Upon [Condition e.g., Structural Fabrication Completion (scope limitations)]
    • [Percentage]% Upon [Condition e.g., Client Inspection at Hunter's Facility]
    • Freight, if applicable [Timing e.g., at Time of Shipment]

Cancellation
    • [Introductory statement about cancellation charges and responsibility for non-returnable materials/engineered systems:]
        ◦ [Percentage]% After [Condition e.g., Submittal of Approval Drawings]
        ◦ [Percentage]% After [Condition e.g., Development of Bills of Material]
        ◦ [Percentage]% After [Condition e.g., Materials Purchase Orders are Issued]
        ◦ [Percentage]% After [Condition e.g., Steel Fabrication]
        ◦ [Percentage]% After [Condition e.g., Interior Fit and Finish]

Certifications
    • [Image Placeholder or Text for Certification Logo/Name]
    • [Certifying Body Name]
    • [Certification Status e.g., CERTIFIED MANUFACTURER]

Freight
    • [Shipping Term e.g., FOB]
    • Module # [Module Identifier, if applicable]
        ◦ Est. Dimension (WxLxH): [Value]
        ◦ Estimated Weight: [Value Range] lbs
        ◦ [Cost e.g., [Currency Symbol][Amount]]
    • [Note on Estimated Weight/Freight Cost e.g., Estimated weight provided. Estimated freight cost/weight is subject to change based on actual cost/weight at the time of shipping]

Warranty
    • STANDARD WARRANTY: [General description of warranty coverage, duration, and remedies, limitations, and void conditions.]
    • TURNKEY WARRANTY: [General description if applicable, scope, duration.]
    • NO WORRIES WARRANTY: [General description if applicable, scope.]
    • [Instruction to contact sales representative for more information.]

Storage
    • [Introductory statement about when storage fees apply and that they are per-day.]
        ◦ [Currency Symbol][Amount] per Square Foot: [Condition e.g., Outdoor Storage without power to unit]
        ◦ [Currency Symbol][Amount] per Square Foot: [Condition e.g., Indoor Storage without power to unit]
        ◦ [Currency Symbol][Amount] per Square Foot: [Condition e.g., Outdoor Storage without power to unit, on and after [Number] days]
        ◦ [Currency Symbol][Amount] per Square Foot: [Condition e.g., Indoor Storage without power to unit, on and after [Number] days]

Comparison Instructions:
1. Extract all header information and proposal identifiers
2. Compare EVERY subsection and sub-item listed above
3. Record exact specifications, quantities, and values
4. Mark "Difference Found" for ANY variation
5. State differences factually (e.g., "A: 10'x20'x8', B: 12'x20'x8'")
6. Check freight prices in the Freight section
7. Note multi-module connection details in the Design Information section
8. IMPORTANT: Only include rows in comparisonTable that contain actual specification values - do not include empty section headers or rows where both proposals have no meaningful data

CRITICAL: CAPTURE EVERYTHING
The structure above is a GUIDE, not a limitation. If ANY proposal contains sections, items, specifications, or details that are NOT in this template structure, you MUST include them in your comparison. Do not exclude anything just because it doesn't fit the standard format. Every single difference matters - whether it's a non-standard section, an extra specification, a unique note, or any other content. The goal is COMPLETE difference identification. If something exists in one proposal but not others, or if proposals have unique sections not listed above, these MUST be captured and reported as differences.`;
}

// Get default three-way analysis instructions
function getDefaultThreeWayAnalysisInstructions() {
    return `Compare proposals following this exact structure across all three:

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

Bid Rev
    • Initial Budgetary Proposal +/-[Percentage]%
        ◦ Description: [Description Text]
        ◦ Est Init Date: [Initials] [Date]
    • [Revision Description e.g., Update proposal to No hurricane rating, GP interior/exterior per email sent on [Date]]
        ◦ Description: [Description Text]
        ◦ Est Init Date: [Initials] [Date]

Design Information
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

Exterior Construction Details
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

Client-Use Penetrations
    • [Status e.g., None Requested or List of Penetrations]

Interior Construction Details
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

Doors and Windows
    • Doors (Repeat for each door type if necessary)
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Size (e.g., [Width]" x [Height]"): [Description of Door Type, Features]
    • Exterior Door Accessories
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Nameplates: [Description]

Plumbing, Fixtures, and Accessories
    • [Status e.g., None Required or List of Items]

Electrical
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

Communications
    • [Status e.g., None Required or List of Systems/Items]

Fire & Gas Detection/Protection
    • [System Type e.g., Standalone Fire Detection & Protection Devices (Unsupervised)]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Smoke Detector ([Location e.g., room]): [Specification]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Auxiliary Relay: [Specification/Function]
        ◦ Qty: [Value], U/M: [Unit]
            ▪ Fire Extinguisher & Cabinet: [Specification, Rating, Size, Type]

HVAC
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

Cabinetry
    • [Status e.g., None Required or List of Items/Specifications]

Furnishings & Equipment
    • [Status e.g., None Required or List of Items/Specifications]

Exclusions
    • General Exclusions
        ◦ [Introductory statement e.g., Unless otherwise agreed upon by the parties in writing, the following are expressly excluded from HBM's scope of work and proposed cost set forth herein:]
        1. [Exclusion Clause Text]
        2. [Exclusion Clause Text]
        ◦ ... (Continue for all exclusion clauses)

General Conditions and Clarifications
    • General Conditions and Clarifications
        1. [Condition/Clarification Text]
        2. [Condition/Clarification Text]
        ◦ ... (Continue for all conditions/clarifications, including sub-points if any)
        ◦ [Specific Point e.g., 20. The HBM proposal is a preliminary estimate...]
            ▪ o [Sub-point Text]
            ▪ o [Sub-point Text]

Delivery
    • [Statement regarding delivery date basis and potential adjustments]

Documentation
    • [Statement on electronic format and signature validity]
    • [Statement on engineering time, drawing sets, and revision cycles]
    • Review / Revision Cycle - [Description of the cycle and timeframe]
    • Confirmation Cycle - [Description of the cycle and timeframe]
    • [Statement on changes after IFC drawings and potential costs]
    • [List of provided documentation/services e.g., Third Party plan review, PE stamped drawings (with scope), COMcheck report, etc.]

Pricing
    • Base Bid: [Item Name] - [Currency Symbol][Amount]
    • Total: [Item Description e.g., Building Price] - [Currency Symbol][Amount]
    • Option: [Option Name/Description] - [Price or "Upon Request"]
    • Option: [Option Name/Description] - [Price or "Upon Request"]
    • Option: Estimated Freight ([Destination]) - [Currency Symbol][Amount]
    • [Note on Freight Pricing e.g., Freight pricing is only a Rough Order of Magnitude price. Freight will be based on actual cost at time of shipping.]

Terms
    • [Payment terms description, e.g., Payment terms are net [Number] days from the date of HBM's invoice. Price change conditions.]

Payment Schedule
    • [Percentage]% Upon [Condition e.g., PO Placement]
    • [Percentage]% Upon [Condition e.g., Submittal of Approval Drawings]
    • [Percentage]% Upon [Condition e.g., Structural Fabrication Completion (scope limitations)]
    • [Percentage]% Upon [Condition e.g., Client Inspection at Hunter's Facility]
    • Freight, if applicable [Timing e.g., at Time of Shipment]

Cancellation
    • [Introductory statement about cancellation charges and responsibility for non-returnable materials/engineered systems:]
        ◦ [Percentage]% After [Condition e.g., Submittal of Approval Drawings]
        ◦ [Percentage]% After [Condition e.g., Development of Bills of Material]
        ◦ [Percentage]% After [Condition e.g., Materials Purchase Orders are Issued]
        ◦ [Percentage]% After [Condition e.g., Steel Fabrication]
        ◦ [Percentage]% After [Condition e.g., Interior Fit and Finish]

Certifications
    • [Image Placeholder or Text for Certification Logo/Name]
    • [Certifying Body Name]
    • [Certification Status e.g., CERTIFIED MANUFACTURER]

Freight
    • [Shipping Term e.g., FOB]
    • Module # [Module Identifier, if applicable]
        ◦ Est. Dimension (WxLxH): [Value]
        ◦ Estimated Weight: [Value Range] lbs
        ◦ [Cost e.g., [Currency Symbol][Amount]]
    • [Note on Estimated Weight/Freight Cost e.g., Estimated weight provided. Estimated freight cost/weight is subject to change based on actual cost/weight at the time of shipping]

Warranty
    • STANDARD WARRANTY: [General description of warranty coverage, duration, and remedies, limitations, and void conditions.]
    • TURNKEY WARRANTY: [General description if applicable, scope, duration.]
    • NO WORRIES WARRANTY: [General description if applicable, scope.]
    • [Instruction to contact sales representative for more information.]

Storage
    • [Introductory statement about when storage fees apply and that they are per-day.]
        ◦ [Currency Symbol][Amount] per Square Foot: [Condition e.g., Outdoor Storage without power to unit]
        ◦ [Currency Symbol][Amount] per Square Foot: [Condition e.g., Indoor Storage without power to unit]
        ◦ [Currency Symbol][Amount] per Square Foot: [Condition e.g., Outdoor Storage without power to unit, on and after [Number] days]
        ◦ [Currency Symbol][Amount] per Square Foot: [Condition e.g., Indoor Storage without power to unit, on and after [Number] days]

Three-Way Comparison Instructions:
1. Extract all header information and proposal identifiers from all three proposals
2. Compare EVERY subsection and sub-item listed above across A, B, and C
3. Record exact specifications, quantities, and values from all three proposals
4. Always populate all three specification fields (proposalASpec, proposalBSpec, proposalCSpec)
5. Mark "Difference Found" if ANY variation exists between proposals
6. Mark "No Change" only if all three are identical
7. State differences factually:
   - "A: 10'x20'x8', B: 12'x20'x8', C: 10'x20'x8'"
   - "A: Steel, B: Aluminum, C: Steel"
   - "Present in A only, not in B or C"
   - "Added in B and C only"
8. Check freight prices in the Freight section across all three
9. Note multi-module connection details in the Design Information section for all proposals
10. IMPORTANT: Only include rows in comparisonTable that contain actual specification values - do not include empty section headers or rows where all three proposals have no meaningful data

CRITICAL: CAPTURE EVERYTHING
The structure above is a GUIDE, not a limitation. If ANY proposal contains sections, items, specifications, or details that are NOT in this template structure, you MUST include them in your comparison. Do not exclude anything just because it doesn't fit the standard format. Every single difference matters - whether it's a non-standard section, an extra specification, a unique note, or any other content. The goal is COMPLETE difference identification. If something exists in one proposal but not others, or if proposals have unique sections not listed above, these MUST be captured and reported as differences.`;
}

// Inline Preview Functionality
async function showInlinePreview(proposalId, file) {
    const uploadContent = document.getElementById(`upload-content-${proposalId.toLowerCase()}`);
    const inlinePreview = document.getElementById(`inline-preview-${proposalId.toLowerCase()}`);
    const inlineTitle = document.getElementById(`inline-title-${proposalId.toLowerCase()}`);
    const inlineFilename = document.getElementById(`inline-filename-${proposalId.toLowerCase()}`);
    const inlineCanvas = document.getElementById(`inline-canvas-${proposalId.toLowerCase()}`);
    
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
        // If preview fails, show file info instead
        showError('Could not generate preview, but file was uploaded successfully');
    }
}

// Make resetUpload globally accessible
window.resetUpload = function(proposalId) {
    const uploadContent = document.getElementById(`upload-content-${proposalId.toLowerCase()}`);
    const inlinePreview = document.getElementById(`inline-preview-${proposalId.toLowerCase()}`);
    const fileInput = document.getElementById(`file-${proposalId.toLowerCase()}`);
    const uploadSection = document.getElementById(`upload-${proposalId.toLowerCase()}`);
    
    // Reset proposal data
    if (proposalId === 'A') {
        proposalA = null;
    } else if (proposalId === 'B') {
        proposalB = null;
    } else if (proposalId === 'C') {
        proposalC = null;
    }
    
    // Reset UI
    uploadContent.classList.remove('hidden');
    inlinePreview.classList.add('hidden');
    fileInput.value = '';
    uploadSection.classList.remove('active');
    
    // Update compare button state
    const requiredProposals = isThreeProposalMode ? 
        (proposalA && proposalB && proposalC) : 
        (proposalA && proposalB);
    compareBtn.disabled = !requiredProposals;
}

// PDF Preview Functionality
let currentPreviewPdf = null;
let currentPreviewPage = 1;
let totalPreviewPages = 0;

// Preview modal elements - will be set in initializePdfPreview
let previewModal, previewTitle, previewCanvas, closePreviewBtn, prevPageBtn, nextPageBtn, currentPageSpan, totalPagesSpan;
let previewBtnA, previewBtnB, previewBtnC;

// Initialize preview functionality
function initializePdfPreview() {
    // Get DOM elements when DOM is ready
    previewModal = document.getElementById('pdf-preview-modal');
    previewTitle = document.getElementById('preview-title');
    previewCanvas = document.getElementById('pdf-canvas');
    closePreviewBtn = document.getElementById('close-preview');
    prevPageBtn = document.getElementById('prev-page');
    nextPageBtn = document.getElementById('next-page');
    currentPageSpan = document.getElementById('current-page');
    totalPagesSpan = document.getElementById('total-pages');
    previewBtnA = document.getElementById('preview-btn-a');
    previewBtnB = document.getElementById('preview-btn-b');
    previewBtnC = document.getElementById('preview-btn-c');
    
    // Close modal events
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.closePdfPreview();
        });
        console.log('Close button event listener attached successfully');
    } else {
        console.error('Close button not found!');
    }
    
    if (previewModal) {
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                window.closePdfPreview();
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
        if (!previewModal || previewModal.classList.contains('hidden')) return;
        
        if (e.key === 'Escape') {
            window.closePdfPreview();
        } else if (e.key === 'ArrowLeft' && currentPreviewPage > 1) {
            currentPreviewPage--;
            renderPreviewPage();
        } else if (e.key === 'ArrowRight' && currentPreviewPage < totalPreviewPages) {
            currentPreviewPage++;
            renderPreviewPage();
        }
    });
    
    // Preview button events
    if (previewBtnA) {
        previewBtnA.addEventListener('click', () => window.openPdfPreview('A'));
    }
    if (previewBtnB) {
        previewBtnB.addEventListener('click', () => window.openPdfPreview('B'));
    }
    if (previewBtnC) {
        previewBtnC.addEventListener('click', () => window.openPdfPreview('C'));
    }
}

// Open PDF preview - make it globally accessible
window.openPdfPreview = async function(proposalType) {
    // Make sure we have the DOM elements
    if (!previewModal) {
        previewModal = document.getElementById('pdf-preview-modal');
        previewTitle = document.getElementById('preview-title');
        previewCanvas = document.getElementById('pdf-canvas');
        closePreviewBtn = document.getElementById('close-preview');
        prevPageBtn = document.getElementById('prev-page');
        nextPageBtn = document.getElementById('next-page');
        currentPageSpan = document.getElementById('current-page');
        totalPagesSpan = document.getElementById('total-pages');
    }
    
    let proposal, filename;
    
    switch (proposalType) {
        case 'A':
            proposal = proposalA;
            filename = proposalA?.file?.name || 'Document A';
            break;
        case 'B':
            proposal = proposalB;
            filename = proposalB?.file?.name || 'Document B';
            break;
        case 'C':
            proposal = proposalC;
            filename = proposalC?.file?.name || 'Document C';
            break;
        default:
            return;
    }
    
    if (!proposal || !proposal.file) {
        showError('PDF file not found for preview');
        return;
    }
    
    try {
        // Set title
        if (previewTitle) {
            previewTitle.textContent = `Preview: ${filename}`;
        }
        
        // Load PDF
        const arrayBuffer = await proposal.file.arrayBuffer();
        currentPreviewPdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        totalPreviewPages = currentPreviewPdf.numPages;
        currentPreviewPage = 1;
        
        // Update UI
        if (totalPagesSpan) {
            totalPagesSpan.textContent = totalPreviewPages;
        }
        updatePreviewNavigation();
        
        // Render first page
        await renderPreviewPage();
        
        // Show modal
        if (previewModal) {
            previewModal.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Error opening PDF preview:', error);
        showError('Failed to load PDF preview');
    }
}

// Render current page
async function renderPreviewPage() {
    if (!currentPreviewPdf) return;
    
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
        if (currentPageSpan) {
            currentPageSpan.textContent = currentPreviewPage;
        }
        updatePreviewNavigation();
        
    } catch (error) {
        console.error('Error rendering PDF page:', error);
        showError('Failed to render PDF page');
    }
}

// Update navigation buttons
function updatePreviewNavigation() {
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPreviewPage <= 1;
    }
    if (nextPageBtn) {
        nextPageBtn.disabled = currentPreviewPage >= totalPreviewPages;
    }
}

// Close preview modal - make it globally accessible
window.closePdfPreview = function() {
    // Get the modal element directly
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
    
    // Update the previewModal reference
    previewModal = modal;
}

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
        area.addEventListener('drop', (e) => handleDrop(e, area), false);
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

function handleDrop(e, area) {
    handleDragLeave(area);
    
    const files = Array.from(e.dataTransfer.files);
    const uploadId = area.getAttribute('data-upload-id');
    
    if (files.length === 0) return;
    
    // Get the first PDF file
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (!pdfFile) {
        showError('Please drop a PDF file.');
        return;
    }
    
    if (files.length > 1) {
        showError('Please drop only one PDF file at a time.');
        return;
    }
    
    // Simulate file input change event
    const fileInput = document.getElementById(`file-${uploadId.toLowerCase()}`);
    if (fileInput) {
        // Create a new FileList-like object
        const dt = new DataTransfer();
        dt.items.add(pdfFile);
        fileInput.files = dt.files;
        
        // Trigger the existing upload handler
        handleFileUpload({ target: { files: [pdfFile] } }, uploadId);
    }
}

 
 