# DEauth — Authentication & User Management Server

**DEauth** is a modern authentication and user management system designed for seamless integration with Discord OAuth2. It provides a robust backend for managing user profiles, admin-only features, and API access for external services.

## 🚀 Features

-   **Discord OAuth2**: Secure login via Discord with automatic profile updates.
-   **User Profiles**: Customizable user data (full name, bio, website, role, etc.).
-   **Admin Dashboard**: Manage users, grant/revoke admin status, and handle bans.
-   **API Integration**: Built-in support for generating and managing API keys for external service integration.
-   **Flash Messages**: Real-time feedback for user actions (success, error, info).
-   **Responsive UI**: Modern views built with EJS and customizable CSS.

## 🛠️ Tech Stack

-   **Runtime**: [Node.js](https://nodejs.org/)
-   **Framework**: [Express](https://expressjs.com/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/) (using [Prisma ORM](https://www.prisma.io/))
-   **Authentication**: [Passport.js](https://www.passportjs.org/) with Discord Strategy
-   **Session Storage**: [connect-pg-simple](https://www.npmjs.com/package/connect-pg-simple) (sessions stored in PostgreSQL)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (via CDN)

## 📋 Prerequisites

-   **Node.js**: v18.x or higher recommended.
-   **PostgreSQL**: v14.x or higher (local or cloud instance).
-   **Discord Developer Account**: To create an application and obtain OAuth2 credentials.

## ⚙️ Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-repo/deauth.git
    cd deauth
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

## 🔧 Configuration

1.  **Set Up Environment Variables**:
    Create a `.env` file in the root directory:
    ```bash
    cp .env.example .env
    ```

2.  **Fill in the Configuration**:
    Edit your `.env` file with the following keys:
    - `SESSION_SECRET`: A long, random string to secure sessions.
    - `DATABASE_URL`: `postgresql://postgres:postgres@localhost:5433/deauth?schema=public` (Note the port **5433** if using Docker).
    - `DISCORD_CLIENT_ID`: Obtained from the [Discord Developer Portal](https://discord.com/developers/applications).
    - `DISCORD_CLIENT_SECRET`: Obtained from the Discord Developer Portal.
    - `DISCORD_CALLBACK_URL`: Typically `http://localhost:3000/auth/discord/callback`.
    - `ADMIN_DISCORD_IDS`: Comma-separated list of Discord User IDs for admin access.

## 🐳 Database Setup (Docker)

The project includes a PostgreSQL 15 instance pre-configured via Docker Compose.

1.  **Start PostgreSQL**:
    ```bash
    sudo docker compose up -d postgres
    ```
    *Note: The database is mapped to host port **5433** to avoid conflicts with local PostgreSQL instances.*

2.  **Initialize Database Schema**:
    Once the database is running, apply the Prisma migrations:
    ```bash
    npx prisma migrate dev --name init
    ```

3.  **Generate Prisma Client**:
    ```bash
    npx prisma generate
    ```

## 🏃 Running the Application

1. **Local Development**:
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:3000`.*

2. **Docker Deployment (Full App)**:
   ```bash
   npm run docker:up
   ```

---

## 🛡️ Admin Access

To designate a user as an administrator, add their numeric Discord User ID to the `ADMIN_DISCORD_IDS` variable in your `.env` file. The system automatically grants privileges upon login.

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
