# README

# Gantt Editor

A modern, interactive Gantt chart editor built with React, TypeScript, and SVG. Create, edit, and manage project timelines with an intuitive drag-and-drop interface.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 🎨 Visual Design
- **Material Design UI** with light/dark themes
- **10 Tailwind colors** for quick visual categorization
- **Smooth animations** and hover effects
- **Responsive zoom** (0.6x - 2.4x) for timeline scale
- **Dynamic row heights** that expand automatically when bars overlap

### 📊 Bar Management
- **Drag & drop** bars horizontally and vertically
- **Resize** bars by dragging edges
- **Smart layout** keeps bars readable even with multiple overlaps
- **Auto-numbering** (1-10) based on color when no custom label provided
- **Context menu** (right-click) for quick actions:
  - Delete, duplicate, edit label
  - Change color, toggle dashed/solid style
- **Snap-to-grid** at 1/3, 1/2, 2/3, and month boundaries

### 🔗 Dependencies
- **Visual connections** between bars with arrows
- **Shift+drag** from bar edges to create dependency links
- **Automatic routing** when bars move
- **Right-click** on connections to delete

### ⚡ Productivity
- **Undo/Redo** (Ctrl+Z / Ctrl+Y) with full history
- **Fullscreen mode** to maximize workspace
- **Save/Load** projects as JSON files
- **Keyboard shortcuts** for common actions

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/gantt-editor.git
cd gantt-editor

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:1420
```

### Building for Production

```bash
npm run build

# Output will be in dist/ directory
```

## Usage

### Creating Bars
1. **Click and drag** on the grid to create a new bar
2. Bar gets automatic label (1-10) based on selected color
3. Optionally enter custom label in sidebar before drawing
4. Choose color from 10-color palette
5. Toggle dashed style for different bar types

### Editing Bars
- **Move**: Click and drag bar body
- **Resize**: Drag left or right edge
- **Edit**: Right-click → Edit label
- **Delete**: Right-click → Delete or press Delete key
- **Duplicate**: Right-click → Duplicate

### Creating Connections
1. Hold **Shift** and click on bar edge (left or right)
2. Drag to target bar edge
3. Release to create arrow connection
4. Right-click on arrow to delete

### Zoom & Navigation
- Use **zoom slider** in toolbar
- **Mouse wheel** over timeline to zoom in/out
- Timeline scales horizontally while rows stay fixed height

### Saving & Loading
- **Save**: Click "Save" → exports JSON file
- **Load**: Click "Load" → import previously saved project
- Projects include bars, connections, grid config, and theme

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Undo | `Ctrl + Z` |
| Redo | `Ctrl + Y` |
| Delete selected | `Delete` |
| Toggle theme | Click sun/moon icon |
| Fullscreen | Click expand icon |

## Architecture

### Tech Stack
- **React 19** with TypeScript
- **Vite** for blazing fast dev server and builds
- **Zustand** for state management
- **Immer** for immutable updates
- **SVG** for rendering (no canvas/WebGL)

### Key Concepts

#### Coordinate System
- **Model coordinates**: Bar positions stored independent of zoom
- **Render coordinates**: Visual X-position = `labelWidth + (modelX - labelWidth) × zoom`
- Only timeline scales horizontally, rows stay fixed

#### Layout Algorithm
Uses **interval graph coloring** to pack overlapping bars efficiently:
1. Group bars by row
2. Build overlap graph (bars are nodes, overlaps are edges)
3. Find connected components (BFS)
4. Greedily assign each bar to first available "slot"
5. Calculate row height: `max(baseHeight, numSlots × (barHeight + gap))`
6. Place longest bar in center slot for visual balance

#### State Management
```typescript
// Zustand store with Immer middleware
useGanttStore:
  - bars: GanttBar[]
  - connections: Connection[]
  - config: { years, rows, cellWidth, rowHeight, ... }
  - actions: addBar, moveBar, resizeBar, undo, redo, ...
```

## Project Structure

```
gantt-editor/
├── .ai/                    # Documentation and planning
│   ├── CHANGELOG.md       # Release history
│   ├── NEXT.md            # Future roadmap
│   └── README.md          # This file
├── src/
│   ├── components/
│   │   ├── GanttGrid.tsx  # Main grid component
│   │   ├── GanttBar.tsx   # Individual bar rendering
│   │   ├── RowsPanel.tsx  # Sidebar controls
│   │   └── ...
│   ├── store/
│   │   ├── useGanttStore.ts    # Main state
│   │   └── useThemeStore.ts    # Theme state
│   ├── utils/
│   │   └── layout.ts      # Bar layout algorithm
│   ├── types/
│   │   └── gantt.ts       # TypeScript interfaces
│   ├── theme.ts           # Color tokens
│   ├── App.tsx            # Root component
│   └── main.tsx           # Entry point
├── public/                # Static assets
├── dist/                  # Production build output
└── package.json
```

## Configuration

### Grid Settings
Customize in `src/store/useGanttStore.ts`:
```typescript
config: {
  years: [...],          // Year definitions
  rows: [...],           // Row labels
  cellWidth: 64,         // Base month width (px)
  rowHeight: 48,         // Base row height (px)
  headerHeight: 34,      // Header row height
  labelWidth: 240,       // Left sidebar width
}
```

### Color Palette
Modify colors in `src/components/GanttGrid.tsx`:
```typescript
const COLORS = [
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  // ... add more colors
];
```

### Themes
Customize in `src/theme.ts`:
```typescript
export const lightTheme = {
  primary: "#1976d2",
  surface: "#ffffff",
  // ...
};
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires modern browser with ES2020+ and SVG2 support.

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Roadmap

See [NEXT.md](.ai/NEXT.md) for planned features.

## Changelog

See [CHANGELOG.md](.ai/CHANGELOG.md) for release history.

## Contact

Project Link: [https://github.com/yourusername/gantt-editor](https://github.com/yourusername/gantt-editor)

---

**Built with ❤️ using React + TypeScript + SVG**
