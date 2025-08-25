# Dual LLM Multi-Game Interface

A web-based platform that enables two Large Language Models to engage in strategic games, creative writing, and structured debates. Watch AI models compete in chess and Othello, or collaborate on creative storytelling projects.

<img width="937" height="471" alt="image" src="https://github.com/user-attachments/assets/ef2861b8-a05e-49a7-abd6-cef4cf6f0a5b" />
<img width="926" height="686" alt="image" src="https://github.com/user-attachments/assets/3642507c-0782-4493-891b-de1b0a341758" />
<img width="941" height="902" alt="image" src="https://github.com/user-attachments/assets/04e97588-af28-4691-b096-63a5fd309d9d" />
<img width="917" height="897" alt="image" src="https://github.com/user-attachments/assets/698b9339-a47e-489e-a395-89b906b69254" />

## 🎮 Game Modes

### Strategic Games
- **♟️ Chess** - Full algebraic notation support with move validation
- **⚫ Othello/Reversi** - Dynamic disc flipping with visual feedback

### Creative & Discussion
- **💬 Structured Debates** - Topic-driven conversations and discussions
- **📖 Collaborative Story Writing** - Genre-based creative writing with customizable parameters

## ✨ Features

- **🔄 Real-time Game Visualization** - Interactive boards with animations and move highlighting
- **🤖 Universal LLM Support** - Compatible with OpenAI, Anthropic, and OpenAI-compatible APIs
- **📊 Comprehensive Analytics** - Move history, statistics, and performance tracking
- **🎨 Dark/Light Theme** - Responsive design with theme switching
- **📁 Export Functionality** - JSON export of complete game sessions for analysis
- **⚠️ Enhanced Error Handling** - Intelligent move validation with contextual feedback

## 🚀 Quick Start

### Prerequisites
- Web browser with JavaScript enabled
- API keys for your preferred LLM services (OpenAI, Anthropic, etc.)

### Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dual-llm-games.git
   cd dual-llm-games
   ```

2. **Open in browser**
   ```bash
   # Serve locally (recommended)
   python -m http.server 8000
   # OR simply open dual_llm_chat.html in your browser
   ```

3. **Configure LLM APIs**
   - Enter your API endpoints and keys in the configuration section
   - Select your preferred models
   - Customize system prompts for each LLM

4. **Start Playing!**
   - Choose a game mode
   - Click "Start Game" and watch the AIs compete

## 🎯 Configuration

### Supported API Formats
- **OpenAI API** (GPT-3.5, GPT-4, etc.)
- **Anthropic Claude** (via OpenAI-compatible endpoints)
- **Local Models** (Ollama, LM Studio, etc.)
- **Custom Endpoints** (Any OpenAI-compatible API)

### System Prompts
Each game mode includes optimized system prompts:
- **Chess**: Strategic notation and position analysis
- **Othello**: Flanking strategy and disc placement
- **Story**: Genre-specific creative writing guidance
- **Debate**: Structured argumentation and evidence-based discussion

## 🎲 Game Rules & Formats

### Chess
- Standard algebraic notation (e4, Nf3, O-O, etc.)
- Full board position tracking with FEN notation
- Move validation with detailed error feedback

### Othello
- Coordinate moves (A1, B2, etc.) or "pass"
- Automatic disc flipping with visual animations
- Valid move highlighting and game end detection

### Story Writing
- Configurable sentence limits (1-5 sentences per turn)
- Genre selection (Mystery, Fantasy, Sci-Fi, Romance, Horror, Comedy, Adventure)
- Word and sentence count tracking

## 📊 Analytics & Export

### Real-time Statistics
- Move/turn counters
- Game duration tracking
- Piece/score counts
- Current player indicators

### Export Formats
All sessions can be exported as JSON with:
- Complete move/conversation history
- Game metadata and timestamps
- Final board positions
- Performance statistics
- Model configuration details

## 📚 Research Applications

### AI Model Comparison
- **Strategic Reasoning**: Compare chess/Othello performance
- **Creative Ability**: Analyze story quality and coherence
- **Rule Following**: Measure move format compliance
- **Adaptability**: Test response to invalid moves

### Use Cases
- **Educational**: Demonstrate AI capabilities
- **Research**: Model evaluation and comparison
- **Entertainment**: Watch AIs compete and create
- **Development**: Test and debug LLM integrations

## 🐛 Troubleshooting

### Common Issues
1. **API Errors**: Verify endpoints and authentication
2. **Invalid Moves**: Check model understanding of game rules
3. **CORS Issues**: Serve from localhost or enable CORS
4. **Performance**: Some models may need longer timeouts

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Star ⭐ this repository if you find it useful!**
