"""IFC Analysis page - Building Information Model analysis."""
import streamlit as st
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.ai_utils import LMStudioClient


def show():
    """Display the IFC Analysis page."""
    st.title("🏗️ IFC Analysis")
    st.markdown("Analyze Industry Foundation Classes (IFC) building information model specifications.")

    # Info box
    st.info("""
    📌 **IFC Analysis Tool**

    This tool analyzes IFC (Industry Foundation Classes) files used in building information modeling.
    Upload IFC files or text exports to analyze building specifications, materials, and structural data.
    """)

    # Initialize session state
    if 'ifc_text' not in st.session_state:
        st.session_state.ifc_text = None

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
            st.session_state.ifc_selected_model = selected_model
        else:
            st.error("⚠️ Cannot connect to LM Studio. Please ensure it's running on http://127.0.0.1:1234")
            st.info("💡 Start LM Studio and load a model, then refresh this page.")
            st.session_state.ifc_selected_model = None

        # Custom instructions
        custom_instructions = st.text_area(
            "Custom Analysis Instructions (Optional)",
            height=100,
            placeholder="Enter any specific instructions for the IFC analysis...",
            help="Add custom instructions to guide the AI analysis"
        )
        st.session_state.ifc_custom_instructions = custom_instructions

    st.markdown("---")

    # File upload section
    st.markdown("### Upload IFC Data")

    # Option to upload file or paste text
    input_method = st.radio(
        "Input Method",
        ["Upload File", "Paste Text"],
        horizontal=True
    )

    if input_method == "Upload File":
        ifc_file = st.file_uploader(
            "Upload IFC File or Text Export",
            type=['ifc', 'txt', 'xml'],
            help="Upload an IFC file or text export of IFC data"
        )

        if ifc_file:
            try:
                # Read file content
                file_content = ifc_file.read().decode('utf-8', errors='ignore')
                st.session_state.ifc_text = file_content

                st.success(f"✅ {ifc_file.name} loaded")
                st.caption(f"Size: {len(file_content)} characters")

                # Show preview
                with st.expander("📄 Preview IFC Data"):
                    st.text_area(
                        "IFC Content Preview",
                        value=file_content[:2000] + ("..." if len(file_content) > 2000 else ""),
                        height=200,
                        disabled=True
                    )
            except Exception as e:
                st.error(f"Error reading file: {str(e)}")
    else:
        ifc_text_input = st.text_area(
            "Paste IFC Data",
            height=300,
            placeholder="Paste your IFC data here...",
            help="Paste the text content of your IFC file"
        )

        if ifc_text_input:
            st.session_state.ifc_text = ifc_text_input
            st.success(f"✅ IFC data loaded ({len(ifc_text_input)} characters)")

    st.markdown("---")

    # Analysis section
    st.markdown("### Run IFC Analysis")

    # Analysis options
    analysis_type = st.selectbox(
        "Analysis Type",
        [
            "General Overview",
            "Material Analysis",
            "Structural Components",
            "Building Systems",
            "Custom Analysis"
        ],
        help="Select the type of analysis to perform"
    )

    # Check if we have the required data
    can_analyze = (st.session_state.ifc_text is not None and
                  st.session_state.ifc_selected_model is not None)

    if not can_analyze:
        missing_items = []
        if st.session_state.ifc_text is None:
            missing_items.append("IFC Data")
        if st.session_state.ifc_selected_model is None:
            missing_items.append("LM Studio connection")

        st.warning(f"⚠️ Please provide {', '.join(missing_items)} to run analysis")

    if st.button("🚀 Run IFC Analysis", disabled=not can_analyze, use_container_width=True):
        # Create the prompt based on analysis type
        analysis_prompts = {
            "General Overview": "Provide a comprehensive overview of this IFC building model, including key information about the structure, components, and systems.",
            "Material Analysis": "Analyze the materials specified in this IFC model. List all materials, their properties, and where they are used in the building.",
            "Structural Components": "Analyze the structural components in this IFC model. Identify beams, columns, walls, floors, and their specifications.",
            "Building Systems": "Analyze the building systems (HVAC, electrical, plumbing, etc.) defined in this IFC model.",
            "Custom Analysis": st.session_state.ifc_custom_instructions or "Analyze this IFC model and provide insights."
        }

        prompt = f"""{analysis_prompts[analysis_type]}

IFC DATA:
{st.session_state.ifc_text}

Please provide a detailed analysis in a clear, structured format."""

        # Run analysis
        st.markdown("### IFC Analysis Results")
        st.info("🤖 AI analysis in progress...")

        # Create placeholder for streaming results
        result_placeholder = st.empty()
        full_response = ""

        try:
            lm_client = LMStudioClient()

            with st.spinner("Analyzing IFC data..."):
                for chunk in lm_client.analyze_documents(prompt, st.session_state.ifc_selected_model, stream=True):
                    full_response += chunk
                    result_placeholder.markdown(full_response)

            # Display final result
            st.success("✅ IFC analysis complete!")

            # Download button
            st.download_button(
                label="📥 Download Analysis Report",
                data=full_response,
                file_name="ifc_analysis_report.txt",
                mime="text/plain",
                use_container_width=True
            )

        except Exception as e:
            st.error(f"❌ Error during analysis: {str(e)}")

    # Reset button
    if st.button("🔄 Reset", use_container_width=True):
        st.session_state.ifc_text = None
        st.rerun()
