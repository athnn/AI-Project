"""
Hunter Buildings AI Analysis Tool - Streamlit Version

Main application file with navigation and page routing.
"""
import streamlit as st
from pathlib import Path

# Configure page
st.set_page_config(
    page_title="Hunter Buildings AI Analysis",
    page_icon="🏗️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for Hunter Buildings branding
def load_custom_css():
    """Load custom CSS for Hunter Buildings brand colors."""
    st.markdown("""
        <style>
        /* Hunter Buildings Brand Colors */
        :root {
            --hunter-green: #38543C;
            --hunter-blue: #24344B;
            --alert-orange: #F26622;
        }

        /* Main header styling */
        .main-header {
            background: linear-gradient(135deg, var(--hunter-green) 0%, var(--hunter-blue) 100%);
            padding: 2rem;
            border-radius: 10px;
            color: white;
            margin-bottom: 2rem;
            text-align: center;
        }

        .main-header h1 {
            color: white !important;
            margin: 0;
            font-size: 2.5rem;
        }

        .main-header p {
            color: rgba(255, 255, 255, 0.9);
            margin: 0.5rem 0 0 0;
        }

        /* Sidebar styling */
        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, var(--hunter-green) 0%, var(--hunter-blue) 100%);
        }

        [data-testid="stSidebar"] .css-1d391kg {
            color: white;
        }

        /* Button styling */
        .stButton > button {
            background-color: var(--hunter-green);
            color: white;
            border: none;
            border-radius: 5px;
            padding: 0.5rem 1rem;
            font-weight: 600;
            transition: all 0.3s;
        }

        .stButton > button:hover {
            background-color: var(--alert-orange);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        /* File uploader styling */
        [data-testid="stFileUploader"] {
            border: 2px dashed var(--hunter-green);
            border-radius: 10px;
            padding: 1rem;
        }

        /* Success/Info boxes */
        .stSuccess {
            background-color: rgba(56, 84, 60, 0.1);
            border-left: 4px solid var(--hunter-green);
        }

        .stInfo {
            background-color: rgba(36, 52, 75, 0.1);
            border-left: 4px solid var(--hunter-blue);
        }

        /* Warning boxes */
        .stWarning {
            background-color: rgba(242, 102, 34, 0.1);
            border-left: 4px solid var(--alert-orange);
        }

        /* Tab styling */
        .stTabs [data-baseweb="tab-list"] {
            gap: 8px;
        }

        .stTabs [data-baseweb="tab"] {
            background-color: var(--hunter-green);
            color: white;
            border-radius: 5px 5px 0 0;
            padding: 0.5rem 1rem;
        }

        .stTabs [aria-selected="true"] {
            background-color: var(--alert-orange);
        }

        /* Expander styling */
        .streamlit-expanderHeader {
            background-color: rgba(56, 84, 60, 0.1);
            border-radius: 5px;
            font-weight: 600;
        }
        </style>
    """, unsafe_allow_html=True)

# Load custom CSS
load_custom_css()

# Display logo and header
def display_header():
    """Display the Hunter Buildings header."""
    logo_path = Path("/home/user/AI-Project/public/hunter_logo.png")

    if logo_path.exists():
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            st.image(str(logo_path), width=200)

    st.markdown("""
        <div class="main-header">
            <h1>Hunter Buildings AI Analysis Tool</h1>
            <p>Powered by LM Studio - Local AI Processing</p>
        </div>
    """, unsafe_allow_html=True)

# Display header
display_header()

# Sidebar navigation
st.sidebar.title("Navigation")
st.sidebar.markdown("---")

page = st.sidebar.radio(
    "Select Tool",
    ["PDF Comparison", "Spec Comparison", "IFC Analysis", "Contract Helper"],
    index=0
)

st.sidebar.markdown("---")
st.sidebar.markdown("### About")
st.sidebar.info("""
    This tool provides AI-powered analysis for:
    - PDF proposal comparisons
    - Specification compliance checking
    - IFC analysis
    - Contract document processing

    All processing is done locally using LM Studio.
""")

# Import and display the selected page
if page == "PDF Comparison":
    from pages import pdf_comparison
    pdf_comparison.show()
elif page == "Spec Comparison":
    from pages import spec_comparison
    spec_comparison.show()
elif page == "IFC Analysis":
    from pages import ifc_analysis
    ifc_analysis.show()
elif page == "Contract Helper":
    from pages import contract_helper
    contract_helper.show()
