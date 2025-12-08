# SkyPocket

![Build Status](https://img.shields.io/badge/Build-passing-brightgreen)  
![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red)

<div align="center">
<img width="250" height="250" alt="Adobe Express - file" src="https://github.com/user-attachments/assets/c8c5d66f-d071-4083-8392-4e0af8c1ce5a" />
  <br />
  <br />
  <p>
    <b>Your Intelligent Travel Companion for Shopping & Budgeting Abroad</b>
  </p>
</div>

---

SkyPocket is a comprehensive travel companion application designed to streamline trip management, expense tracking, and shopping while abroad. It combines a modern React Native frontend with a robust Firebase backend to provide real-time currency conversion, smart product detection, and budget management.

## Project Structure

The project is divided into two main directories:

-   **frontend/**: Contains the mobile application built with Expo and React Native.
-   **backend/**: Contains the server-less backend logic using Firebase Cloud Functions.

## Features

-   **Trip Management**: Create, organize, and switch between multiple trips with specific destinations.
-   **Smart Expense Tracking**: Log expenses and monitor them against your set budget.
-   **Currency Conversion**: Real-time conversion between your home currency and the local currency of your destination.
-   **Visual Product Search**: Upload photos of items to automatically detect products, compare prices, and find similar items using Google Lens integration.
-   **Shopping Cart**: Manage a list of intended purchases and track their costs.
-   **Finance Dashboard**: Visualize spending habits and budget allocation.
-   **Secure Authentication**: User sign-up and sign-in functionality powered by Firebase Auth.

## Tech Stack

### Frontend

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)

-   **Framework**: React Native with Expo SDK 52
-   **Language**: TypeScript
-   **Styling**: NativeWind (Tailwind CSS for React Native)
-   **Navigation**: Expo Router
-   **Icons**: Lucide React Native
-   **State/Data**: Firebase Client SDK (Auth, Firestore, Storage)

### Backend

<!-- ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white) -->

![Firebase Cloud Functions](https://img.shields.io/badge/Firebase_Functions-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)

-   **Runtime**: Node.js 22 (Firebase Cloud Functions)
-   **Language**: TypeScript
-   **Integrations**:
    -   Google Cloud Vision / SerpApi (for image analysis and product search)
    -   Currency.js (for financial calculations)
    -   Cheerio (for data parsing)
    -   Exchange API for (for real-time currency conversion rates)
    -   sales-tax (for real-time tax rates)

## Workflows

### 1. Trip Initialization

Seamlessly start your journey by creating or selecting a trip.

```mermaid
graph LR
    A[User Sign In] --> B{Has Trip?}
    B -- No --> C[Create Trip]
    B -- Yes --> D[Select Trip]
    C --> D
    D --> E[Home Dashboard]
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style E fill:#bbf,stroke:#333,stroke-width:2px
```

### 2. Smart Product Discovery

Snap a photo of an item to instantly find details and pricing.

```mermaid
graph LR
    A[Take Photo] --> B[Upload to Firebase]
    B --> C[Cloud Function Trigger]
    C --> D[Google Lens API]
    D --> E[Extract Products & Prices]
    E --> F[Display Results]
    F --> G[Add to Cart]
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style G fill:#bbf,stroke:#333,stroke-width:2px
```

## Getting Started

### Prerequisites

-   Node.js (v22 recommended)
-   pnpm or npm
-   Expo CLI
-   Firebase CLI

### Installation

1.  **Clone the repository**

2.  **Frontend Setup**
    Navigate to the frontend directory and install dependencies:

    ```bash
    cd frontend
    pnpm install
    ```

3.  **Backend Setup**
    Navigate to the backend functions directory and install dependencies:
    ```bash
    cd backend/functions
    npm install
    ```

### Running the Application

1.  **Start the Backend (Emulators)**
    From the `backend/functions` directory:

    ```bash
    npm run emulate
    ```

2.  **Start the Frontend**
    From the `frontend` directory:
    ```bash
    npx expo start
    ```
    Use the Expo Go app on your physical device or an Android/iOS emulator to run the application.

## Configuration

-   **Firebase**: Ensure you have the `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) placed in the appropriate directories within `frontend/` if you are building native binaries, or configure the web credentials in your environment files.
-   **Environment Variables**: Check for `.env` files or Expo config for API keys (e.g., SerpApi, Firebase config).

## License

All rights reserved. This project is proprietary and may not be used, copied, modified, or distributed without explicit permission from the author.
