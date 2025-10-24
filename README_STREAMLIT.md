# Hunter Buildings AI Analysis Tool - Streamlit Version

A powerful AI-powered analysis tool for technical document comparison, specification compliance checking, and contract analysis. This Streamlit version provides a modern, user-friendly interface for all analysis features.

## Features

### 1. PDF Proposal Comparison
- **Two-Way Comparison**: Compare two proposal documents side-by-side
- **Three-Way Comparison**: Compare three proposal documents simultaneously
- AI-powered analysis to identify differences, strengths, and weaknesses
- Generate comprehensive HTML reports

### 2. Specification Compliance Checker
- Compare specification (SPEC) documents against proposals
- Detailed requirement-by-requirement analysis
- Identify matches, partial matches, mismatches, and gaps
- Special analysis features:
  - Welded component material assumptions
  - Multi-module connection verification
  - ADA compliance checking
- Color-coded compliance reports

### 3. IFC Analysis
- Analyze Industry Foundation Classes (IFC) building information models
- Material analysis
- Structural component review
- Building systems analysis

### 4. Contract Helper
- Extract and analyze contract clauses
- Compare contract terms
- Identify obligations and responsibilities
- Risk assessment and compliance review
- Side-by-side contract comparison

## Installation

### Prerequisites
- Python 3.8 or higher
- [LM Studio](https://lmstudio.ai/) installed and running locally
- A language model loaded in LM Studio

### Setup

1. **Clone or navigate to the project directory**
```bash
cd AI-Project
```

2. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

3. **Start LM Studio**
   - Launch LM Studio application
   - Load a language model (e.g., Mistral, Llama, etc.)
   - Ensure the local server is running on `http://127.0.0.1:1234`

4. **Run the Streamlit application**
```bash
streamlit run app.py
```

5. **Access the application**
   - Open your web browser
   - Navigate to `http://localhost:8501`

## Usage

### PDF Comparison

1. Navigate to **PDF Comparison** in the sidebar
2. Choose comparison mode (2-way or 3-way)
3. Upload your PDF documents
4. Configure settings (optional):
   - Select AI model
   - Add custom analysis instructions
5. Click **Run Comparison Analysis**
6. Review results and download HTML report

### Spec Compliance Checking

1. Navigate to **Spec Comparison** in the sidebar
2. Upload SPEC document (requirements/specifications)
3. Upload Proposal document
4. Configure settings (optional)
5. Click **Run Compliance Analysis**
6. Review detailed compliance report
7. Download HTML report

### IFC Analysis

1. Navigate to **IFC Analysis** in the sidebar
2. Upload IFC file or paste IFC data
3. Select analysis type:
   - General Overview
   - Material Analysis
   - Structural Components
   - Building Systems
   - Custom Analysis
4. Click **Run IFC Analysis**
5. Review and download results

### Contract Analysis

1. Navigate to **Contract Helper** in the sidebar
2. Upload contract document (PDF, DOCX, or TXT)
3. Select analysis type:
   - Contract Summary
   - Key Clauses Extraction
   - Obligations & Responsibilities
   - Risk Assessment
   - Compliance Review
4. Click **Run Contract Analysis**
5. Optional: Upload a second contract for comparison
6. Review and download analysis report

## Configuration

### LM Studio Settings
- Default URL: `http://127.0.0.1:1234/v1`
- The application automatically detects available models
- Select your preferred model in the Settings section of each page

### Custom Styling
The application uses Hunter Buildings brand colors:
- Hunter Green: `#38543C`
- Hunter Blue: `#24344B`
- Alert Orange: `#F26622`

## File Structure

```
AI-Project/
├── app.py                      # Main Streamlit application
├── requirements.txt            # Python dependencies
├── README_STREAMLIT.md        # This file
├── pages/                      # Application pages
│   ├── __init__.py
│   ├── pdf_comparison.py      # PDF comparison page
│   ├── spec_comparison.py     # Spec compliance page
│   ├── ifc_analysis.py        # IFC analysis page
│   └── contract_helper.py     # Contract helper page
├── utils/                      # Utility modules
│   ├── __init__.py
│   ├── pdf_utils.py           # PDF processing utilities
│   └── ai_utils.py            # AI integration utilities
├── public/                     # Assets
│   └── hunter_logo.png        # Hunter Buildings logo
└── Prompt MATT.txt            # Analysis prompt template
```

## Troubleshooting

### LM Studio Connection Issues
- Ensure LM Studio is running and a model is loaded
- Check that the server is accessible at `http://127.0.0.1:1234`
- Verify firewall settings aren't blocking localhost connections

### PDF Extraction Issues
- Ensure PDFs are not password-protected
- Try re-extracting the text if initial extraction seems incomplete
- Large PDFs (>200k characters) will be truncated for analysis

### Memory Issues
- Close other applications to free up RAM
- Use smaller documents if possible
- Consider using a more efficient model in LM Studio

## Privacy & Security

- **All processing is local**: No data is sent to external servers
- **Privacy-first**: Documents are processed using your local LM Studio instance
- **No API keys required**: No cloud services or external APIs needed
- **Secure**: All analysis happens on your machine

## Migration from Original Version

This Streamlit version replaces the original HTML/JavaScript interface with several improvements:

### Advantages
- ✅ Modern, responsive UI with better UX
- ✅ Easier to maintain and extend
- ✅ Better state management
- ✅ More robust file handling
- ✅ Improved error handling
- ✅ Real-time streaming of AI responses
- ✅ Better mobile compatibility

### What's the Same
- ✅ All core features preserved
- ✅ Same local AI processing with LM Studio
- ✅ Same analysis quality
- ✅ Hunter Buildings branding maintained
- ✅ No external dependencies or API keys

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Verify LM Studio is running and configured correctly
3. Review Streamlit documentation at https://docs.streamlit.io

## License

Internal tool for Hunter Buildings. All rights reserved.

## Version History

### v2.0.0 - Streamlit Migration (2024)
- Complete migration from HTML/JavaScript to Streamlit
- Enhanced UI/UX with modern design
- Improved file handling and error management
- Added real-time streaming analysis results
- Maintained all original features and functionality

### v1.0.0 - Original Version
- HTML/JavaScript implementation
- PDF comparison and analysis features
- Local AI processing with LM Studio
