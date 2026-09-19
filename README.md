# Expense Tracker

A full-stack expense management web application that helps users track expenses, manage monthly budgets, and visualize spending patterns through an interactive dashboard.

The application includes secure JWT-based authentication, user-specific expense management, budget tracking, analytics, reports, dark mode, and a responsive React interface.

---

## Live Demo

**Frontend:**  
https://expense-tracker-five-jet-tw326khg4o.vercel.app/

**Backend API:**  
https://expense-tracker-backend-qgdw.onrender.com

---

## Features

### Authentication

- User registration
- User login
- JWT-based authentication
- Protected API routes
- Secure password hashing using bcrypt
- Logout functionality
- User-specific data access

### Expense Management

- Add new expenses
- View all expenses
- Edit existing expenses
- Delete expenses
- Expense categories
- Expense dates
- Amount validation
- User-specific expense ownership

### Budget Management

- Create monthly budgets
- View current budget
- Update budget
- Track total spending
- Calculate remaining budget
- Budget monitoring

### Dashboard Analytics

The dashboard provides useful spending insights including:

- Total spent
- Monthly budget
- Remaining budget
- Top spending category
- Category-wise spending
- Monthly spending
- Average daily spending
- Largest expense
- Recent expenses

### Reports

- Spending summaries
- Category breakdown
- Monthly spending information
- Visual representation of expenses

### User Interface

- Modern dashboard
- Responsive design
- Dark mode
- Navigation between different sections
- Login/Register screens
- Form validation
- Loading states
- Error handling

---

## 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Axios
- Lucide React
- CSS / Inline Styling

### Backend

- Node.js
- Express.js
- JavaScript
- REST API

### Database

- MongoDB
- MongoDB Atlas
- Mongoose

### Authentication & Security

- JSON Web Tokens (JWT)
- bcryptjs
- Protected routes
- User-specific authorization

### Deployment

- Vercel — Frontend
- Render — Backend
- MongoDB Atlas — Database

---

## Architecture

```text
                    USER
                      |
                      v
              +---------------+
              |    Vercel     |
              | React Frontend|
              +-------+-------+
                      |
                   Axios
                      |
                      v
              +---------------+
              |    Render     |
              | Express API   |
              +-------+-------+
                      |
                      v
              +---------------+
              | MongoDB Atlas |
              |    Database   |
              +---------------+