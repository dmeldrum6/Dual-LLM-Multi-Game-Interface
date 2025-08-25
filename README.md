# Dual LLM Multi-Game Interface

A sophisticated web-based platform that enables two Large Language Models to engage in strategic games, creative writing, and structured debates. Watch AI models compete in chess, checkers, and Othello, or collaborate on creative storytelling projects.

<img width="918" height="892" alt="image" src="https://github.com/user-attachments/assets/d619b5ad-854e-40ab-9964-0a8e5628660f" />
<img width="925" height="872" alt="image" src="https://github.com/user-attachments/assets/c56ee778-8fa7-4844-9f24-2b06d5574a72" />

## 🎮 Game Modes

### Strategic Games
- **♟️ Chess** - Full algebraic notation support with move validation
- **🔴 Checkers** - Complete rule implementation including king promotion
- **⚫ Othello/Reversi** - Dynamic disc flipping with visual feedback

### Creative & Discussion
- **📖 Collaborative Story Writing** - Genre-based creative writing with customizable parameters
- **💬 Structured Debates** - Topic-driven conversations and discussions

## ✨ Features

- **🔄 Real-time Game Visualization** - Interactive boards with animations and move highlighting
- **🤖 Universal LLM Support** - Compatible with OpenAI, Anthropic, and OpenAI-compatible APIs
- **📊 Comprehensive Analytics** - Move history, statistics, and performance tracking
- **🎨 Dark/Light Theme** - Responsive design with theme switching
- **📁 Export Functionality** - JSON export of complete game sessions for analysis
- **⚠️ Enhanced Error Handling** - Intelligent move validation with contextual feedback
- **📱 Mobile Responsive** - Works seamlessly across devices

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
- **Checkers**: Move format and capture rules
- **Othello**: Flanking strategy and disc placement
- **Story**: Genre-specific creative writing guidance
- **Debate**: Structured argumentation and evidence-based discussion

## 🎲 Game Rules & Formats

### Chess
- Standard algebraic notation (e4, Nf3, O-O, etc.)
- Full board position tracking with FEN notation
- Move validation with detailed error feedback

### Checkers
- Coordinate notation (A1-B2 for moves, A1xC3 for captures)
- Mandatory captures and king promotion
- 8x8 board with traditional starting position

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

## 🔧 Advanced Features

### Enhanced Chess Error Handling
```javascript
// Provides detailed context for invalid moves
contextMessage += `
❌ INVALID MOVE DETECTED
Your previous move: "${invalidMove}"
Problem: ${reason}
Complete game history: ${moveHistory}
Current position: ${detailedBoardState}
`;
```

### Intelligent Move Validation
- Context-aware error messages
- Board state visualization for LLMs
- Retry logic with enhanced prompting
- Move format suggestions

### Visual Feedback System
- Animated piece movements
- Highlighted valid moves
- Last move indicators
- Win/loss animations

## 🛠️ Development

### Architecture
- **Single HTML File** - Self-contained with embedded CSS/JavaScript
- **Modular Game Logic** - Easy to extend with new games
- **API Abstraction** - Universal LLM interface
- **Event-Driven** - Responsive real-time updates

### Adding New Games
1. Create game initialization function
2. Implement move validation logic
3. Add rendering and UI components
4. Configure LLM system prompts
5. Update mode selector

### Customization
- **Themes**: Modify CSS custom properties
- **Game Rules**: Adjust validation functions
- **UI Layout**: Responsive grid system
- **Prompts**: Fine-tune for different models

## 📚 Research Applications

### AI Model Comparison
- **Strategic Reasoning**: Compare chess/checkers performance
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
