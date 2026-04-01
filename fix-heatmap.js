const fs = require('fs');
const filepath = 'd:\\Programme\\Html\\Discipline-main\\index.html';

let content = fs.readFileSync(filepath, 'utf8');

const startMarker = "        renderGithubHeatmap() {";
const endMarker = "setTimeout(() => container.scrollLeft = container.scrollWidth, 50);\n        }";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const oldSegment = content.substring(startIndex, endIndex + endMarker.length);
    
    // Check if it already has 'totalDaysInGrid'
    if (oldSegment.includes("totalDaysInGrid")) {
        console.log("Already updated!");
        process.exit(0);
    }

const newFunc = `        renderGithubHeatmap() {
          const container = document.getElementById("github-heatmap-container");
          if (!container) return;
          container.innerHTML = "";
          
          const dailyMap = new Map();
          this.app.state.tasks.forEach((task) => {
            if (!this.app.isProductiveCategory(task.category)) return;
            dailyMap.set(task.date, (dailyMap.get(task.date) || 0) + task.duration);
          });

          const target = 150; // default heat map scaling target
          const days = 365;
          const today = new Date();
          
          // Start date is 365 days ago
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - (days - 1));
          
          // Expand backward to the previous Sunday to align grid perfectly
          const diffToSunday = startDate.getDay();
          const gridStartDate = new Date(startDate);
          gridStartDate.setDate(startDate.getDate() - diffToSunday);
          
          const totalDaysInGrid = diffToSunday + days;
          
          const scroller = document.createElement("div");
          scroller.className = "github-heatmap-wrapper";

          const inner = document.createElement("div");
          inner.className = "github-heatmap-inner";
          
          const monthsRow = document.createElement("div");
          monthsRow.className = "github-months-row";
          
          const grid = document.createElement("div");
          grid.className = "github-heatmap-grid";

          const weeks = [];
          let currentWeek = [];
          
          // Generate chronological days from gridStartDate
          for (let i = 0; i < totalDaysInGrid; i++) {
            const d = new Date(gridStartDate);
            d.setDate(gridStartDate.getDate() + i);
            
            // If it's the 1st of the month... add a label above this column
            if (d.getDate() === 1 && d >= startDate) {
              const weekIndex = weeks.length; 
              // 10px offset per column (8px width + 2px gap)
              const pixelOffset = weekIndex * 10;
              const monthLabel = document.createElement("div");
              monthLabel.className = "github-month-label";
              monthLabel.textContent = d.toLocaleString('default', { month: 'short' });
              monthLabel.style.left = \`\${pixelOffset}px\`;
              monthsRow.appendChild(monthLabel);
            }

            // Create cell data
            if (d < startDate || d > today) {
              // Invisible padding cell out of range (to keep calendar grid strict)
              currentWeek.push({ empty: true });
            } else {
              const dateStr = this.app.getDateString(d);
              const minutes = dailyMap.get(dateStr) || 0;
              let level = 0;
              if (minutes > 0) level = 1;
              if (minutes >= target * 0.5) level = 2;
              if (minutes >= target) level = 3;
              if (minutes >= target * 1.5) level = 4;
              
              currentWeek.push({ empty: false, level, dateStr, minutes });
            }
            
            // Push column when 7 days are hit (Sat is last)
            if (currentWeek.length === 7) {
              weeks.push(currentWeek);
              currentWeek = [];
            }
          }
          if (currentWeek.length > 0) weeks.push(currentWeek);
          
          // Render HTML Grid vertically block by block
          weeks.forEach(week => {
            const weekCol = document.createElement("div");
            weekCol.className = "github-weeks-col";
            week.forEach(cellData => {
              const cell = document.createElement("div");
              cell.className = "github-cell";
              if (cellData.empty) {
                cell.style.background = "transparent";
                cell.style.pointerEvents = "none";
              } else {
                cell.dataset.level = cellData.level;
                cell.title = \`\${cellData.dateStr}: \${this.app.formatDuration(cellData.minutes)}\`;
              }
              weekCol.appendChild(cell);
            });
            grid.appendChild(weekCol);
          });
          
          // Assemble elements
          inner.appendChild(monthsRow);
          inner.appendChild(grid);
          scroller.appendChild(inner);
          container.appendChild(scroller);
          
          // Scroll to current day at far right
          setTimeout(() => scroller.scrollLeft = scroller.scrollWidth, 50);
        }`;

    content = content.replace(oldSegment, newFunc);
    fs.writeFileSync(filepath, content, 'utf8');
    console.log('Regex matched and successfully replaced old heatmap function.');
} else {
    console.log('Start or end marker not found.', startIndex, endIndex);
}
