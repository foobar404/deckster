# FlashCards App

A modern, mobile-first flashcard application built with React and Vite. Features Tinder-style swiping for card reviews, deck management, import functionality, and comprehensive statistics tracking.

## Features

### 🃏 Smart Card Review
- **Tinder-style swiping** for intuitive card interaction
- **Four difficulty levels**: Again, Hard, Good, Easy
- **Progress tracking** with visual progress bars
- **Session completion** with accuracy statistics

### 📂 Deck Management
- Create and manage multiple flashcard decks
- Visual progress indicators for each deck
- Easy deck selection and deletion
- Card count and mastery tracking

### 📥 Import Functionality
- Import cards from **CSV** (comma-separated) files
- Import cards from **TSV** (tab-separated) files
- **Preview cards** before importing
- Batch import with validation

### 📊 Comprehensive Statistics
- Overall review statistics and accuracy
- Current streak tracking
- Per-deck progress visualization
- Performance breakdown charts

### 🎨 Modern UI Design
- **Mobile-first responsive design**
- **Glass morphism** effects with blur and transparency
- **Rounded corners** and smooth animations
- **Dark theme** with vibrant color accents
- **Touch-optimized** controls and gestures

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd flashcards
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

### Creating Your First Deck
1. Navigate to the **Decks** tab
2. Click **New Deck**
3. Enter a deck name and click **Create**

### Adding Cards
1. Go to the **Import** tab
2. Choose your separator type (comma or tab)
3. Paste your card data in the format: `front,back` or `front\tback`
4. Preview your cards and import them to a deck

### Reviewing Cards
1. Select a deck from the **Decks** tab
2. Cards will appear in the **Review** tab
3. Tap to flip cards and see the answer
4. Swipe or tap difficulty buttons:
   - **Left/Down**: Again (Red) or Hard (Orange)
   - **Right/Up**: Good (Green) or Easy (Blue)

### Tracking Progress
- Visit the **Stats** tab to see your learning progress
- View overall statistics and per-deck progress
- Monitor your accuracy and current streak

## Import Format Examples

### CSV Format (Comma-separated)
```
Hello,Hola
Thank you,Gracias
Please,Por favor
Goodbye,Adiós
```

### TSV Format (Tab-separated)
```
Hello	Hola
Thank you	Gracias
Please	Por favor
Goodbye	Adiós
```

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool and development server
- **CSS3** - Modern styling with custom properties
- **JavaScript ES6+** - Modern JavaScript features

## Browser Support

- Chrome/Chromium 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m "Add feature"`
4. Push to the branch: `git push origin feature-name`
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
