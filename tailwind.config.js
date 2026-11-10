/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0B0D',
        card: '#15171A',
        line: '#23262B',
        sheet: '#121417',
        field: '#0A0B0D',
        'field-line': '#262A30',
        bar: '#17191D',
        'bar-line': '#262A30',
        text: '#F2F3F5',
        text2: '#B9BDC4',
        muted: '#868B93',
        up: '#45C98A',
        down: '#F2676B',
        accent: '#8EA6FF',
        'on-accent': '#0A0B0D',
      },
      fontFamily: {
        sans: ['Onest', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        screen: ['30px', { lineHeight: '34px', letterSpacing: '-0.03em', fontWeight: '700' }],
        amount: ['34px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        title: ['15px', { lineHeight: '20px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '21px' }],
        cap: ['13px', { lineHeight: '17px' }],
        tiny: ['12px', { lineHeight: '16px' }],
      },
      borderRadius: { card: '22px', field: '14px', btn: '17px', bar: '26px', sheet: '28px' },
    },
  },
  plugins: [],
}
