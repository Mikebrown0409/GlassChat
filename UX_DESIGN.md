# GlassChat UX and Design Guidelines

This document outlines the user experience (UX) and design guidelines for GlassChat. The goal is to create a visually stunning, intuitive, and "vibes-based" interface.

## Core Design Philosophy: Glassmorphism

The entire UI should embrace a **glassmorphism** aesthetic. This means:

-   **Backgrounds**: Semi-transparent backgrounds with a frosted glass effect.
-   **Blur**: Use `backdrop-filter: blur(10px);` as a baseline. The blur can be increased on hover or for active elements to create a sense of depth.
-   **Transparency**: Use a background color with 80% opacity (e.g., `rgba(255, 255, 255, 0.8)` for light mode).
-   **Borders**: A subtle 1px border with a slightly less transparent color to help elements stand out from the background.
-   **Shadows**: Subtle shadows to lift elements off the page.

## Color Palette

-   **Light Mode**:
    -   Primary Text: `#000000`
    -   Secondary Text: `#555555`
    -   Accent: `#3B82F6` (a vibrant blue)
    -   Background: A vibrant, abstract gradient.
-   **Dark Mode**:
    -   Primary Text: `#FFFFFF`
    -   Secondary Text: `#AAAAAA`
    -   Accent: `#60A5FA` (a lighter, vibrant blue)
    -   Background: A dark, moody, abstract gradient.

## Onboarding Flow (using Intro.js)

The onboarding experience should be a "wow" factor. It will be a guided tour that is skippable.

1.  **Welcome Modal**: A glassmorphism modal welcomes the user and briefly introduces GlassChat.
2.  **AI Model Selection**: Highlights the dropdown where users can select their preferred AI model (GPT-4, Claude, etc.).
3.  **Chat Input**: Points to the chat input, explaining the "live coding" collaborative feature.
4.  **Contextual Memory**: Shows the toggle for enabling/disabling contextual memory and explains what it does.
5.  **Themes**: Highlights the theme switcher for light/dark mode.
6.  **Done**: A concluding message in a modal, with a link to the project's GitHub.

## Key UI Components

-   **Chat Window**:
    -   Messages should have a "bounce-in" animation using Framer Motion.
    -   Code blocks in messages should be rendered with `react-markdown` and have a syntax highlighting theme that matches the light/dark mode.
-   **Sidebar**:
    -   A collapsible sidebar will list chat history.
    -   The active chat will be highlighted.
-   **Modals**:
    -   All modals should follow the glassmorphism design.

## Wireframe (ASCII)

Here's a rough ASCII wireframe to illustrate the layout:

```
+------------------------------------------------------------------+
| GlassChat                    [GPT-4 v] [Theme] [User]            |
+------------------------------------------------------------------+
|                                                                  |
|  Chat History                  |  [Welcome to GlassChat!]         |
|  - Chat 1                      |                                  |
|  - Chat 2 (Active)             |  > User: Hello!                  |
|  - Chat 3                      |                                  |
|                                |  < AI: Hi there! How can I help? |
|                                |                                  |
|                                |                                  |
|                                |                                  |
|                                |                                  |
|                                |                                  |
|                                |                                  |
|                                |                                  |
|                                +----------------------------------+
|                                | [Type a message...] [Send]       |
+--------------------------------+----------------------------------+
``` 