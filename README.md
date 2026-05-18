<div align="center">

# 💸 SplitSmart

**An AI-powered expense splitter app built with React, TypeScript, and Tailwind CSS.**  
Split bills with friends — equally, by item, or by percentage — in seconds.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## ✨ Features

- **3 Split Modes** — Equal split, item-based assignment, or custom percentage
- **AI Bill Parsing** — Paste a bill as text or snap a photo and let Gemini AI extract items automatically
- **Group Management** — Save your regular squads and load them instantly for future splits
- **Expense History** — Track all past settlements, mark payments as done, and filter by group
- **Smart Settlement Algorithm** — Minimizes the number of transactions between people
- **LocalStorage Persistence** — Your groups and history survive browser refreshes
- **Confetti on Settlement** — Because splitting bills should feel good 🎉
- **Responsive UI** — Works beautifully on mobile and desktop

---

## 🖥️ Demo

> **Live App:** [your-vercel-link.vercel.app](https://your-vercel-link.vercel.app)

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI and state management |
| Tailwind CSS v4 | Styling |
| Vite 6 | Build tool |
| Framer Motion | Animations |
| Gemini AI (Google) | AI bill parsing |
| canvas-confetti | Settlement celebration |
| Lucide React | Icons |
| Vercel Functions | Serverless API (production) |

---

## 🧑‍💻 React Concepts Covered

- `useState` for all app state
- `useEffect` for localStorage sync
- `useMemo` for derived calculations
- Component-based architecture with props
- Conditional rendering and dynamic lists
- Form handling and user input
- LocalStorage persistence

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A free [Gemini API key](https://aistudio.google.com/apikey)

### Local Setup

**1. Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/splitsmart.git
cd splitsmart
```

**2. Install dependencies**

```bash
npm install
```

**3. Set up environment variables**

```bash
cp .env.example .env
```

Open `.env` and add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**4. Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The AI bill parsing feature requires a valid `GEMINI_API_KEY`. Manual entry of bill items works without a key.

---

## ☁️ Deploy to Vercel

**1. Push your code to GitHub** (see GitHub setup below)

**2. Go to [vercel.com](https://vercel.com) → Import Project**

**3. Connect your GitHub repo**

**4. Add environment variable**

In Vercel project settings → Environment Variables:

```
Name:  GEMINI_API_KEY
Value: your_gemini_api_key_here
```

**5. Deploy** — Vercel auto-detects Vite and deploys. Your app is live! 🎉

---

## 📁 Project Structure

```
splitsmart/
├── api/
│   └── parse-bill.ts        # Vercel serverless function (Gemini AI proxy)
├── src/
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles
│   ├── types.ts             # TypeScript interfaces
│   ├── services/
│   │   └── aiService.ts     # API client
│   └── utils/
│       └── algorithm.ts     # Settlement algorithm
├── public/
├── server.ts                # Express dev server (local only)
├── vercel.json              # Vercel deployment config
├── vite.config.ts
└── package.json
```

---

## 🤝 How to Use

1. **Add bill items** — paste text, scan a photo, or add manually
2. **Add people** — enter names or load a saved group
3. **Choose split mode** — Equal / Item-based / Percentage
4. **Settle up** — see who owes what with minimum transactions

---

## 🧮 Settlement Algorithm

Uses a greedy approach to minimize transactions:
1. Calculate each person's net balance (paid − consumed)
2. Sort debtors and creditors
3. Greedily match largest debtor with largest creditor
4. Repeat until settled

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- Part of [100+ React JS Projects](https://github.com/Vaibhav-kesarwani/100-reactjs-projects)
- AI powered by [Google Gemini](https://ai.google.dev)
- Icons by [Lucide](https://lucide.dev)

---

<div align="center">Made with ❤️ · Star ⭐ this repo if it helped you!</div>
