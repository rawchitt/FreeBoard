# FreeBoard - Digital Canvas Application

A beautiful, feature-rich free-form digital board where you can create and organize pins and lists on an infinite canvas.

![FreeBoard](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Features

### Core Features
- **Blank Canvas Interface** - Start with an empty canvas ready for your ideas
- **Multiple Pin Types**
  - Text pins for notes and ideas
  - Image pins with drag-and-drop upload
  - List pins with checkboxes for tasks
- **Drag and Drop** - Freely position pins anywhere on the canvas
- **Resizable Pins** - Adjust pin sizes to fit your content

### Advanced Features
- **Zoom & Pan** - Navigate large boards with ease
  - Mouse wheel zoom
  - Click and drag to pan
  - Zoom controls in toolbar
  - Keyboard shortcuts (+, -, 0)
  
- **Undo/Redo** - Full history management
  - Undo/redo for all actions (create, move, edit, delete)
  - Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  - Up to 50 history states
  
- **Persistence** - Your work is automatically saved
  - All pins and layouts persist across sessions
  - LocalStorage-based persistence
  - No data loss on browser close
  
- **Snapshots** - Save and restore board states
  - Create named snapshots
  - Restore previous snapshots
  - Delete unwanted snapshots
  
- **Tagging System** - Organize pins with tags
  - Add multiple tags to pins
  - Filter pins by tag
  - Tag-based organization
  
- **Premium UI/UX**
  - Modern dark theme with glassmorphism
  - Smooth animations and transitions
  - Responsive design
  - Keyboard shortcuts for efficiency

## 🚀 How to Run

### Option 1: Simple HTTP Server (Recommended)

1. **Using Python** (if installed):
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```

2. **Using Node.js** (if installed):
   ```bash
   npx http-server -p 8000
   ```

3. **Using PHP** (if installed):
   ```bash
   php -S localhost:8000
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

### Option 2: Direct File Access

Simply open `index.html` directly in your browser:
- Right-click on `index.html`
- Select "Open with" → Your preferred browser

**Note:** Some features may be limited when opening directly due to browser security restrictions.

## 📖 User Guide

### Getting Started

1. **First Visit**: You'll see a welcome screen with tips
2. **Create Pins**: Use the toolbar buttons or keyboard shortcuts
   - `T` - Create text pin
   - `I` - Create image pin
   - `L` - Create list pin

### Working with Pins

#### Text Pins
- Click to select
- Type directly in the text area
- Drag from header to move
- Resize from bottom-right corner

#### Image Pins
- Click placeholder to upload image
- Supports all common image formats
- Maintains minimum size based on image dimensions
- Drag and resize like text pins

#### List Pins
- Add items with the "+ Add item" button
- Check/uncheck items to mark completion
- Delete items with the × button
- Completed items show strikethrough

### Navigation

- **Pan**: Click and drag on empty canvas
- **Zoom**: 
  - Mouse wheel to zoom in/out
  - `+` / `-` keys
  - Toolbar zoom controls
  - `0` to reset zoom

### Organization

#### Tags
- Click the `+` button in pin header
- Enter tag name
- Click tag to remove it
- Filter pins using tag panel (right side)

#### Snapshots
- **Save**: Click "Save" button, enter name
- **Load**: Click "Load" button, select snapshot
- **Delete**: In load dialog, click delete button

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `T` | Create text pin |
| `I` | Create image pin |
| `L` | Create list pin |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `+` or `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom |

## 🏗️ Architecture & Design Decisions

### State Management
- **Centralized State**: Single `BoardState` class manages all application state
- **Immutability**: State updates create new history entries
- **Persistence**: Automatic localStorage sync on every change
- **History Management**: Circular buffer with 50-state limit for memory efficiency

### Rendering Strategy
- **Selective Rendering**: Only re-render affected pins on updates
- **Event Delegation**: Efficient event handling for dynamic content
- **CSS Transforms**: Hardware-accelerated zoom/pan using CSS transforms
- **Lazy Loading**: Images loaded on-demand

### Performance Optimizations
- **Debounced Saves**: State saves batched to reduce localStorage writes
- **Transform Caching**: Canvas transforms cached and reused
- **Event Throttling**: Mouse move events processed efficiently
- **Minimal DOM Updates**: Only changed elements re-rendered

### Code Organization
```
├── index.html          # Main HTML structure
├── styles.css          # Design system & styles
├── app.js             # Application logic
│   ├── BoardState     # State management
│   ├── PinFactory     # Pin creation
│   ├── BoardRenderer  # Rendering logic
│   ├── CanvasController # Zoom/pan controls
│   └── ToolbarController # Toolbar interactions
└── README.md          # Documentation
```

### Design System
- **CSS Variables**: Centralized theming with HSL color system
- **Spacing Scale**: Consistent spacing using predefined tokens
- **Typography**: Inter font family for modern aesthetics
- **Color Palette**: Curated dark theme with purple accents
- **Animations**: Smooth transitions using cubic-bezier easing

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript features
- CSS Grid and Flexbox
- LocalStorage API
- FileReader API for images

## 🎨 Design Philosophy

### Visual Excellence
- **Dark Theme**: Reduces eye strain, modern aesthetic
- **Glassmorphism**: Backdrop blur effects for depth
- **Gradients**: Smooth color transitions for visual interest
- **Shadows**: Layered shadows for elevation
- **Glows**: Subtle glows on interactive elements

### User Experience
- **Intuitive**: Familiar patterns (drag-drop, right-click)
- **Responsive**: Immediate visual feedback
- **Forgiving**: Undo/redo for mistake recovery
- **Efficient**: Keyboard shortcuts for power users
- **Delightful**: Smooth animations and transitions

### Accessibility Considerations
- Semantic HTML structure
- Keyboard navigation support
- Clear visual hierarchy
- Sufficient color contrast
- Focus indicators on interactive elements

## 🔧 Technical Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with variables, grid, flexbox
- **Vanilla JavaScript**: No framework dependencies
- **LocalStorage**: Client-side persistence
- **FileReader API**: Image upload handling

## 📦 File Structure

```
Web_dev/
├── index.html      # Main application page
├── styles.css      # All styles and design system
├── app.js         # Complete application logic
└── README.md      # This file
```

## 🚢 Deployment

### Static Hosting Options

1. **GitHub Pages**
   ```bash
   # Push to GitHub repository
   # Enable GitHub Pages in repository settings
   # Your app will be at: https://username.github.io/repo-name
   ```

2. **Netlify**
   - Drag and drop the folder to Netlify
   - Or connect GitHub repository
   - Automatic deployments on push

3. **Vercel**
   ```bash
   npm i -g vercel
   vercel
   ```

4. **Surge**
   ```bash
   npm i -g surge
   surge
   ```

### Deployment Checklist
- ✅ All files in same directory
- ✅ No external dependencies
- ✅ Works with direct file access
- ✅ LocalStorage for persistence
- ✅ Responsive design
- ✅ Cross-browser compatible

## 🔮 Future Enhancements

Potential features for future versions:
- Real-time collaboration
- Cloud sync across devices
- Export to PDF/PNG
- Import/export JSON
- Custom themes
- Pin templates
- Search functionality
- Keyboard-only navigation mode
- Mobile touch gestures
- Drawing/sketching pins
- Link pins with connections
- Grid snapping option

## 📝 License

MIT License - feel free to use this project for any purpose.

## 🤝 Contributing

This is a demonstration project, but suggestions and improvements are welcome!

## 📧 Support

For issues or questions, please open an issue in the repository.

---

**Built with ❤️ using vanilla web technologies**
