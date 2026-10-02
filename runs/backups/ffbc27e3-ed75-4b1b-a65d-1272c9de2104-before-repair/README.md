# ExpenseMaster

ExpenseMaster is a mobile application designed to help individuals manage their personal finances effectively. By recording income and spending, categorizing transactions, setting budgets, and providing AI-driven insights, ExpenseMaster empowers users to gain better control over their money.

## Badges

[![License](https://img.shields.io/github/license/yourusername/expensemaster)](LICENSE)
[![Build Status](https://github.com/yourusername/expensemaster/actions/workflows/build.yml/badge.svg)](https://github.com/yourusername/expensemaster/actions/workflows/build.yml)
[![Version](https://img.shields.io/github/v/release/yourusername/expensemaster?sort=semver)](https://github.com/yourusername/expensemaster/releases)

## Key Features

- **Record Income and Spending:** Easily log all your income and expenses.
- **Categorize Transactions:** Organize your spending into categories for better financial tracking.
- **Set Monthly Budgets:** Stay within budget limits with customizable monthly budgets.
- **View Charts Showing Where Money is Going:** Visualize your financial trends with interactive charts.
- **Suggest Reducing Unnecessary Expenses:** Get personalized suggestions to cut costs.
- **AI-driven Expense Prediction:** Anticipate future expenses and plan accordingly.

## Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Frontend | Flutter | 3.x | Cross-platform mobile app development with a rich UI experience |
| Backend | Node.js | 14.x | Server-side logic and API endpoints |
| Database | Firebase Realtime Database / SQLite | N/A | Cloud-based and local data storage for user transactions and budgets |
| Hosting | Firebase Hosting | N/A | Static file hosting for the mobile app |
| AI Prediction | TensorFlow Lite | N/A | Mobile-friendly machine learning predictions |

## Prerequisites

- Node.js 14.x
- Flutter SDK 3.x
- Firebase CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

## Installation & Setup Instructions

### Clone the Repository

```sh
git clone https://github.com/yourusername/expensemaster.git
cd expensemaster
```

### Install Dependencies

#### Frontend (Flutter)

```sh
flutter pub get
```

#### Backend (Node.js)

```sh
npm install
```

### Configure Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
2. Add an Android and iOS app to your Firebase project.
3. Download the `google-services.json` for Android and `GoogleService-Info.plist` for iOS, place them in their respective directories (`android/app/` and `ios/`).

### Run the Application

#### Frontend (Flutter)

```sh
flutter run
```

#### Backend (Node.js)

```sh
npm start
```

## Usage Guide

1. **Record Income/Spending:** Open the app, navigate to the "Dashboard" screen, and tap on "Add Transaction" to record income or expenses.
2. **Categorize Transactions:** When recording a transaction, select an appropriate category from the dropdown menu.
3. **Set Monthly Budgets:** Go to the "Budgets" section and set budgets for different categories.
4. **View Charts:** Navigate to the "Charts" screen to visualize your financial trends over time.
5. **AI-driven Expense Prediction:** The app will automatically suggest reducing unnecessary expenses based on your spending patterns.

## Project Structure Overview

```
expensemaster/
├── android/
│   ├── app/
│   │   └── google-services.json
├── ios/
│   ├── Runner/
│   │   └── GoogleService-Info.plist
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── lib/
│   │   ├── screens/
│   │   ├── widgets/
│   │   └── main.dart
│   ├── pubspec.yaml
│   └── README.md
├── .gitignore
├── LICENSE
└── README.md
```

## Contributing

Contributions are welcome! Please read our [CONTRIBUTING](CONTRIBUTING.md) guidelines before submitting a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.