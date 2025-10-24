# AI PDF Proposal Comparer - Vanilla Version

This is a vanilla HTML/CSS/JavaScript version of the AI PDF Proposal Comparer that runs directly in your browser - **no server required!**

## 📋 Requirements

- **LM Studio** running locally (OpenAI-compatible API)
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

## 🚀 Quick Start

### 1. Start LM Studio local server
1. Install and open LM Studio
2. Start the local server (default `http://127.0.0.1:1234`)
3. Load a local model and ensure it appears under `/v1/models`

### 2. Open the App
1. Simply open `index.html` in your web browser
2. The app connects to your LM Studio server (no API key needed)
3. Upload two PDF files to compare
4. Click "Compare Proposals" and wait for results
5. Download the comparison report when ready

## 📁 Project Structure

```
├── index.html           # Main HTML file
├── js/
│   └── app.js           # JavaScript application
├── public/
│   └── hunter_logo.png  # Logo file
└── README.md            # This file
```

## 🔧 Features

- **No Node.js Required**: Runs with just Python
- **PDF Processing**: Handles PDF files using PDF.js library
- **AI Comparison**: Uses LM Studio (OpenAI-compatible) for intelligent comparison
- **Beautiful Reports**: Generates downloadable HTML reports
- **Responsive Design**: Works on desktop and mobile
- **API Key Management**: Saves your API key securely in browser storage

## 🛠️ Troubleshooting

### File Access Issues
- Make sure you can access the `index.html` file
- Some browsers may block local file access - try using a simple HTTP server if needed
- Ensure all files are in the correct directory structure

### Browser Shows Error
- Ensure `index.html` and `js/app.js` exist
- Check the console for JavaScript errors
- Make sure you have an internet connection (needed for PDF.js CDN)

### Local Server Issues
- Ensure LM Studio is running at `http://127.0.0.1:1234`
- Verify that at least one model is loaded and selectable in settings

### PDF Upload Problems
- Ensure files are valid PDF documents
- Large PDFs may take longer to process
- Some encrypted PDFs may not work

## 🌐 Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## 🔒 Privacy & Security

- **Local Model**: Selected and stored locally in your browser
- **PDF Files**: Processed locally and sent only to your local LM Studio model
- **No Data Storage**: No data is stored on our servers

## 📝 Usage Tips

1. **File Names**: Use descriptive PDF file names as they appear in reports
2. **Local Model**: The app will remember your selected local model
3. **Large Files**: Larger PDFs take longer to process - be patient
4. **Internet**: Active internet connection required for AI processing

## 🆚 Key Features

- **No Server Required**: Runs directly in your browser
- **Vanilla JavaScript**: No frameworks or build tools needed
- **Direct API Integration**: Connects directly to LM Studio's OpenAI-compatible API
- **Simple Deployment**: Just open the HTML file
- **Portable**: Works from any folder or even from a USB drive

## 📞 Support

If you encounter issues:
1. Check this README first
2. Look at the browser console for error messages
3. Ensure all requirements are met
4. Try refreshing the page or restarting the server

---

**Happy comparing! 🎉** 