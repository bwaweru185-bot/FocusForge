# FocusForge AI Study App

An intelligent learning app that transforms messy notes into focused study materials, flashcards, quizzes, and visual aids.

## ✨ Features

- **🤖 Smart Summarization**: AI-powered note analysis and key point extraction
- **🎴 Flashcards & Quizzes**: Auto-generated study materials
- **🖼️ Image Generation**: Visual learning aids for topics
- **📝 Important Notes**: Track key concepts and suggestions
- **⏱️ Study Timer**: 30-minute focused study sessions
- **👤 Account System**: Save and manage study kits
- **👤 Guest Mode**: Start learning immediately
- **📱 PWA Support**: Install as mobile/desktop app
- **🔄 Offline Mode**: Works without internet connection

## 🚀 Quick Deploy (3 Methods)

### Method 1: Netlify (Recommended - 30 seconds!)
1. Go to [netlify.com](https://netlify.com)
2. Sign up/login with GitHub
3. **Drag and drop** this entire folder onto the dashboard
4. Get instant free URL! 🎉

### Method 2: GitHub Pages (Free)
1. Create GitHub repository
2. Push code: `git push -u origin master`
3. Settings → Pages → Deploy from master
4. URL: `https://yourusername.github.io/repo-name`

### Method 3: Vercel (Free)
1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repo
3. One-click deploy

## 📱 Install as App

After deployment, users can install your app:

**Mobile**: Tap "Add to Home Screen" in browser  
**Desktop**: Click install icon in Chrome address bar

## 🛠️ Local Development

```bash
# Install dependencies (optional)
npm install

# Start local server
npm start
# or
npx serve .

# Open http://localhost:3000
```

## 📁 File Structure

```
├── index.html      # Main HTML structure
├── app.js          # Application logic
├── styles.css      # Styling & responsive design
├── manifest.json   # PWA configuration
├── sw.js          # Service worker for offline
├── package.json    # NPM configuration
└── README.md       # This file
```

## 🌐 Browser Support

- Chrome 90+ (PWA support)
- Firefox 88+
- Safari 14+
- Edge 90+

## 🔒 Privacy

- All data stored locally in browser
- No external servers required
- Guest mode works completely offline
- PWA caches for offline use

## 📊 PWA Features

- **Installable**: Add to home screen on mobile/desktop
- **Offline**: Works without internet (cached content)
- **Native Feel**: App-like experience
- **Auto Updates**: New versions load automatically
- **Fast Loading**: Cached resources

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push: `git push origin feature-name`
5. Submit pull request

## 📄 License

MIT License - Free for personal and commercial use