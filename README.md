# Discipline Tracker Pro

A professional, feature-rich task and sleep tracking web application built with vanilla HTML, CSS, and JavaScript. Track your productivity, monitor sleep patterns, maintain daily discipline streaks, and compete against your SHADOW - all in your browser with local data persistence. 
## 🎯 Features

### ⏱️ Time Tracking
- **Real-time Stopwatch**: Precise task duration tracking
- **Start/Stop Controls**: Easy task logging with one click
- **Sleep Tracking**: Dedicated sleep session logging
- **Active Task Indicator**: Visual display of currently running tasks
- **Auto-Save**: All data persists in browser localStorage

### 📋 Task Management
- Log tasks with automatic timestamps
- Categorize activities as productive or sleep
- **Quick-Start Favorites**: Save and reuse frequent tasks
- **Task History**: View all today's activities with duration
- **Delete Functionality**: Remove tasks if needed
- **Color-Coded Display**: Green for productive, Purple for sleep

### 📊 Statistics Dashboard
- **Productive Time**: Hours spent on productive tasks today
- **Sleep Time**: Total sleep duration tracked
- **Total Tracked**: Combined productive + sleep time
- **Day Streak**: Consecutive days with logged activity
- Real-time updates as you log activities

### 🔥 Streak System
- Automatic consecutive day counter
- Beautiful popup notifications
- Customized messages for milestones:
  - Day 1: "Day one. This is where it begins."
  - Day 7: "One week! Discipline is becoming a habit."
  - Day 30: "One month of discipline. Elite status."
  - Day 365: "One year. You've mastered yourself."
- Never lose your streak data (persisted locally)

### 📈 Analytics & Reporting
- **Productivity Trend Graph**: Line chart with smooth curves
  - View 7 days, 30 days, 3 months, 6 months, or 1 year
  - Shaded area fill for visual clarity
- **Sleep Analysis Chart**: Bar chart showing sleep patterns
  - Same time range options as productivity
- **Performance Report**: Monthly detailed breakdown
  - Summary statistics (tasks, hours, streak)
  - Daily breakdown table
  - Print-ready formatting
- **Export Data**: Download all data as CSV or JSON file

### 💡 Motivation System
- 20 rotating inspirational quotes
- Discipline and comeback-focused messaging
- Auto-rotates every 15 seconds
- Smooth fade in/out transitions
- Keeps you mentally engaged and focused

## 🌑 SHADOW Engine (Competitive Tracking System) ⭐ NEW

The SHADOW Engine is an innovative competitive system that tracks your performance against your personal best. It creates an internal competition where you battle against your own "SHADOW" - your strongest historical 7-day rolling average.

### ⚔ How SHADOW Works

**The Shadow Concept**: Your SHADOW is calculated from your historical data - it's the best 7-day rolling average you've achieved. Every day, you're competing to match or exceed this benchmark.

- **Shadow Average**: Your strongest historical 7-day average (dynamically updated as you improve)
- **Current Performance**: Your actual productivity today and this week
- **Competitive Metrics**: Real-time comparison showing how close you are to breaking your personal standard

### 📊 SHADOW Metrics Dashboard

#### Current You Card
- **Weekly 7-Day Average**: Your actual average for the past 7 days
- **Momentum**: 📈 Growing, ➡️ Stable, 📉 Declining
- **Gap vs Shadow**: How far ahead (+) or behind (-) you are from your Shadow
- **Weekly Delta**: Weekly gap analysis vs your SHADOW
- **Today's Target**: Minimum minutes needed today to maintain/exceed Shadow
- **Progress Percentage**: Real-time progress toward today's target

#### The SHADOW Card
- **SHADOW Average**: Your strongest historical 7-day average
- **Rank Tier**: Current tier based on minutes tracked
- **Monthly Wins**: Days this month you've met or exceeded your SHADOW
- **Days Since Last Win**: How many days since you last beat your SHADOW
- **Shadow Lead Streak**: How many consecutive days your SHADOW is winning

### 🏆 Status Indicators

Your daily status is determined by how close you are to breaking your SHADOW:

- **🟢 STANDARD BROKEN** (100%+): You've exceeded your SHADOW! Victory!
- **🔵 AT THE GATE** (90-99%): So close! Nearly there!
- **🟡 TRAILING** (70-89%): Making progress but still behind
- **🔴 OUT OF RANGE** (<70%): Significant gap to close

### 🎖️ Ranking Tier System

As you increase your SHADOW average, you unlock new ranks:

| Tier | Minutes | Badge |
|------|---------|-------|
| Initiate | 0+ | Baseline |
| Builder | 120+ | Builder |
| Operator | 180+ | Operator |
| Executor | 240+ | Executor |
| Elite | 300+ | Elite |
| Apex | 360+ | Apex |
| Overdrive | 420+ | Legend |

### 🎯 Monthly Win Tracking

Track your competitive performance throughout the month:

- **My Wins**: Days you've met or exceeded your SHADOW
- **Shadow Wins**: Days your SHADOW has beaten you
- **Active Days**: Total days with logged productivity
- **Win Percentage**: Your success rate for the month

