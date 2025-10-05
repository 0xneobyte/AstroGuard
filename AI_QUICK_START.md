# 🚀 AI Chatbot Quick Start

## Setup (Windows)

```bash
# 1. Run the setup script
setup-ai.bat

# 2. Enter your OpenAI API key when prompted
# Get it from: https://platform.openai.com/api-keys

# 3. Install the library
cd backend
pip install openai

# 4. Start the backend
python main.py
```

## Or Manual Setup

```bash
# 1. Edit backend/.env and add:
OPENAI_API_KEY=sk-your-key-here

# 2. Install library
pip install openai

# 3. Done!
```

## How to Use

1. **Select an asteroid** in ASTROGUARD
2. **Purple AI button appears** (bottom-right)
3. **Click it** to open chat
4. **AI auto-summarizes** the threat
5. **Ask questions!**

## Example Questions

```
💥 "What would happen if this hit New York?"
⚠️ "How dangerous is this asteroid?"
🛡️ "What's the best deflection strategy?"
🔬 "Explain the physics of crater formation"
📊 "Compare this to the Tunguska event"
🎯 "Show me the damage zones"
```

## Features

✅ Auto-summary of threats  
✅ Context-aware AI (knows your data)  
✅ Conversation memory  
✅ Scientific accuracy  
✅ Beautiful UI with animations  
✅ Cost-effective (GPT-4o-mini)  

## Cost

- **Summary**: ~$0.001 each
- **Chat message**: ~$0.0005 each
- **Typical session**: ~$0.01 (very cheap!)

## Files Added

```
frontend/src/components/
  ├── AIChatbot.jsx       (React component)
  └── AIChatbot.css       (Styling)

backend/
  ├── main.py             (Added /api/ai/* endpoints)
  └── requirements.txt    (Added openai)

docs/
  ├── AI_CHATBOT_README.md      (Full docs)
  ├── AI_VISUAL_GUIDE.md        (Visual examples)
  └── AI_IMPLEMENTATION.md      (Technical details)
```

## Troubleshooting

**"OpenAI API key not configured"**
→ Add `OPENAI_API_KEY=sk-...` to `backend/.env`

**"openai library not installed"**
→ Run `pip install openai` in backend folder

**No AI button appears**
→ Select an asteroid first!

**Slow responses**
→ Normal! GPT-4o-mini takes 1-3 seconds

## Support

- OpenAI Docs: https://platform.openai.com/docs
- Check API usage: https://platform.openai.com/usage
- Service status: https://status.openai.com

---

**That's it! You now have an AI asteroid analyst! 🌟**
