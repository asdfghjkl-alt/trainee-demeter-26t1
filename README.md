# Rendezvous

Find the fairest place to meet. Rendezvous calculates the best possible meeting point based on location and preferences for the best points to connect.

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS v4, Lucide React
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT, bcrypt

---

## Setup Instructions

### 1. Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- [MongoDB Community Edition](https://www.mongodb.com/try/download/community) installed and running locally.

### 2. Install MongoDB (Local Setup)

Please follow the official [MongoDB Community Edition Installation Guide](https://www.mongodb.com/docs/manual/administration/install-community/) for complete instructions on how to install and start the MongoDB service on your machine.

### 3. Environment Variables

Create a `.env` file in the root directory of your project and temporarily set the following environment variables:

```env
MONGODB_URI='mongodb://localhost:27017/rendezvous'
JWT_SECRET='random string'
JWT_NAME='rendezvous_auth'
NEXT_PUBLIC_BASE_URL='http://localhost:3000'
```

_(Note: Be sure to change `JWT_SECRET` to a secure, random string in production!)_

### 4. Install Dependencies & Run

Install the node modules:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application!
