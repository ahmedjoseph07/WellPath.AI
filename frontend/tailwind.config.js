export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'geo-dark':       '#E6ECF2',  // page background (slate-tinted)
        'geo-panel':      '#FFFFFF',  // card / panel surface
        'geo-soft':       '#F1F5F9',  // inset / zebra surface
        'geo-border':     '#CBD5E1',  // hairline border
        'geo-accent':     '#0E7490',  // primary teal (matches pptx)
        'geo-accent-d':   '#0C4A6E',  // emphasised teal text
        'geo-accent-soft':'#ECFEFF',  // teal callout fill
        'geo-accent-bd':  '#67E8F9',  // teal callout border
        'geo-ink':        '#0F172A',  // primary text
        'geo-muted':      '#475569',  // secondary text
        'geo-faint':      '#94A3B8',  // very muted text
        'geo-green':      '#15803D',
        'geo-yellow':     '#B45309',
        'geo-red':        '#B91C1C',
      }
    }
  },
  plugins: []
}
