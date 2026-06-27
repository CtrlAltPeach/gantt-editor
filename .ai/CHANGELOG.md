# CHANGELOG

All notable changes to Gantt Editor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-27

### Added
- **Material Design UI**: Complete redesign with material-like cards, buttons, and elevation shadows
- **Dynamic row heights**: Rows automatically expand when bars overlap (prevents bars from becoming too thin)
- **Smart bar layout**: Bars maintain fixed height (~1/3 of row height), longest bar always centered
- **Tailwind color palette**: 10 distinct colors (blue, emerald, amber, red, violet, pink, teal, orange, indigo, purple)
- **Automatic bar labels**: Bars created without custom label get numbered 1-10 based on color index
- **Context menu** (right-click):
  - Delete bar
  - Duplicate bar
  - Edit label
  - Change color
  - Toggle dashed/solid style
- **Bar connections**: Draw dependency arrows between bars with Shift+drag from bar edges
- **Undo/Redo**: Full history support with Ctrl+Z / Ctrl+Y
- **Zoom controls**: Scale timeline width (0.6x - 2.4x) while keeping row heights fixed
- **Fullscreen mode**: Collapsible sidebar for maximum workspace
- **Light/Dark themes**: Toggle between light and dark material themes
- **Hover highlighting**: Visual feedback when hovering over cells
- **File operations**: Save/load projects as JSON
- **Snap-to-grid**: Bars snap to 1/3, 1/2, 2/3, and month boundaries
- **Bar resizing**: Drag bar edges to adjust duration
- **Bar dragging**: Move bars horizontally and vertically between rows
- **Multi-year timeline**: Configure year count and month labels
- **Row labels**: Customizable row names (default: Row 1, Row 2, etc.)

### Technical
- React 19 + TypeScript + Vite
- Zustand for state management
- SVG-based rendering with proper coordinate system (model vs render coords)
- Immer for immutable state updates
- Interval graph coloring algorithm for optimal bar layout
- Responsive zoom model (only timeline scales, not entire SVG)

## [0.1.0] - Initial Prototype

### Added
- Basic Gantt chart with draggable bars
- Simple file save/load
- Grid with months and years
- Basic color selection
