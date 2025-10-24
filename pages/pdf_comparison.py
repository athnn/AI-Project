"""PDF Comparison page - 2-way and 3-way proposal comparison."""
import streamlit as st
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.pdf_utils import extract_text_from_pdf, get_pdf_info
from utils.ai_utils import LMStudioClient, create_comparison_prompt


def show():
    """Display the PDF Comparison page."""
    st.title("📄 PDF Proposal Comparison")
    st.markdown("Compare two or three proposal documents using AI analysis.")

    # Initialize session state
    if 'comparison_mode' not in st.session_state:
        st.session_state.comparison_mode = 'two_way'
    if 'pdf_a_text' not in st.session_state:
        st.session_state.pdf_a_text = None
    if 'pdf_b_text' not in st.session_state:
        st.session_state.pdf_b_text = None
    if 'pdf_c_text' not in st.session_state:
        st.session_state.pdf_c_text = None

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
            st.session_state.selected_model = selected_model
        else:
            st.error("⚠️ Cannot connect to LM Studio. Please ensure it's running on http://127.0.0.1:1234")
            st.info("💡 Start LM Studio and load a model, then refresh this page.")
            st.session_state.selected_model = None

        # Custom instructions
        custom_instructions = st.text_area(
            "Custom Analysis Instructions (Optional)",
            height=100,
            placeholder="Enter any specific instructions for the AI analysis...",
            help="Add custom instructions to guide the AI analysis"
        )
        st.session_state.custom_instructions = custom_instructions

    # Comparison mode toggle
    st.markdown("### Comparison Mode")
    col1, col2 = st.columns(2)

    with col1:
        if st.button("🔄 Two-Way Comparison", use_container_width=True):
            st.session_state.comparison_mode = 'two_way'
            st.session_state.pdf_c_text = None
            st.rerun()

    with col2:
        if st.button("🔄 Three-Way Comparison", use_container_width=True):
            st.session_state.comparison_mode = 'three_way'
            st.rerun()

    # Display current mode
    if st.session_state.comparison_mode == 'three_way':
        st.info("📊 Three-Way Comparison Mode Active")
    else:
        st.success("📊 Two-Way Comparison Mode Active")

    st.markdown("---")

    # File upload section
    st.markdown("### Upload Documents")

    if st.session_state.comparison_mode == 'two_way':
        # Two-way comparison
        col1, col2 = st.columns(2)

        with col1:
            st.markdown("#### Proposal A")
            pdf_a = st.file_uploader(
                "Upload Proposal A (PDF)",
                type=['pdf'],
                key="pdf_a",
                help="Upload the first proposal document"
            )

            if pdf_a:
                try:
                    pdf_info = get_pdf_info(pdf_a)
                    st.success(f"✅ {pdf_info['file_name']}")
                    st.caption(f"Pages: {pdf_info['page_count']} | Size: {pdf_info['file_size'] / 1024:.1f} KB")

                    # Extract text
                    if st.session_state.pdf_a_text is None or st.button("Re-extract Text A", key="reextract_a"):
                        with st.spinner("Extracting text from Proposal A..."):
                            st.session_state.pdf_a_text = extract_text_from_pdf(pdf_a)
                            st.success(f"Extracted {len(st.session_state.pdf_a_text)} characters")
                except Exception as e:
                    st.error(f"Error processing Proposal A: {str(e)}")

        with col2:
            st.markdown("#### Proposal B")
            pdf_b = st.file_uploader(
                "Upload Proposal B (PDF)",
                type=['pdf'],
                key="pdf_b",
                help="Upload the second proposal document"
            )

            if pdf_b:
                try:
                    pdf_info = get_pdf_info(pdf_b)
                    st.success(f"✅ {pdf_info['file_name']}")
                    st.caption(f"Pages: {pdf_info['page_count']} | Size: {pdf_info['file_size'] / 1024:.1f} KB")

                    # Extract text
                    if st.session_state.pdf_b_text is None or st.button("Re-extract Text B", key="reextract_b"):
                        with st.spinner("Extracting text from Proposal B..."):
                            st.session_state.pdf_b_text = extract_text_from_pdf(pdf_b)
                            st.success(f"Extracted {len(st.session_state.pdf_b_text)} characters")
                except Exception as e:
                    st.error(f"Error processing Proposal B: {str(e)}")

    else:
        # Three-way comparison
        col1, col2, col3 = st.columns(3)

        with col1:
            st.markdown("#### Proposal A")
            pdf_a = st.file_uploader(
                "Upload Proposal A (PDF)",
                type=['pdf'],
                key="pdf_a_3way",
                help="Upload the first proposal document"
            )

            if pdf_a:
                try:
                    pdf_info = get_pdf_info(pdf_a)
                    st.success(f"✅ {pdf_info['file_name']}")
                    st.caption(f"Pages: {pdf_info['page_count']} | Size: {pdf_info['file_size'] / 1024:.1f} KB")

                    # Extract text
                    if st.session_state.pdf_a_text is None or st.button("Re-extract Text A", key="reextract_a_3way"):
                        with st.spinner("Extracting text..."):
                            st.session_state.pdf_a_text = extract_text_from_pdf(pdf_a)
                            st.success(f"Extracted {len(st.session_state.pdf_a_text)} characters")
                except Exception as e:
                    st.error(f"Error: {str(e)}")

        with col2:
            st.markdown("#### Proposal B")
            pdf_b = st.file_uploader(
                "Upload Proposal B (PDF)",
                type=['pdf'],
                key="pdf_b_3way",
                help="Upload the second proposal document"
            )

            if pdf_b:
                try:
                    pdf_info = get_pdf_info(pdf_b)
                    st.success(f"✅ {pdf_info['file_name']}")
                    st.caption(f"Pages: {pdf_info['page_count']} | Size: {pdf_info['file_size'] / 1024:.1f} KB")

                    # Extract text
                    if st.session_state.pdf_b_text is None or st.button("Re-extract Text B", key="reextract_b_3way"):
                        with st.spinner("Extracting text..."):
                            st.session_state.pdf_b_text = extract_text_from_pdf(pdf_b)
                            st.success(f"Extracted {len(st.session_state.pdf_b_text)} characters")
                except Exception as e:
                    st.error(f"Error: {str(e)}")

        with col3:
            st.markdown("#### Proposal C")
            pdf_c = st.file_uploader(
                "Upload Proposal C (PDF)",
                type=['pdf'],
                key="pdf_c_3way",
                help="Upload the third proposal document"
            )

            if pdf_c:
                try:
                    pdf_info = get_pdf_info(pdf_c)
                    st.success(f"✅ {pdf_info['file_name']}")
                    st.caption(f"Pages: {pdf_info['page_count']} | Size: {pdf_info['file_size'] / 1024:.1f} KB")

                    # Extract text
                    if st.session_state.pdf_c_text is None or st.button("Re-extract Text C", key="reextract_c_3way"):
                        with st.spinner("Extracting text..."):
                            st.session_state.pdf_c_text = extract_text_from_pdf(pdf_c)
                            st.success(f"Extracted {len(st.session_state.pdf_c_text)} characters")
                except Exception as e:
                    st.error(f"Error: {str(e)}")

    st.markdown("---")

    # Analysis section
    st.markdown("### Run Analysis")

    # Check if we have the required documents
    can_analyze = False
    if st.session_state.comparison_mode == 'two_way':
        can_analyze = (st.session_state.pdf_a_text is not None and
                      st.session_state.pdf_b_text is not None and
                      st.session_state.selected_model is not None)
    else:
        can_analyze = (st.session_state.pdf_a_text is not None and
                      st.session_state.pdf_b_text is not None and
                      st.session_state.pdf_c_text is not None and
                      st.session_state.selected_model is not None)

    if not can_analyze:
        missing_items = []
        if st.session_state.pdf_a_text is None:
            missing_items.append("Proposal A")
        if st.session_state.pdf_b_text is None:
            missing_items.append("Proposal B")
        if st.session_state.comparison_mode == 'three_way' and st.session_state.pdf_c_text is None:
            missing_items.append("Proposal C")
        if st.session_state.selected_model is None:
            missing_items.append("LM Studio connection")

        st.warning(f"⚠️ Please upload {', '.join(missing_items)} to run analysis")

    if st.button("🚀 Run Comparison Analysis", disabled=not can_analyze, use_container_width=True):
        # Create the prompt
        prompt = create_comparison_prompt(
            st.session_state.pdf_a_text,
            st.session_state.pdf_b_text,
            st.session_state.pdf_c_text if st.session_state.comparison_mode == 'three_way' else None,
            st.session_state.custom_instructions or ""
        )

        # Run analysis
        st.markdown("### Analysis Results")
        st.info("🤖 AI analysis in progress... This may take several minutes.")

        # Create placeholder for streaming results
        result_placeholder = st.empty()
        full_response = ""

        try:
            lm_client = LMStudioClient()

            with st.spinner("Analyzing documents..."):
                for chunk in lm_client.analyze_documents(prompt, st.session_state.selected_model, stream=True):
                    full_response += chunk
                    result_placeholder.markdown(full_response)

            # Display final result
            st.success("✅ Analysis complete!")

            # Provide download button for HTML report
            if "<html" in full_response.lower() or "<!doctype" in full_response.lower():
                st.download_button(
                    label="📥 Download HTML Report",
                    data=full_response,
                    file_name="comparison_report.html",
                    mime="text/html",
                    use_container_width=True
                )
            else:
                st.download_button(
                    label="📥 Download Report",
                    data=full_response,
                    file_name="comparison_report.txt",
                    mime="text/plain",
                    use_container_width=True
                )

        except Exception as e:
            st.error(f"❌ Error during analysis: {str(e)}")

    # Reset button
    if st.button("🔄 Reset All", use_container_width=True):
        st.session_state.pdf_a_text = None
        st.session_state.pdf_b_text = None
        st.session_state.pdf_c_text = None
        st.rerun()
