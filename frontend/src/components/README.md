# Component Architecture

This directory contains the modular component structure for the Paint dApp frontend.

## Core Components

### `OSWindow`
Reusable window component that provides consistent OS-style window chrome including:
- Title bar with icon and title
- Control buttons (minimize, maximize, close)
- Content area
- Responsive design

### `Navigation` 
Navigation bar component with:
- Desktop navigation links
- Mobile hamburger menu
- Social media links
- Smooth scrolling to sections

### `ContextMenu`
Reusable context menu component for right-click interactions:
- Configurable menu items
- Keyboard navigation (Esc to close)
- Click-outside to close

### `AttributesPopup`
Modal popup for displaying token attributes:
- Overlay background
- Scrollable content
- Responsive design

### `CountdownTimer`
Configurable countdown timer component:
- Multiple display formats (full/compact)
- Automatic completion handling
- Responsive design

## Section Components

Located in `./sections/` directory:

### `AboutSection`
Complete about section with project information, features, and technical details.

### `HelpSection`
Help documentation with getting started guide, shortcuts, and troubleshooting.

### `TokenExplorerSection`
Token gallery with:
- Grid layout
- Token previews
- Context menu integration
- Loading states

### `NFTControlsSection`
NFT minting controls with:
- Countdown timer integration
- Progress bar
- Mint button with states

## Legacy Components

These components remain from the original structure and may benefit from future refactoring:
- `SVGDisplay` - Main canvas component
- `BlockchainControls` - Blockchain interaction controls
- `UnifiedActionButton` - Wallet connection and minting
- `TransactionQueue` - Transaction queue management
- `DebugPage` - Development debugging tools
- `ColourMe` - Main application logic

## CSS Architecture

Each component has its own CSS file co-located with the component:
- `OSWindow.css` - Window styling
- `Navigation.css` - Navigation styling
- `ContextMenu.css` - Context menu styling
- etc.

Global styles are in `/src/styles/global.css`.

## Usage

```tsx
// Import individual components
import { OSWindow, Navigation } from '../components';

// Import section components
import { AboutSection, HelpSection } from '../components/sections';

// Use with consistent props
<OSWindow title="My Window" icon="🎨" showControls={true}>
  <p>Window content</p>
</OSWindow>
```

## Benefits of This Architecture

1. **Modularity** - Each component has a single responsibility
2. **Reusability** - Components can be used across different parts of the app
3. **Maintainability** - Easier to locate and modify specific functionality
4. **Testing** - Components can be tested in isolation
5. **Performance** - Smaller bundles through tree-shaking
6. **Developer Experience** - Consistent patterns and easier to onboard new developers
