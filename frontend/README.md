# PKonek Citizen Frontend

This is the citizen-focused frontend interface for the PKonek Lumen civic engagement platform.

## Overview

A responsive web interface designed specifically for citizens to report civic issues, track complaint status, and engage with their community in Pasig City.

## Features

### Citizen-Centric Design
- **Dashboard**: Overview of complaint statistics and quick actions
- **Report Issues**: Submit complaints with photos and precise location mapping
- **Complaint Tracking**: Monitor status of submitted complaints
- **Community Map**: View issues reported by others in the community
- **Profile Management**: Citizen account management and preferences

### Citizen-Specific Functionality
- Role-specific interface (no admin/government features)
- Citizen authentication and registration
- Complaint submission with AI assistance
- Interactive location mapping
- Photo upload for evidence
- Status tracking with SLA timers
- "Me Too" support for existing issues
- Notification system for updates

## File Structure

`
frontend/
├── index.html          # Main HTML structure
├── styles.css          # CSS styles for citizen interface
├── app.js              # JavaScript functionality for citizens
├── favicon.svg         # Brand icon
└── assets/             # Asset directory
    ├── images/         # Image assets
    ├── icons/          # Icon assets
    └── fonts/          # Font assets
`

## Citizen Features Implemented

### 1. Dashboard
- Statistics display (active complaints, resolved issues, etc.)
- Quick action cards for common tasks
- User greeting and authentication status

### 2. Navigation
- Citizen-focused menu items
- Active section highlighting
- Smooth scrolling between sections

### 3. Interactive Elements
- Action cards with hover effects
- Responsive buttons with visual feedback
- Notification system
- Mobile-responsive design

### 4. Placeholder Sections
- Report Issue form area
- Complaint tracking interface
- Community map section
- Profile management area

## Technical Implementation

### HTML
- Semantic HTML5 structure
- Accessible navigation
- Citizen-focused content structure
- Mobile-responsive layout

### CSS
- CSS custom properties for theming
- Responsive design with media queries
- Citizen-specific color scheme (blue/green/purple)
- Modern layout with Flexbox and Grid

### JavaScript
- Citizen-specific application state management
- Event handling for citizen interactions
- Simulated API calls for demonstration
- Notification system
- Mobile menu functionality

## Getting Started

1. Open index.html in a web browser
2. Explore the citizen dashboard
3. Click on navigation items to view different sections
4. Use action cards to simulate citizen actions
5. Click "Login" to simulate authentication

## Integration Points

This frontend is designed to integrate with:
- Backend API (located in /lumen/)
- Authentication system
- Complaint submission API
- Map service for location pinning
- Image upload service
- Notification system

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Next Steps for Development

1. **Connect to Backend API**
   - Implement real authentication
   - Connect complaint submission forms
   - Integrate with actual database

2. **Add Interactive Features**
   - Implement actual map with location pinning
   - Add photo upload functionality
   - Implement AI chatbot integration

3. **Enhance UI/UX**
   - Add loading states
   - Implement form validation
   - Add more animations and transitions
   - Improve mobile experience

## Notes

- This is a skeleton/shell implementation
- All data is simulated for demonstration
- Actual API integration is required for full functionality
- Designed specifically for citizen role (no admin features included)
