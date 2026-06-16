/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)',
                        '2xl': '1rem',
                        '3xl': '1.5rem'
                },
                colors: {
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        },
                        navy: {
                                900: '#0A1628',
                                800: '#0F2240',
                                700: '#1A3358',
                                600: '#264573',
                                500: '#3A5A8A'
                        },
                        orange: {
                                600: '#E55D00',
                                500: '#FF6B00',
                                400: '#FF8533',
                                300: '#FFA366'
                        }
                },
                keyframes: {
                        'accordion-down': {
                                from: { height: '0' },
                                to: { height: 'var(--radix-accordion-content-height)' }
                        },
                        'accordion-up': {
                                from: { height: 'var(--radix-accordion-content-height)' },
                                to: { height: '0' }
                        },
                        'slide-up': {
                                from: { transform: 'translateY(100%)', opacity: '0' },
                                to: { transform: 'translateY(0)', opacity: '1' }
                        },
                        'slide-down': {
                                from: { transform: 'translateY(-20px)', opacity: '0' },
                                to: { transform: 'translateY(0)', opacity: '1' }
                        },
                        'fade-in': {
                                from: { opacity: '0' },
                                to: { opacity: '1' }
                        },
                        'scale-in': {
                                from: { transform: 'scale(0.9)', opacity: '0' },
                                to: { transform: 'scale(1)', opacity: '1' }
                        },
                        'glow-pulse': {
                                '0%, 100%': { boxShadow: '0 0 20px rgba(255, 107, 0, 0.3)' },
                                '50%': { boxShadow: '0 0 40px rgba(255, 107, 0, 0.6)' }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                        'slide-down': 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        'fade-in': 'fade-in 0.3s ease-out',
                        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        'glow-pulse': 'glow-pulse 2s ease-in-out infinite'
                },
                backgroundImage: {
                        'navy-gradient': 'linear-gradient(135deg, #0A1628 0%, #0F2240 50%, #1A3358 100%)',
                        'orange-gradient': 'linear-gradient(135deg, #FF6B00 0%, #FF8533 100%)'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};
