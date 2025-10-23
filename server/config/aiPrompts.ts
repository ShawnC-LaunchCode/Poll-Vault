/**
 * AI Prompts Configuration
 *
 * This file contains all prompts used for AI-powered analytics.
 * Developers can easily edit these prompts to customize AI behavior.
 */

/**
 * Survey Analysis Prompt
 *
 * This prompt is sent to Gemini AI along with survey questions and all responses.
 * The AI analyzes the data and provides insights.
 *
 * Available variables:
 * - {surveyTitle}: The title of the survey
 * - {surveyDescription}: The description of the survey
 * - {questionCount}: Number of questions
 * - {responseCount}: Number of responses
 * - {anonymousCount}: Number of anonymous responses
 *
 * Developer Tips:
 * - Be specific about what insights you want
 * - Request structured output (bullet points, sections, etc.)
 * - Ask for actionable recommendations
 * - Request specific metrics or patterns to identify
 */
export const SURVEY_ANALYSIS_PROMPT = `You are an expert data analyst specializing in survey research and qualitative data analysis.

I'm providing you with survey data that includes questions and all responses (both authenticated and anonymous).

**Survey Information:**
- Title: {surveyTitle}
- Description: {surveyDescription}
- Total Questions: {questionCount}
- Total Responses: {responseCount}
- Anonymous Responses: {anonymousCount}

**Your Task:**
Analyze this survey data and provide comprehensive, actionable insights. Focus on:

1. **Key Findings & Themes**
   - What are the most significant patterns in the responses?
   - Are there any surprising or unexpected results?
   - What themes emerge from text responses?

2. **Sentiment Analysis**
   - What is the overall sentiment (positive, negative, neutral)?
   - Are there specific questions that show strong sentiment patterns?
   - Any concerning negative feedback that requires attention?

3. **Response Quality**
   - Are responses thoughtful and detailed, or rushed/minimal?
   - Any indicators of response quality issues?
   - Consistency across questions?

4. **Demographics & Segmentation** (if applicable)
   - Any notable patterns in how different groups responded?
   - Correlations between different question responses?

5. **Actionable Recommendations**
   - What should the survey creator do based on this data?
   - Priority items that need immediate attention
   - Long-term strategic recommendations

6. **Statistical Highlights**
   - Most popular choices in multiple-choice questions
   - Common words/phrases in text responses
   - Response distribution patterns

**Output Format:**
Please structure your response with clear headings and bullet points. Be specific and reference actual data from the survey. Keep insights concise but meaningful.

---

**Survey Data:**`;

/**
 * Question-Specific Analysis Prompt
 *
 * Use this for analyzing individual questions in detail.
 */
export const QUESTION_ANALYSIS_PROMPT = `Analyze this specific survey question and its responses in detail:

**Question:** {questionTitle}
**Type:** {questionType}
**Total Responses:** {responseCount}

Provide:
1. Key insights from responses
2. Notable patterns or outliers
3. Sentiment if applicable
4. Recommendations for the survey creator

Keep your analysis concise (3-5 bullet points).

**Responses:**`;

/**
 * Text Response Summarization Prompt
 *
 * Use this for summarizing many text responses.
 */
export const TEXT_SUMMARIZATION_PROMPT = `Summarize the following text responses to the question: "{questionTitle}"

Extract:
1. Main themes (3-5 themes)
2. Common pain points or praise
3. Unexpected insights
4. Notable quotes

**Responses:**`;

/**
 * Sentiment Analysis Prompt
 *
 * Quick sentiment classification for text responses.
 */
export const SENTIMENT_ANALYSIS_PROMPT = `Classify the sentiment of these responses as: Positive, Negative, Neutral, or Mixed.

Also provide a confidence score (0-100%) and brief reasoning.

**Responses:**`;

/**
 * Helper function to replace variables in prompts
 */
export function fillPromptVariables(
  prompt: string,
  variables: Record<string, string | number>
): string {
  let filledPrompt = prompt;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    filledPrompt = filledPrompt.replace(new RegExp(placeholder, 'g'), String(value));
  }

  return filledPrompt;
}