### ⚡ Pressure System

Dynamic pressure levels based on your current performance and momentum:

- **Critical**: Significant gap + declining momentum
- **High**: Large gap or poor momentum
- **Medium**: Moderate gap or flat momentum
- **Low**: Small gap or growing momentum

### 💾 Historical Data Integration

The SHADOW Engine analyzes your complete historical data:
- Pulls from all logged productive activities
- Calculates 7-day rolling averages daily
- Updates your SHADOW when you achieve a new personal best
- Preserves historical records for accurate comparisons

## 🎨 Design & UI

- **Dark Professional Theme**: Modern gradient background with glassmorphism effects
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: Fade transitions, hover effects, pulse animations
- **Accessibility**: Font Awesome icons, high contrast text, semantic HTML
- **Zero Dependencies**: Pure vanilla HTML/CSS/JavaScript (except Chart.js)

### Responsive Breakpoints
- **Desktop** (1400px): Full featured layout with side graphs and SHADOW cards
- **Tablet** (768px): Single column with stacked components
- **Mobile** (480px): Optimized touch-friendly interface

## 🚀 Quick Start

### Installation
1. Clone or download this repository
2. Open `index.html` in your web browser
3. No build process, no dependencies, no installation required!

### Usage

#### Starting a Task
1. Enter a task name in the input field
2. Click **Start** button (or press Enter)
3. Watch the stopwatch timer count up
4. Click **Stop** when finished
5. Task automatically saves with timestamp and duration

#### Logging Sleep
1. Click the **Sleep** button
2. Timer starts for sleep session
3. Click **Stop** when done
4. Sleep session logged separately (purple indicator)

#### Adding Favorites
1. Enter a frequently used task name
2. Click the **⭐ Star** button
3. Task saved to Quick Start Favorites
4. Click favorite card to instantly start that task

#### Competing with Your SHADOW
1. View the SHADOW section at the top of the app
2. Check your current performance vs your SHADOW
3. Track daily progress toward your target
4. Watch your momentum and pressure indicators
5. Aim to beat your SHADOW each day!
6. Celebrate new rank tiers as you improve

#### Viewing Reports
1. Click **Report** button in top right
2. View current month's performance summary
3. See daily breakdown table
4. Click **Print** to print report
5. Close modal to return to tracker

#### Exporting Data
1. Click **Export** button
2. CSV or JSON file automatically downloads
3. Open in Excel, Google Sheets, or any spreadsheet app
4. Analyze your data however you need

## 💾 Data Storage

All data is stored in browser's **localStorage**:
- `discipline_tracker_tasks`: All logged tasks with timestamps
- `discipline_tracker_favorites`: Quick-start favorite tasks
- `discipline_tracker_streak`: Current streak count
- `discipline_tracker_last_activity`: Last activity date
- `discipline_tracker_active_task`: Currently running task (survives page refresh)
- `discipline_tracker_shadow_avg`: Your current SHADOW 7-day average

**Note**: Data is stored locally in your browser. Clearing browser data/cache will delete saved tasks.

## 🔧 Technical Details

### Architecture
Built with class-based JavaScript architecture for clean, maintainable code:

- **DisciplineTracker**: Main application controller
- **StopwatchManager**: Timer logic and task recording
- **TaskManager**: Task CRUD operations and rendering
- **UIManager**: UI updates, reports, and motivation
- **GraphManager**: Chart.js integration for analytics
- **EventManager**: Event binding and user interactions
- **ShadowEngine**: Competitive tracking system with historical analysis

### Technologies
- **HTML5**: Semantic markup
- **CSS3**: Custom properties, gradients, animations, Grid/Flexbox
- **Vanilla JavaScript (ES6+)**: No frameworks, pure JS
- **Chart.js**: Data visualization library
- **Font Awesome 6.4.0**: Icon library

### Browser Compatibility
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Any modern browser with ES6 support and localStorage

## 📱 Responsive Design

The application automatically adapts to different screen sizes with optimized layouts for:
- **Desktop**: Full dashboard with analytics and SHADOW cards side-by-side
- **Tablet**: Stacked layout with readable components
- **Mobile**: Touch-optimized interface with essential controls

## 🎓 How to Master the SHADOW System

1. **Week 1**: Build consistency by logging daily activities
2. **Week 2-3**: Your SHADOW will stabilize around your average
3. **Week 4+**: Challenge yourself to beat your SHADOW daily
4. **Monthly**: Review your win rate and compete for new rank tiers
5. **Ongoing**: Watch your SHADOW rise as you improve and achieve new personal bests

## 🌟 Pro Tips

- Log sleep to get accurate total productivity metrics
- Use favorites for recurring tasks to speed up logging
- Check momentum daily to adjust effort levels
- Aim to beat your SHADOW 70%+ of the month for Elite status
- Celebrate rank tier achievements - they represent real progress!

## 📄 License

Free to use, modify, and distribute. No attribution required.


---

**Version**: 2.0 Pro (with SHADOW Engine)
**Last Updated**: 2026-02-20 12:52:03
**Built with ❤️ for discipline and personal mastery
