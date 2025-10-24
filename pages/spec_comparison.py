"""Spec Comparison page - SPEC vs Proposal compliance checking."""
import streamlit as st
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.pdf_utils import extract_text_from_pdf, get_pdf_info
from utils.ai_utils import LMStudioClient, create_spec_comparison_prompt


def show():
    """Display the Spec Comparison page."""
    st.title("📋 Specification Compliance Checker")
    st.markdown("Analyze specification documents against proposal documents for compliance.")

    # Initialize session state
    if 'spec_text' not in st.session_state:
        st.session_state.spec_text = None
    if 'proposal_text' not in st.session_state:
        st.session_state.proposal_text = None

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
            st.session_state.spec_selected_model = selected_model
        else:
            st.error("⚠️ Cannot connect to LM Studio. Please ensure it's running on http://127.0.0.1:1234")
            st.info("💡 Start LM Studio and load a model, then refresh this page.")
            st.session_state.spec_selected_model = None

        # Custom instructions
        custom_instructions = st.text_area(
            "Custom Analysis Instructions (Optional)",
            height=100,
            placeholder="Enter any specific instructions for the compliance analysis...",
            help="Add custom instructions to guide the AI analysis"
        )
        st.session_state.spec_custom_instructions = custom_instructions

    st.markdown("---")

    # File upload section
    st.markdown("### Upload Documents")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("#### Specification Document (SPEC)")
        spec_file = st.file_uploader(
            "Upload SPEC Document (PDF)",
            type=['pdf'],
            key="spec_file",
            help="Upload the specification/requirements document"
        )

        if spec_file:
            try:
                pdf_info = get_pdf_info(spec_file)
                st.success(f"✅ {pdf_info['file_name']}")
                st.caption(f"Pages: {pdf_info['page_count']} | Size: {pdf_info['file_size'] / 1024:.1f} KB")

                # Extract text
                if st.session_state.spec_text is None or st.button("Re-extract SPEC Text", key="reextract_spec"):
                    with st.spinner("Extracting text from SPEC document..."):
                        st.session_state.spec_text = extract_text_from_pdf(spec_file)
                        st.success(f"Extracted {len(st.session_state.spec_text)} characters")
            except Exception as e:
                st.error(f"Error processing SPEC document: {str(e)}")

    with col2:
        st.markdown("#### Proposal Document")
        proposal_file = st.file_uploader(
            "Upload Proposal Document (PDF)",
            type=['pdf'],
            key="proposal_file",
            help="Upload the proposal document to check against SPEC"
        )

        if proposal_file:
            try:
                pdf_info = get_pdf_info(proposal_file)
                st.success(f"✅ {pdf_info['file_name']}")
                st.caption(f"Pages: {pdf_info['page_count']} | Size: {pdf_info['file_size'] / 1024:.1f} KB")

                # Extract text
                if st.session_state.proposal_text is None or st.button("Re-extract Proposal Text", key="reextract_proposal"):
                    with st.spinner("Extracting text from Proposal document..."):
                        st.session_state.proposal_text = extract_text_from_pdf(proposal_file)
                        st.success(f"Extracted {len(st.session_state.proposal_text)} characters")
            except Exception as e:
                st.error(f"Error processing Proposal document: {str(e)}")

    st.markdown("---")

    # Analysis section
    st.markdown("### Run Compliance Analysis")

    # Check if we have the required documents
    can_analyze = (st.session_state.spec_text is not None and
                  st.session_state.proposal_text is not None and
                  st.session_state.spec_selected_model is not None)

    if not can_analyze:
        missing_items = []
        if st.session_state.spec_text is None:
            missing_items.append("SPEC Document")
        if st.session_state.proposal_text is None:
            missing_items.append("Proposal Document")
        if st.session_state.spec_selected_model is None:
            missing_items.append("LM Studio connection")

        st.warning(f"⚠️ Please upload {', '.join(missing_items)} to run analysis")

    # Info about the analysis
    with st.expander("ℹ️ About Compliance Analysis"):
        st.markdown("""
        This analysis will:
        - Compare each requirement in the SPEC against the Proposal
        - Identify matches, partial matches, and mismatches
        - Highlight gaps where SPEC requirements are not addressed
        - Flag areas needing clarification
        - Generate a comprehensive HTML report with detailed tables

        **Special Analysis Features:**
        - Welded Component Material Assumptions
        - Multi-Module Connection Verification
        - ADA Compliance Checking
        - Detailed status indicators and color-coded results
        """)

    if st.button("🚀 Run Compliance Analysis", disabled=not can_analyze, use_container_width=True):
        # Create the prompt
        prompt = create_spec_comparison_prompt(
            st.session_state.spec_text,
            st.session_state.proposal_text,
            st.session_state.spec_custom_instructions or ""
        )

        # Run analysis
        st.markdown("### Compliance Analysis Results")
        st.info("🤖 AI analysis in progress... This may take several minutes due to the detailed nature of compliance checking.")

        # Create placeholder for streaming results
        result_placeholder = st.empty()
        full_response = ""

        try:
            lm_client = LMStudioClient()

            with st.spinner("Analyzing compliance..."):
                for chunk in lm_client.analyze_documents(prompt, st.session_state.spec_selected_model, stream=True):
                    full_response += chunk
                    result_placeholder.markdown(full_response)

            # Display final result
            st.success("✅ Compliance analysis complete!")

            # Display the HTML report directly if it contains HTML
            if "<html" in full_response.lower() or "<!doctype" in full_response.lower():
                st.markdown("---")
                st.markdown("### 📊 Compliance Report")
                st.components.v1.html(full_response, height=800, scrolling=True)

                # Download button
                st.download_button(
                    label="📥 Download HTML Report",
                    data=full_response,
                    file_name="spec_compliance_report.html",
                    mime="text/html",
                    use_container_width=True
                )
            else:
                st.download_button(
                    label="📥 Download Report",
                    data=full_response,
                    file_name="spec_compliance_report.txt",
                    mime="text/plain",
                    use_container_width=True
                )

        except Exception as e:
            st.error(f"❌ Error during analysis: {str(e)}")

    # Reset button
    if st.button("🔄 Reset All", use_container_width=True):
        st.session_state.spec_text = None
        st.session_state.proposal_text = None
        st.rerun()
