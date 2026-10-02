# ExpenseMaster

ExpenseMaster is a comprehensive personal finance management tool designed to help individuals track and control their finances effectively.

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build Status](https://github.com/yourusername/expensemaster/actions/workflows/build.yml/badge.svg)](https://github.com/yourusername/expensemaster/actions/workflows/build.yml)
[![Version](https://img.shields.io/github/v/release/yourusername/expensemaster?sort=semver)](https://github.com/yourusername/expensemaster/releases)

## Key Features

- **Income and Spending Recording:** Easily record your income and spending details.
- **Transaction Categorization:** Categorize transactions for better financial tracking.
- **Budget Setting:** Set monthly budgets to stay within limits.
- **Data Visualization:** View charts showing where your money is going.
- **Expense Reduction Suggestions:** Get suggestions on reducing unnecessary expenses.
- **AI-driven Predictions:** Receive predictions for future spending trends.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React Native | 0.64 |
| Backend | Node.js | 14.x |
| Database | PostgreSQL | 13.x |
| Database | MongoDB | 4.4.x |
| Data Visualization | Chart.js | 2.9.x |
| Machine Learning | TensorFlow Lite | 2.4.x |
| APIs | Google Finance API | Latest |

## Prerequisites

- Node.js (v14.x)
- npm (v7.x)
- PostgreSQL (v13.x)
- MongoDB (v4.4.x)

## Installation & Setup Instructions

### Clone the Repository
```sh
git clone https://github.com/yourusername/expensemaster.git
cd expensemaster
```

### Install Dependencies
```sh
npm install
```

### Set Environment Variables
Create a `.env` file in the root directory and add the following variables:
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=expensemaster
API_KEY=your-api-key
```

### Start the Development Server
```sh
npm start
```

## Usage Guide

1. **Record Income/Spending:**
   - Open the app and navigate to the "Income" or "Expenses" tab.
   - Click on "Add New" and enter the details (amount, category, date).
   - Save the transaction.

2. **Categorize Transactions:**
   - Navigate to the "Transactions" tab.
   - Select a transaction and choose a category from the dropdown.
   - Save the changes.

3. **Set Monthly Budgets:**
   - Go to the "Budgets" tab.
   - Click on "Add New" and set the budget amount, start date, and end date.
   - Save the budget.

4. **View Charts:**
   - Navigate to the "Charts" tab.
   - Select a time period (monthly, yearly) and view the expense chart.

5. **Suggest Reducing Unnecessary Expenses:**
   - Go to the "Suggestions" tab.
   - Review the suggested actions and implement them as needed.

6. **AI-driven Predictions:**
   - Navigate to the "Predictions" tab.
   - View the predicted spending trends and set up alerts if necessary.

## Project Structure

```
expensemaster/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── frontend/
│   ├── assets/
│   ├── components/
│   ├── screens/
│   ├── styles/
│   └── App.js
├── .env.example
├── package.json
└── README.md
```

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING](CONTRIBUTING.md) file for more details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.