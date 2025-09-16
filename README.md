# Connectify 🚀

A modern React authentication app built with Supabase, featuring multiple login methods and a clean user interface.

## Features

- **Multiple Authentication Methods**
  - Email/Password signup and login
  - Google OAuth integration
  - Secure user session management

- **Modern UI/UX**
  - Responsive design with Tailwind CSS
  - Clean card-based login interface
  - User-friendly error handling with emojis
  - Loading states and feedback

- **Routing & Navigation**
  - React Router for seamless navigation
  - Protected routes and automatic redirects
  - Login and Feed pages

## Tech Stack

- **Frontend**: React 18 with Vite
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **State Management**: React Hooks (useState, useEffect)

## Project Structure

```
src/
├── pages/
│   ├── Login.jsx          # Authentication page
│   └── Feed.jsx           # Protected user dashboard
├── supabaseClient.js      # Supabase configuration
└── main.jsx               # App routing setup
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd connectify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Configure Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Enable Authentication in your Supabase dashboard
   - Configure OAuth providers (Google) if needed
   - Get your project URL and anon key from Settings > API

5. **Start the development server**
   ```bash
   npm run dev
   ```

### Supabase Setup

1. **Enable Authentication**
   - Go to Authentication > Settings
   - Configure your site URL (e.g., `http://localhost:5173`)

2. **Configure OAuth (Optional)**
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials

3. **Email Settings**
   - Configure email templates in Authentication > Templates
   - Set up SMTP or use Supabase's default email service

## Usage

### Authentication Flow

1. **Sign Up**: Users can create accounts with email/password
2. **Sign In**: Login with existing credentials or Google OAuth
3. **Email Verification**: New users receive confirmation emails
4. **Protected Routes**: Authenticated users access the Feed page
5. **Logout**: Users can securely sign out and return to login

### Key Components

#### Login Component (`pages/Login.jsx`)
- Handles all authentication methods
- Form validation and error handling
- Responsive design with Tailwind CSS

#### Feed Component (`pages/Feed.jsx`)
- Protected route for authenticated users
- Displays user information
- Logout functionality

#### Supabase Client (`supabaseClient.js`)
- Centralized Supabase configuration
- Environment variable integration

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | ✅ Yes |

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Error Handling

The app includes comprehensive error handling:

- **Network Errors**: Connection issues with Supabase
- **Authentication Errors**: Invalid credentials, disabled features
- **Validation Errors**: Email format, password requirements
- **User Feedback**: Clear error messages with emoji indicators

## Security Features

- **Environment Variables**: Sensitive keys stored securely
- **Session Management**: Automatic session handling via Supabase
- **Protected Routes**: Authentication required for sensitive pages
- **Secure OAuth**: Google OAuth integration with proper scopes

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Update Supabase site URL to your production domain

### Netlify

1. Build the project: `npm run build`
2. Upload the `dist` folder to Netlify
3. Configure environment variables
4. Update Supabase authentication settings

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Common Issues & Solutions

### "Email signup not enabled"
- Enable email authentication in Supabase dashboard
- Check Authentication > Settings > Enable email confirmations

### Google OAuth not working
- Verify OAuth credentials in Supabase dashboard
- Ensure redirect URLs are correctly configured
- Check that Google OAuth is enabled in Authentication > Providers

### Import path errors
- Ensure `supabaseClient.js` path is correct
- Check that environment variables are properly loaded

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Supabase](https://supabase.com) for backend services
- [React](https://reactjs.org) for the frontend framework
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Vite](https://vitejs.dev) for build tooling

---

**Built with ❤️ using React and Supabase**