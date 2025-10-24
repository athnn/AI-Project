"""Contract Helper page - Contract document processing and analysis."""
import streamlit as st
import sys
from pathlib import Path
from docx import Document
from io import BytesIO

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.pdf_utils import extract_text_from_pdf, get_pdf_info
from utils.ai_utils import LMStudioClient


def extract_text_from_docx(docx_file):
    """Extract text from a DOCX file."""
    try:
        doc = Document(BytesIO(docx_file.read()))
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    except Exception as e:
        raise Exception(f"Error extracting text from DOCX: {str(e)}")


def show():
    """Display the Contract Helper page."""
    st.title("📝 Contract Helper")
    st.markdown("Analyze and process contract documents with AI assistance.")

    # Info box
    st.info("""
    📌 **Contract Helper Tool**

    This tool helps you:
    - Extract and analyze contract clauses
    - Compare contract terms
    - Identify key obligations and responsibilities
    - Review contract compliance
    - Generate contract summaries
    """)

    # Initialize session state
    if 'contract_text' not in st.session_state:
        st.session_state.contract_text = None

    # Settings in expander
    with st.expander("⚙️ Settings", expanded=False):
        # Initialize LM Studio client
        lm_client = LMStudioClient()

        # Get available models
        models = lm_client.get_available_models()

        if models:
            selected_model = st.selectbox(
                "Select AI Model",
                options=models,
                help="Choose the LM Studio model to use for analysis"
            )
            st.session_state.contract_selected_model = selected_model
        else:
            st.error("⚠️ Cannot connect to LM Studio. Please ensure it's running on http://127.0.0.1:1234")
            st.info("💡 Start LM Studio and load a model, then refresh this page.")
            st.session_state.contract_selected_model = None

        # Custom instructions
        custom_instructions = st.text_area(
            "Custom Analysis Instructions (Optional)",
            height=100,
            placeholder="Enter any specific instructions for the contract analysis...",
            help="Add custom instructions to guide the AI analysis"
        )
        st.session_state.contract_custom_instructions = custom_instructions

    st.markdown("---")

    # File upload section
    st.markdown("### Upload Contract Document")

    contract_file = st.file_uploader(
        "Upload Contract Document",
        type=['pdf', 'docx', 'txt'],
        help="Upload a contract document (PDF, DOCX, or TXT)"
    )

    if contract_file:
        try:
            file_type = contract_file.name.split('.')[-1].lower()

            if file_type == 'pdf':
                pdf_info = get_pdf_info(contract_file)
                st.success(f"✅ {pdf_info['file_name']}")
                st.caption(f"Pages: {pdf_info['page_count']} | Size: {pdf_info['file_size'] / 1024:.1f} KB")

                if st.session_state.contract_text is None or st.button("Re-extract Text"):
                    with st.spinner("Extracting text from PDF..."):
                        st.session_state.contract_text = extract_text_from_pdf(contract_file)
                        st.success(f"Extracted {len(st.session_state.contract_text)} characters")

            elif file_type == 'docx':
                st.success(f"✅ {contract_file.name}")
                file_size = len(contract_file.getvalue())
                st.caption(f"Size: {file_size / 1024:.1f} KB")

                if st.session_state.contract_text is None or st.button("Re-extract Text"):
                    with st.spinner("Extracting text from DOCX..."):
                        st.session_state.contract_text = extract_text_from_docx(contract_file)
                        st.success(f"Extracted {len(st.session_state.contract_text)} characters")

            elif file_type == 'txt':
                st.success(f"✅ {contract_file.name}")
                text_content = contract_file.read().decode('utf-8', errors='ignore')
                st.session_state.contract_text = text_content
                st.caption(f"Size: {len(text_content)} characters")

            # Show preview
            if st.session_state.contract_text:
                with st.expander("📄 Preview Contract Text"):
                    preview_length = 2000
                    preview_text = st.session_state.contract_text[:preview_length]
                    if len(st.session_state.contract_text) > preview_length:
                        preview_text += "\n..."
                    st.text_area(
                        "Contract Content Preview",
                        value=preview_text,
                        height=200,
                        disabled=True
                    )

        except Exception as e:
            st.error(f"Error processing contract document: {str(e)}")

    st.markdown("---")

    # Analysis section
    st.markdown("### Contract Analysis")

    # Analysis options
    analysis_type = st.selectbox(
        "Analysis Type",
        [
            "Contract Summary",
            "Key Clauses Extraction",
            "Obligations & Responsibilities",
            "Risk Assessment",
            "Compliance Review",
            "Custom Analysis"
        ],
        help="Select the type of analysis to perform"
    )

    # Check if we have the required data
    can_analyze = (st.session_state.contract_text is not None and
                  st.session_state.contract_selected_model is not None)

    if not can_analyze:
        missing_items = []
        if st.session_state.contract_text is None:
            missing_items.append("Contract Document")
        if st.session_state.contract_selected_model is None:
            missing_items.append("LM Studio connection")

        st.warning(f"⚠️ Please upload {', '.join(missing_items)} to run analysis")

    if st.button("🚀 Run Contract Analysis", disabled=not can_analyze, use_container_width=True):
        # Create the prompt based on analysis type
        analysis_prompts = {
            "Contract Summary": """Provide a comprehensive summary of this contract, including:
- Main parties involved
- Purpose and scope of the contract
- Key terms and conditions
- Duration and termination clauses
- Important dates and milestones""",

            "Key Clauses Extraction": """Extract and summarize the key clauses from this contract, including:
- Payment terms
- Delivery/Performance obligations
- Warranties and guarantees
- Liability and indemnification
- Termination conditions
- Dispute resolution""",

            "Obligations & Responsibilities": """Analyze and list the obligations and responsibilities for each party:
- Party A obligations
- Party B obligations
- Mutual obligations
- Deadlines and milestones
- Performance standards""",

            "Risk Assessment": """Assess potential risks in this contract:
- Legal risks
- Financial risks
- Operational risks
- Compliance risks
- Recommendations for risk mitigation""",

            "Compliance Review": """Review the contract for compliance with standard practices:
- Missing or unclear terms
- Unusual or potentially problematic clauses
- Recommendations for improvement
- Areas needing legal review""",

            "Custom Analysis": st.session_state.contract_custom_instructions or "Analyze this contract and provide insights."
        }

        prompt = f"""{analysis_prompts[analysis_type]}

CONTRACT DOCUMENT:
{st.session_state.contract_text}

Please provide a detailed, structured analysis."""

        # Run analysis
        st.markdown("### Contract Analysis Results")
        st.info("🤖 AI analysis in progress...")

        # Create placeholder for streaming results
        result_placeholder = st.empty()
        full_response = ""

        try:
            lm_client = LMStudioClient()

            with st.spinner("Analyzing contract..."):
                for chunk in lm_client.analyze_documents(prompt, st.session_state.contract_selected_model, stream=True):
                    full_response += chunk
                    result_placeholder.markdown(full_response)

            # Display final result
            st.success("✅ Contract analysis complete!")

            # Download button
            st.download_button(
                label="📥 Download Analysis Report",
                data=full_response,
                file_name=f"contract_analysis_{analysis_type.lower().replace(' ', '_')}.txt",
                mime="text/plain",
                use_container_width=True
            )

        except Exception as e:
            st.error(f"❌ Error during analysis: {str(e)}")

    # Contract Comparison Section
    st.markdown("---")
    st.markdown("### 🔄 Contract Comparison")

    with st.expander("Compare Two Contracts"):
        st.markdown("Upload a second contract to compare with the first one.")

        contract_file_2 = st.file_uploader(
            "Upload Second Contract Document",
            type=['pdf', 'docx', 'txt'],
            key="contract_2",
            help="Upload a second contract to compare"
        )

        if contract_file_2 and st.session_state.contract_text:
            try:
                # Extract text from second contract
                file_type_2 = contract_file_2.name.split('.')[-1].lower()

                if file_type_2 == 'pdf':
                    contract_text_2 = extract_text_from_pdf(contract_file_2)
                elif file_type_2 == 'docx':
                    contract_text_2 = extract_text_from_docx(contract_file_2)
                else:
                    contract_text_2 = contract_file_2.read().decode('utf-8', errors='ignore')

                st.success(f"✅ Second contract loaded ({len(contract_text_2)} characters)")

                if st.button("🚀 Compare Contracts", use_container_width=True):
                    comparison_prompt = f"""Compare these two contracts and identify:
1. Key differences in terms and conditions
2. Differences in obligations and responsibilities
3. Variations in payment terms
4. Differences in liability and risk allocation
5. Recommendations on which terms are more favorable

CONTRACT 1:
{st.session_state.contract_text}

CONTRACT 2:
{contract_text_2}

Provide a detailed comparison in a structured format."""

                    # Run comparison
                    st.markdown("### Contract Comparison Results")
                    result_placeholder = st.empty()
                    full_response = ""

                    try:
                        lm_client = LMStudioClient()

                        with st.spinner("Comparing contracts..."):
                            for chunk in lm_client.analyze_documents(comparison_prompt, st.session_state.contract_selected_model, stream=True):
                                full_response += chunk
                                result_placeholder.markdown(full_response)

                        st.success("✅ Comparison complete!")

                        st.download_button(
                            label="📥 Download Comparison Report",
                            data=full_response,
                            file_name="contract_comparison.txt",
                            mime="text/plain",
                            use_container_width=True
                        )

                    except Exception as e:
                        st.error(f"❌ Error during comparison: {str(e)}")

            except Exception as e:
                st.error(f"Error processing second contract: {str(e)}")

    # Reset button
    if st.button("🔄 Reset", use_container_width=True):
        st.session_state.contract_text = None
        st.rerun()
