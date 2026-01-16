# Cloning & Setup Instructions

This guide provides a step-by-step walkthrough for cloning the repository and setting up the project locally.

## 1. Clone the Repository

Open your terminal or command prompt and run the following command:

```bash
git clone <your-repository-url>
cd smart-bus-supabase
```

*Replace `<your-repository-url>` with the actual URL of your Git repository.*

## 2. Setup Admin Web

The Admin Dashboard requires its own dependencies and environment configuration.

1.  **Navigate to the folder**:
    ```bash
    cd admin-web
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    - Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    - Open `.env` in a text editor.
    - Add your Supabase URL and Anon Key.

4.  **Start the Server**:
    ```bash
    npm run dev
    ```

## 3. Setup User App (Mobile)

The Mobile App runs on Expo.

1.  **Navigate to the folder** (from the project root):
    ```bash
    cd expo-user-app/user-app
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    - Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    - Open `.env` in a text editor.
    - Add your Supabase URL and Anon Key.

4.  **Start the App**:
    ```bash
    npx expo start
    ```

## 4. Troubleshooting

- **Missing Modules**: If you see errors about missing packages, try running `npm install` again in the respective folder.
- **Environment Variables**: Ensure your `.env` files are named correctly and contain valid credentials.
- **Git Issues**: If you cannot clone, check your internet connection and Git credentials.
