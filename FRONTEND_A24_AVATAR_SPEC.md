# BotAvatar 2D Canvas Procedural Engine

## Overview
The `BotAvatar` component (`src/lib/bot-avatar/BotAvatarCanvas.tsx`) renders responsive, high-DPI procedural vector characters on an HTML5 `<canvas>` with vinyl toy plastic shading.

## Avatar Archetypes
1. **Clover (`type="clover"`)**: 4 symmetrical overlapping lobes with glossy convex curves.
2. **Flower (`type="flower"`)**: 6 rounded petals around an inner pistil core.
3. **Square (`type="square"`)**: Smooth squircle super-ellipse with beveled 3D reflection.
4. **Ghost (`type="ghost"`)**: Floating phantom dome with 3 sinusoidal scallop tails.

## Shading & Physics
- **Plastic Volumetric Sheen**: Multi-stop radial gradients and linear specular gloss highlight arcs.
- **Natural Eye Blinking**: Periodic blink cycle every ~4.5 seconds.
- **Dynamic States**:
  - `default`: Idle organic breathing and sinusoidal vertical float.
  - `working`: Orbiting satellite particles and elevated float frequency.
  - `poked`: Damped spring oscillation / squash-and-stretch physics triggered on user click or calendar booking event.
