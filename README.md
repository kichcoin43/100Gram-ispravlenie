# Telegram-Style Messenger

A real-time chat application built with Next.js, Upstash Redis, and Server-Sent Events (SSE).

## Features

- User registration and authentication with JWT
- Real-time messaging using SSE
- Message history (last 50 messages)
- Mobile-first responsive design
- Secure password hashing with bcrypt
- Edge runtime for optimal performance

## Tech Stack

- **Next.js 15** with App Router
- **Upstash Redis** for data storage and pub/sub
- **Tailwind CSS** for styling
- **Edge Runtime** for all API routes
- **JWT** for authentication
- **SSE** for real-time updates

## Environment Variables

Add `JWT_SECRET` to your environment variables in Vercel project settings:

\`\`\`
JWT_SECRET=your-secret-key-here
\`\`\`

Upstash Redis variables are automatically configured via the integration.

## API Routes

- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/me` - Get current user
- `POST /api/send` - Send message
- `GET /api/history` - Get message history
- `GET /api/subscribe` - SSE endpoint for real-time messages

## Getting Started

1. Install dependencies (handled automatically)
2. Add Upstash Redis integration
3. Set JWT_SECRET environment variable
4. Deploy to Vercel or run locally

## Usage

1. Register a new account
2. Login with your credentials
3. Start chatting in real-time!

Messages are stored in Redis and synchronized across all connected clients via SSE.
