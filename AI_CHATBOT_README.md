# AI Chatbot Feature

## Overview
The AI Chatbot provides intelligent analysis and answers questions about asteroid threats, impact simulations, and planetary defense strategies using OpenAI's GPT-4o-mini model.

## Features

### 🤖 Smart Assistant
- **Automatic Summary**: When you select an asteroid or simulate an impact, the AI automatically generates a comprehensive threat assessment
- **Context-Aware**: The AI has access to all current asteroid data, impact simulations, and orbital information
- **Interactive Q&A**: Ask any questions about:
  - Asteroid characteristics and orbital mechanics
  - Impact effects and consequences
  - Mitigation strategies and deflection methods
  - Comparison between different scenarios

### 💬 Chat Interface
- **Floating Button**: Appears when asteroid or impact data is available
- **Suggested Questions**: Quick-start prompts for common queries
- **Conversation History**: Maintains context across multiple questions
- **Real-time Responses**: Streaming responses from GPT-4o-mini

## Setup Instructions

### Backend Configuration

1. **Install OpenAI Library**
   ```bash
   cd backend
   pip install openai
   ```

2. **Configure API Key**
   
   Create a `.env` file in the `backend` directory (copy from `.env.example`):
   ```bash
   NASA_API_KEY=your_nasa_key
   NASA_BASE_URL=https://api.nasa.gov/neo/rest/v1
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

3. **Get OpenAI API Key**
   - Visit https://platform.openai.com/api-keys
   - Create a new API key
   - Add billing information (GPT-4o-mini is very cost-effective)
   - Copy the key to your `.env` file

### Cost Considerations

**GPT-4o-mini Pricing** (as of 2024):
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

**Estimated costs per conversation**:
- Summary generation: ~$0.001 per summary
- Chat message: ~$0.0005 per message
- Typical session (10 messages): ~$0.005-0.01

**Budget-friendly** for demo and testing purposes!

## API Endpoints

### POST `/api/ai/chat`
Generate conversational responses about asteroid data.

**Request Body:**
```json
{
  "message": "What would happen if this asteroid hit New York?",
  "context": {
    "asteroid": { ... },
    "impact": { ... },
    "location": { ... }
  },
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

**Response:**
```json
{
  "response": "Based on the simulation data, if this 500-meter asteroid..."
}
```

### POST `/api/ai/summary`
Generate automatic summary of current scenario.

**Request Body:**
```json
{
  "context": {
    "asteroid": { ... },
    "impact": { ... }
  }
}
```

**Response:**
```json
{
  "summary": "Threat Assessment: The asteroid 2024 XY...\n\nKey Characteristics:..."
}
```

## Usage Examples

### Example Questions to Ask:

1. **Threat Assessment**
   - "How dangerous is this asteroid?"
   - "What are the chances of impact?"
   - "Compare this to historical impacts like Tunguska or Chelyabinsk"

2. **Impact Analysis**
   - "What would happen if this hit a major city?"
   - "How far would the damage extend?"
   - "What would the casualties be?"

3. **Science Questions**
   - "Explain how crater size is calculated"
   - "Why does angle of impact matter?"
   - "How do seismic waves propagate from impact?"

4. **Mitigation Strategies**
   - "Which deflection method would work best?"
   - "How much warning time do we need?"
   - "Explain how the kinetic impactor works"

## Technical Details

### AI System Prompt
The AI is configured with expertise in:
- Asteroid physics and orbital mechanics
- Impact cratering and blast effects
- Planetary defense strategies
- NASA's asteroid catalog and classifications
- Historical impact events

### Context Injection
The system automatically provides the AI with:
- Current asteroid parameters (size, velocity, composition)
- Orbital data (semi-major axis, eccentricity, inclination)
- Impact simulation results (energy, crater size, damage radii)
- Geographic coordinates of impact location
- Comparison data for threat assessment

### Safety Features
- Rate limiting to prevent API abuse
- Error handling for API failures
- Fallback responses when OpenAI is unavailable
- Token limits to control costs (500 tokens per response)

## Troubleshooting

### "OpenAI API key not configured" Error
- Ensure `.env` file exists in backend directory
- Verify `OPENAI_API_KEY` is set correctly
- Restart the backend server after adding the key

### "OpenAI library not installed" Error
- Run `pip install openai` in the backend directory
- Check that requirements.txt includes `openai`

### Slow Responses
- GPT-4o-mini typically responds in 1-3 seconds
- Check your internet connection
- Verify OpenAI service status: https://status.openai.com

### High Costs
- GPT-4o-mini is very cost-effective
- Set usage limits in OpenAI dashboard
- Monitor usage at https://platform.openai.com/usage

## Future Enhancements

Potential improvements:
- [ ] Voice input/output
- [ ] Multi-language support
- [ ] Image generation for impact visualizations
- [ ] Historical comparison charts
- [ ] Export conversation as PDF report
- [ ] Integration with NASA's Sentry risk table
- [ ] Real-time news about asteroid discoveries

## Credits

- **AI Model**: OpenAI GPT-4o-mini
- **Integration**: Custom FastAPI endpoints
- **UI Design**: Custom React components with Lucide icons
