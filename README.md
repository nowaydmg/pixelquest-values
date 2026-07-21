# Pixel Quest Values

Modern item vault for Pixel Quest game items.

## ⚠️ Important Notice

This is a **client-side demo version** that uses localStorage for data storage. 
For production use, you need to implement a proper backend with database.

**Current limitations:**
- Data is stored locally in browser localStorage
- Data is not shared between users/devices
- Clearing browser data will delete all data
- No real authentication (localStorage-based)

## Features

- **Item Management**: Add, edit, and delete items with images
- **Trade System**: List offers and requests for items
- **Messaging**: Direct messages between users
- **Notifications**: Real-time notifications system
- **Role Management**: Owner, Admin, Moderator roles
- **Leaderboard**: User rankings with statistics
- **Achievements**: Unlockable badges
- **Watchlist**: Track favorite items
- **Transaction History**: Keep track of trades
- **Reputation System**: Rate other users

## Getting Started

1. Clone the repository
2. Open `index.html` in a web browser
3. Register an account (first user gets Owner role)
4. Start using the platform

## Roles

- **Owner**: Full access, can assign roles
- **Admin**: Can manage users, ban IPs, manage items
- **Moderator**: Can warn users
- **User**: Basic access

## Security Notes

This is a demo/prototype. For production:
- Implement proper authentication (JWT, OAuth)
- Use a real database (PostgreSQL, MongoDB)
- Add server-side validation
- Implement rate limiting
- Add CSRF protection
- Use HTTPS
- Implement proper password hashing (bcrypt, argon2)

## Tech Stack

- HTML5
- CSS3 (Custom dark theme)
- Vanilla JavaScript
- LocalStorage for data persistence

## License

MIT License - Feel free to use and modify for your needs.
