import './globals.css'

export const metadata = {
  title: 'Kappa Sigma Alumni — ULL',
  description: 'Member communication platform for Kappa Sigma Fraternity Alumni of ULL',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=EB+Garamond:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          html { font-family: 'EB Garamond', Georgia, serif; }
          .ui-sans, button, input, select, textarea, label, .nav-link, .btn-primary, .btn-secondary, .btn-gold, .field-label, .field-input, .badge {
            font-family: 'Inter', 'Helvetica Neue', sans-serif;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
