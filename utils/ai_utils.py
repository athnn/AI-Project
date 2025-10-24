"""AI integration utilities for LM Studio API."""
import requests
import json
import streamlit as st


class LMStudioClient:
    """Client for interacting with LM Studio API."""

    def __init__(self, base_url="http://127.0.0.1:1234/v1"):
        """Initialize the LM Studio client."""
        self.base_url = base_url
        self.models_endpoint = f"{base_url}/models"
        self.chat_endpoint = f"{base_url}/chat/completions"

    def get_available_models(self):
        """
        Get list of available models from LM Studio.

        Returns:
            list: List of available model IDs
        """
        try:
            response = requests.get(self.models_endpoint, timeout=5)
            response.raise_for_status()
            models_data = response.json()
            return [model["id"] for model in models_data.get("data", [])]
        except requests.exceptions.RequestException as e:
            st.error(f"Error connecting to LM Studio: {str(e)}")
            return []

    def analyze_documents(self, prompt, model_id=None, stream=True):
        """
        Send a prompt to LM Studio for analysis.

        Args:
            prompt: The prompt to send
            model_id: The model ID to use (optional)
            stream: Whether to stream the response

        Yields:
            str: Response chunks if streaming, full response otherwise
        """
        try:
            payload = {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert technical document analyst specializing in proposal comparisons and compliance checking."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.7,
                "max_tokens": -1,
                "stream": stream
            }

            if model_id:
                payload["model"] = model_id

            response = requests.post(
                self.chat_endpoint,
                json=payload,
                stream=stream,
                timeout=300
            )
            response.raise_for_status()

            if stream:
                for line in response.iter_lines():
                    if line:
                        line_text = line.decode('utf-8')
                        if line_text.startswith('data: '):
                            data_text = line_text[6:]
                            if data_text.strip() == '[DONE]':
                                break
                            try:
                                data = json.loads(data_text)
                                if 'choices' in data and len(data['choices']) > 0:
                                    delta = data['choices'][0].get('delta', {})
                                    content = delta.get('content', '')
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue
            else:
                data = response.json()
                if 'choices' in data and len(data['choices']) > 0:
                    return data['choices'][0]['message']['content']
                return ""

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error communicating with LM Studio: {str(e)}")


def create_comparison_prompt(doc_a_text, doc_b_text, doc_c_text=None, custom_instructions=""):
    """
    Create a prompt for document comparison.

    Args:
        doc_a_text: Text from document A
        doc_b_text: Text from document B
        doc_c_text: Text from document C (optional, for 3-way comparison)
        custom_instructions: Custom analysis instructions

    Returns:
        str: Formatted prompt for AI analysis
    """
    if doc_c_text:
        # Three-way comparison
        prompt = f"""Please perform a detailed three-way comparison between the following proposals:

PROPOSAL A:
{doc_a_text}

PROPOSAL B:
{doc_b_text}

PROPOSAL C:
{doc_c_text}

{custom_instructions if custom_instructions else ''}

Please analyze these three proposals and identify:
1. Key similarities and differences across all three proposals
2. Strengths and weaknesses of each proposal
3. Areas where proposals align or diverge
4. Critical discrepancies or gaps in any proposal
5. Recommendations based on the comparison

Generate a comprehensive HTML report with detailed comparison tables."""
    else:
        # Two-way comparison
        prompt = f"""Please perform a detailed comparison between the following two proposals:

PROPOSAL A:
{doc_a_text}

PROPOSAL B:
{doc_b_text}

{custom_instructions if custom_instructions else ''}

Please analyze these proposals and identify:
1. Key similarities and differences
2. Strengths and weaknesses of each proposal
3. Areas of alignment and divergence
4. Critical discrepancies or gaps
5. Recommendations based on the comparison

Generate a comprehensive HTML report with detailed comparison tables."""

    return prompt


def create_spec_comparison_prompt(spec_text, proposal_text, custom_instructions=""):
    """
    Create a prompt for spec vs proposal comparison.

    Args:
        spec_text: Text from specification document
        proposal_text: Text from proposal document
        custom_instructions: Custom analysis instructions

    Returns:
        str: Formatted prompt for AI analysis
    """
    # Read the detailed analysis instructions
    try:
        with open('/home/user/AI-Project/Prompt MATT.txt', 'r') as f:
            analysis_template = f.read()
    except:
        analysis_template = ""

    prompt = f"""{analysis_template}

SPECIFICATION Document (SPEC):
{spec_text}

PROPOSAL Document:
{proposal_text}

{custom_instructions if custom_instructions else ''}

Please generate a complete HTML report following the exact template and format specified in the instructions above."""

    return prompt
