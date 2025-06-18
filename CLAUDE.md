# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Swiss vacation planner web application that allows users to mark and track planned vs visited locations on an interactive map. The application is a single-page vanilla JavaScript app with no build system or dependencies beyond CDN-loaded libraries.

## Architecture

- **index.html**: Main HTML structure with Leaflet.js CDN integration
- **script.js**: Contains the main `SwissVacationPlanner` class that handles:
  - Interactive Leaflet map centered on Switzerland (46.8182, 8.2275)
  - Place management with localStorage persistence
  - Automatic location naming via OpenStreetMap Nominatim reverse geocoding
  - Two place types: 'planned' (📍) and 'visited' (✅)
- **style.css**: Complete styling with CSS Grid layout, glassmorphism effects, and responsive design

## Key Components

### SwissVacationPlanner Class
- `places[]`: Array of place objects stored in localStorage as 'swissPlaces'
- `markers`: Map object linking place IDs to Leaflet markers
- Async place addition with automatic geocoding via `getLocationName()`
- Place state transitions (planned → visited)

### Data Structure
Places are stored as objects with: `id`, `name`, `lat`, `lng`, `type`, `date`

## Development Notes

- No build system - direct file editing and browser refresh
- All external dependencies loaded via CDN (Leaflet.js)
- localStorage provides data persistence across sessions
- OpenStreetMap Nominatim API used for reverse geocoding (no API key required)
- Mobile-responsive grid layout switches to single column on <768px

## Testing
- wir brauchen auch tests