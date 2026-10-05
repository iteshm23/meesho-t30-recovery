/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: { wide: '1400px' },   // the problem line only earns its space here
      colors: {
        // Meesho brand ground
        plum:    { 900:'#3B0A2C', 800:'#4F0B3A', 700:'#6B0F50', 600:'#8A1468' },
        magenta: { 600:'#9F2089', 500:'#C62B9E' },
        pink:    { 600:'#E31C7B', 500:'#F43397', 400:'#FB6AB4', 100:'#FFE4F1', 50:'#FFF1F7' },
        violet:  { 900:'#2A1360', 800:'#3A1D82', 700:'#4C27A8', 600:'#6235D6', 100:'#EDE7FD', 50:'#F6F3FE' },
        cream:   { 100:'#FFFBF5', 200:'#FFF4E8' },
        amber:   { 600:'#D97706', 500:'#F59E0B', 100:'#FEF3C7' },
        ok:      { 700:'#046C4E', 600:'#0E9F6E', 100:'#DEF7EC' },
        warn:    { 700:'#92400E', 600:'#F59E0B', 100:'#FEF3C7' },
        bad:     { 700:'#9B1C1C', 600:'#E02424', 100:'#FDE8E8' },
        ink:     { 900:'#14101A', 700:'#3D3548', 500:'#6B6277', 400:'#8F879C', 300:'#C9C4D1', 200:'#E6E2EC', 100:'#F3F1F7' },
        wa:      { green:'#25D366', teal:'#128C7E', head:'#075E54', bg:'#E5DDD5', out:'#D9FDD3' },
      },
      fontFamily: { sans: ['Inter','system-ui','-apple-system','Segoe UI','Roboto','sans-serif'] },
      boxShadow: {
        phone: '0 24px 60px -12px rgba(59,10,44,.35), 0 0 0 1px rgba(0,0,0,.06)',
        card:  '0 1px 2px rgba(20,16,26,.06), 0 4px 16px -4px rgba(20,16,26,.10)',
        pop:   '0 12px 32px -8px rgba(20,16,26,.22)',
      },
      keyframes: {
        rise:    { '0%':{opacity:0, transform:'translateY(8px)'}, '100%':{opacity:1, transform:'translateY(0)'} },
        popin:   { '0%':{opacity:0, transform:'scale(.96)'}, '100%':{opacity:1, transform:'scale(1)'} },
        slidein: { '0%':{opacity:0, transform:'translateY(100%)'}, '100%':{opacity:1, transform:'translateY(0)'} },
        pulsed:  { '0%,100%':{opacity:1}, '50%':{opacity:.35} },
        sweep:   { '0%':{transform:'translateX(-100%)'}, '100%':{transform:'translateX(220%)'} },
        bars:    { '0%,100%':{transform:'scaleY(.35)'}, '50%':{transform:'scaleY(1)'} },
        ring:    { '0%,100%':{transform:'rotate(-7deg)'}, '50%':{transform:'rotate(7deg)'} },
      },
      animation: {
        rise:'rise .34s cubic-bezier(.2,.8,.3,1) both',
        popin:'popin .22s cubic-bezier(.2,.8,.3,1) both',
        slidein:'slidein .28s cubic-bezier(.2,.8,.3,1) both',
        pulsed:'pulsed 1.4s ease-in-out infinite',
        sweep:'sweep 1.3s ease-in-out infinite',
        bars:'bars .9s ease-in-out infinite',
        ring:'ring .5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
