"""PDF processing utilities for extracting text from PDF files."""
import PyPDF2
from io import BytesIO


def extract_text_from_pdf(pdf_file, max_chars=200000):
    """
    Extract text from a PDF file.

    Args:
        pdf_file: File object or bytes from Streamlit file uploader
        max_chars: Maximum number of characters to extract (default: 200000)

    Returns:
        str: Extracted text from the PDF
    """
    try:
        # Create a PDF reader object
        pdf_reader = PyPDF2.PdfReader(BytesIO(pdf_file.read()))

        # Extract text from all pages
        text = ""
        for page_num, page in enumerate(pdf_reader.pages):
            page_text = page.extract_text()
            text += page_text + "\n"

            # Check if we've exceeded max characters
            if len(text) >= max_chars:
                text = text[:max_chars]
                break

        return text.strip()
    except Exception as e:
        raise Exception(f"Error extracting text from PDF: {str(e)}")


def get_pdf_info(pdf_file):
    """
    Get information about a PDF file.

    Args:
        pdf_file: File object from Streamlit file uploader

    Returns:
        dict: PDF information including page count and file size
    """
    try:
        # Read file into bytes
        pdf_bytes = pdf_file.read()
        pdf_reader = PyPDF2.PdfReader(BytesIO(pdf_bytes))

        # Reset file pointer for future reads
        pdf_file.seek(0)

        return {
            "page_count": len(pdf_reader.pages),
            "file_size": len(pdf_bytes),
            "file_name": pdf_file.name
        }
    except Exception as e:
        raise Exception(f"Error getting PDF info: {str(e)}")
