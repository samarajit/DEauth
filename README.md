# DEauth — Authentication & User Management Server

**DEauth** is a modern authentication and user management system designed for seamless integration with Discord OAuth2. It provides a robust backend for managing user profiles, admin-only features, and API access for external services.

## Features

-   **Discord OAuth2**: Secure login via Discord with automatic profile updates.
-   **User Profiles**: Customizable user data (full name, bio, website, role, etc.).
-   **Admin Dashboard**: Manage users, grant/revoke admin status, and handle bans.
-   **API Integration**: Built-in support for generating and managing API keys for external service integration.
-   **Flash Messages**: Real-time feedback for user actions (success, error, info).
-   **Responsive UI**: Modern views built with EJS and customizable CSS.

## Tech Stack

-   **Runtime**: [Node.js](https://nodejs.org/)
-   **Framework**: [Express](https://expressjs.com/)
-   **Database**: [MongoDB](https://www.mongodb.com/) (using [Mongoose](https://mongoosejs.com/))
-   **Authentication**: [Passport.js](https://www.passportjs.org/) (Discord Strategy)
-   **View Engine**: [EJS](https://ejs.co/)
-   **Session Management**: Express-session with MongoDB store.

## Prerequisites

-   **Node.js**: v18.x or higher recommended.
-   **MongoDB**: v6.x or higher (local or cloud instance like MongoDB Atlas).
-   **Discord Developer Account**: To create an application and obtain OAuth2 credentials.

## Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-repo/DEauth-auth.git
    cd DEauth-auth
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

##  Configuration

1.  **Set Up Environment Variables**:
    Create a `.env` file in the root directory by copying the example:
    ```bash
    cp .env.example .env
    ```

2.  **Fill in the Configuration**:
    Edit your `.env` file with the following keys:
    - `SESSION_SECRET`: A long, random string to secure sessions.
    - `MONGODB_URI`: Your MongoDB connection string (e.g., `mongodb://localhost:27017/DEauth`).
    - `DISCORD_CLIENT_ID`: Obtained from the Discord Developer Portal.
    - `DISCORD_CLIENT_SECRET`: Obtained from the Discord Developer Portal.
    - `DISCORD_CALLBACK_URL`: Typically `http://localhost:3000/auth/discord/callback` for local development.
    - `ADMIN_DISCORD_IDS`: Comma-separated list of Discord User IDs for admin access.

## Discord OAuth2 Setup

1.  Navigate to the [Discord Developer Portal](https://discord.com/developers/applications).
2.  Create a **New Application**.
3.  Go to the **OAuth2** tab → **Redirects**.
4.  Add your redirect URI (e.g., `http://localhost:3000/auth/discord/callback`).
5.  Copy the **Client ID** and **Client Secret** into your `.env` file.

## 🐳 Quick Start with Docker (Recommended)

The easiest way to get the project running with all its dependencies (including MongoDB) is via Docker Compose.

1.  **Start Services**:
    ```bash
    npm run docker:up
    ```
    This will build the application image and start both the Node.js server and a MongoDB instance in the background.

2.  **Stop Services**:
    ```bash
    npm run docker:down
    ```

## 🏃 Running the Application

### Option 1: Using Docker (easiest)
```bash
npm run docker:up
```

### Option 2: Local Development
- **Start MongoDB**: Ensure your local MongoDB service is running.
- **Development Mode** (with automatic restart):
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```

The server will be accessible at `http://localhost:3000` (or your defined `PORT`).

---

## 🛡️ Admin Access

To designate a user as an administrator, add their numeric Discord User ID to the `ADMIN_DISCORD_IDS` variable in your `.env` file. When the user logs in for the first time (or subsequent logins), the system will automatically grant them admin privileges.

## 📁 Project Structure

- `server.js`: Main entry point.
- `config/`: Configuration files (database, etc.).
- `models/`: Mongoose schemas (User, etc.).
- `routes/`: Express route handlers.
- `views/`: EJS templates for the UI.
- `public/`: Static assets (CSS, JS, Images).
- `Dockerfile` & `docker-compose.yml`: Docker configuration for easy setup.
